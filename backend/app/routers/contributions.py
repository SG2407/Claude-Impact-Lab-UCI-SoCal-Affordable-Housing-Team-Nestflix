from fastapi import APIRouter, Depends, HTTPException, Response
from sqlmodel import Session, select

from ..database import get_session
from ..models import Contribution
from ..schemas import ContributionCreate, ContributionOut, ContributionStatusUpdate
from ..services import finance_service as fin
from .deps import get_project_or_404

router = APIRouter(prefix="/api/projects/{project_id}/contributions", tags=["contributions"])


def _get(session: Session, project_id: int, contribution_id: int) -> Contribution:
    get_project_or_404(session, project_id)
    c = session.get(Contribution, contribution_id)
    if c is None or c.project_id != project_id:
        raise HTTPException(status_code=404, detail=f"Contribution {contribution_id} not found on project {project_id}")
    return c


@router.get("", response_model=list[ContributionOut])
def list_contributions(project_id: int, session: Session = Depends(get_session)):
    get_project_or_404(session, project_id)
    return session.exec(select(Contribution).where(Contribution.project_id == project_id).order_by(Contribution.id)).all()


@router.post("", response_model=ContributionOut, status_code=201)
def create_contribution(project_id: int, body: ContributionCreate, session: Session = Depends(get_session)):
    """Always created as 'proposed': a pledge never reduces the secured gap on its own."""
    get_project_or_404(session, project_id)
    c = Contribution(
        project_id=project_id,
        contributor_name=body.contributor_name.strip(),
        contributor_type=body.contributor_type,
        amount=body.amount,
        funding_category=body.funding_category or body.contributor_type,
        status="proposed",
    )
    session.add(c)
    session.commit()
    session.refresh(c)
    return c


@router.patch("/{contribution_id}", response_model=ContributionOut)
def update_status(project_id: int, contribution_id: int, body: ContributionStatusUpdate, session: Session = Depends(get_session)):
    c = _get(session, project_id, contribution_id)
    if not fin.can_transition(c.status, body.status):
        allowed = sorted(fin.ALLOWED_TRANSITIONS.get(c.status, set())) or ["none (final)"]
        raise HTTPException(
            status_code=409,
            detail=f"Cannot change status from '{c.status}' to '{body.status}'. Allowed: {', '.join(allowed)}",
        )
    c.status = body.status
    session.add(c)
    session.commit()
    session.refresh(c)
    return c


@router.delete("/{contribution_id}", status_code=204)
def delete_contribution(project_id: int, contribution_id: int, session: Session = Depends(get_session)):
    c = _get(session, project_id, contribution_id)
    if c.status in fin.CONFIRMED_STATUSES:
        raise HTTPException(status_code=409, detail="Committed or disbursed demo contributions cannot be deleted; use reset.")
    session.delete(c)
    session.commit()
    return Response(status_code=204)


@router.post("/reset", status_code=204)
def reset_contributions(project_id: int, session: Session = Depends(get_session)):
    """Demo helper: remove every demo contribution on this project."""
    get_project_or_404(session, project_id)
    for c in session.exec(select(Contribution).where(Contribution.project_id == project_id)).all():
        session.delete(c)
    session.commit()
    return Response(status_code=204)
