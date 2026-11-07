"""Glue between the database and the pure finance engine."""

from decimal import Decimal

from sqlmodel import Session, select

from ..models import Contribution, Project, ProjectCostItem
from . import finance_service as fin

DISCLAIMER = (
    "Prototype for educational and planning purposes. Synthetic demo data. "
    "Not legal, tax, financial, or lending advice."
)


def load_project_bundle(session: Session, project: Project) -> tuple[list[ProjectCostItem], list[Contribution]]:
    items = session.exec(select(ProjectCostItem).where(ProjectCostItem.project_id == project.id).order_by(ProjectCostItem.id)).all()
    contribs = session.exec(select(Contribution).where(Contribution.project_id == project.id).order_by(Contribution.id)).all()
    return list(items), list(contribs)


def sums_by_category(contribs: list[Contribution]) -> tuple[dict[str, Decimal], dict[str, Decimal]]:
    """Confirmed = committed/disbursed. Proposed = proposed/applied. Each record counts once."""
    confirmed = {c: Decimal(0) for c in fin.CATEGORIES}
    proposed = {c: Decimal(0) for c in fin.CATEGORIES}
    for c in contribs:
        cat = c.funding_category if c.funding_category in confirmed else "other"
        if c.status in fin.CONFIRMED_STATUSES:
            confirmed[cat] += Decimal(c.amount)
        elif c.status in fin.PIPELINE_STATUSES:
            proposed[cat] += Decimal(c.amount)
    return confirmed, proposed


def compute_view(
    project: Project,
    items: list[ProjectCostItem],
    contribs: list[Contribution],
    overrides: dict | None = None,
) -> dict:
    """Return finance result + stack. `overrides` is the what-if overlay (see ScenarioRequest)."""
    overrides = overrides or {}
    confirmed, proposed = sums_by_category(contribs)
    for cat in ("donor", "employer", "grant"):
        value = overrides.get(f"proposed_{cat}")
        if value is not None:
            proposed[cat] = Decimal(value)
    extra = Decimal(overrides.get("extra_proposed") or 0)
    if extra > 0:
        proposed["other"] += extra

    cost_amounts = overrides.get("cost_items")
    if cost_amounts is not None:
        total = fin.total_cost(cost_amounts.values())
    else:
        total = fin.total_cost(i.amount for i in items)
    buyer = overrides.get("affordable_buyer_price")
    buyer = Decimal(project.affordable_purchase_price) if buyer is None else Decimal(buyer)

    gap = fin.calculate_gap(
        total,
        buyer,
        project.existing_public_subsidies,
        project.earned_revenue,
        sum(confirmed.values(), Decimal(0)),
        sum(proposed.values(), Decimal(0)),
    )
    stack = fin.funding_stack(
        gap, buyer, project.existing_public_subsidies, project.earned_revenue, confirmed, proposed
    )
    surplus = gap["funding_surplus"]
    if surplus > 0:
        stack.append({"key": "surplus", "label": "Surplus above cost", "amount": surplus, "status": "surplus"})
    return {"finance": gap, "stack": stack, "confirmed": confirmed, "proposed": proposed}


def scenario_message(gap: dict) -> str:
    if gap["scenario_gap"] == 0 and gap["initial_gap"] > 0:
        if gap["secured_gap"] == 0:
            return "Gap covered by confirmed funding. Confirm disbursement terms and eligibility."
        return "Scenario fully funded — commitments and eligibility still require verification."
    if gap["initial_gap"] == 0:
        return "No funding gap under these inputs."
    return "Scenario gap remains. Proposed funding is hypothetical until committed."
