from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from sqlmodel import Session, select

from ..database import get_session
from ..models import Project
from ..schemas import CostUpdate, ProjectOut, ScenarioRequest, ScenarioResult
from ..seed import COST_ITEMS
from ..services import ai_service, project_service as ps
from .deps import get_project_or_404
from .funding import build_facts

router = APIRouter(prefix="/api/projects", tags=["projects"])


def project_out(session: Session, project: Project) -> dict:
    items, contribs = ps.load_project_bundle(session, project)
    view = ps.compute_view(project, items, contribs)
    return {
        **project.model_dump(),
        "cost_items": [i.model_dump() for i in items],
        "finance": view["finance"],
        "funding_stack": view["stack"],
        "confirmed_by_category": view["confirmed"],
        "proposed_by_category": view["proposed"],
        "contributions_count": len(contribs),
        "disclaimer": ps.DISCLAIMER,
    }


@router.get("", response_model=list[ProjectOut])
def list_projects(session: Session = Depends(get_session)):
    return [project_out(session, p) for p in session.exec(select(Project).order_by(Project.id)).all()]


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(project_id: int, session: Session = Depends(get_session)):
    return project_out(session, get_project_or_404(session, project_id))


@router.patch("/{project_id}/costs", response_model=ProjectOut)
def update_costs(project_id: int, body: CostUpdate, session: Session = Depends(get_session)):
    project = get_project_or_404(session, project_id)
    items, _ = ps.load_project_bundle(session, project)
    by_key = {i.key: i for i in items}
    unknown = [k for k in body.costs if k not in by_key]
    if unknown:
        raise HTTPException(status_code=422, detail=f"Unknown cost lines: {', '.join(unknown)}")
    for key, amount in body.costs.items():
        by_key[key].amount = int(amount)
        session.add(by_key[key])
    session.commit()
    return project_out(session, project)


@router.post("/{project_id}/costs/reset", response_model=ProjectOut)
def reset_costs(project_id: int, session: Session = Depends(get_session)):
    project = get_project_or_404(session, project_id)
    items, _ = ps.load_project_bundle(session, project)
    defaults = {k: amount for k, _l, amount, _lane, _n in COST_ITEMS}
    for item in items:
        if item.key in defaults:
            item.amount = defaults[item.key]
            session.add(item)
    session.commit()
    return project_out(session, project)


@router.post("/{project_id}/scenario", response_model=ScenarioResult)
def scenario(project_id: int, body: ScenarioRequest, session: Session = Depends(get_session)):
    project = get_project_or_404(session, project_id)
    items, contribs = ps.load_project_bundle(session, project)
    if body.cost_items is not None:
        known = {i.key for i in items}
        unknown = [k for k in body.cost_items if k not in known]
        if unknown:
            raise HTTPException(status_code=422, detail=f"Unknown cost lines: {', '.join(unknown)}")
    view = ps.compute_view(project, items, contribs, body.model_dump())
    return {
        "finance": view["finance"],
        "funding_stack": view["stack"],
        "proposed_by_category": view["proposed"],
        "confirmed_by_category": view["confirmed"],
        "scenario_message": ps.scenario_message(view["finance"]),
    }


@router.get("/{project_id}/report", response_class=PlainTextResponse)
def report(project_id: int, session: Session = Depends(get_session)):
    """Deterministic Markdown funding strategy / impact report (always rule-based)."""
    project = get_project_or_404(session, project_id)
    facts = build_facts(session, project)
    s = ai_service.rule_based_strategy(facts)
    f = facts["finance"]
    m = lambda v: f"${float(v):,.0f}"  # noqa: E731
    lines = [
        f"# NestFlix Funding Strategy Report: {project.name}",
        "",
        f"> {ps.DISCLAIMER}",
        "",
        "## Financing summary (SYNTHETIC ASSUMPTIONS)",
        f"- Total development cost: {m(f['total_cost'])}",
        f"- Existing funding (buyer price + public subsidies + earned revenue): {m(f['existing_funding'])}",
        f"- Initial funding gap: {m(f['initial_gap'])}",
        f"- Confirmed additional funding: {m(f['confirmed_additional_funding'])}",
        f"- **Secured gap** (after confirmed funding): {m(f['secured_gap'])}",
        f"- Proposed (hypothetical) funding: {m(f['proposed_additional_funding'])}",
        f"- **Scenario gap** (if every proposal arrived): {m(f['scenario_gap'])}",
        f"- Surplus: {m(f['funding_surplus'])}",
        "",
        "## Funding stack",
    ]
    lines += [f"- {seg['label']} [{seg['status']}]: {m(seg['amount'])}" for seg in facts["stack"]]
    lines += ["", "## Candidate funding leads (none approved; availability not confirmed)"]
    for o in s["opportunities"]:
        link = f" ({o['source_url']})" if o["source_url"] else " (no source URL)"
        lines.append(f"- **{o['name']}**{link}: {o['match_status']}. {o['rationale']}")
    for title, key in (("Missing information", "missing_information"), ("Risks", "risks"), ("Recommended next steps", "next_steps"), ("Assumptions", "assumptions")):
        lines += ["", f"## {title}"] + [f"- {x}" for x in s[key]]
    lines += ["", f"_{s['generation_note']}_", ""]
    return PlainTextResponse(
        "\n".join(lines),
        media_type="text/markdown",
        headers={"Content-Disposition": 'attachment; filename="nestflix-funding-report.md"'},
    )
