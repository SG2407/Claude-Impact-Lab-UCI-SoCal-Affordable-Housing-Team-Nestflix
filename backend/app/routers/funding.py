from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from ..database import get_session
from ..models import FundingProgram, Project
from ..schemas import MatchedProgram
from ..services import funding_service, project_service as ps

router = APIRouter(prefix="/api", tags=["funding"])


def all_programs(session: Session) -> list[dict]:
    return [p.model_dump() for p in session.exec(select(FundingProgram).order_by(FundingProgram.name)).all()]


def build_facts(session: Session, project: Project, overrides: dict | None = None) -> dict:
    items, contribs = ps.load_project_bundle(session, project)
    view = ps.compute_view(project, items, contribs, overrides)
    return {
        "project_name": project.name,
        "finance": view["finance"],
        "stack": view["stack"],
        "programs": funding_service.match_programs(all_programs(session), funding_service.MatchContext()),
    }


@router.get("/funding-programs", response_model=list[MatchedProgram])
def funding_programs(audience: str | None = None, city: str | None = None, session: Session = Depends(get_session)):
    """Candidate programs ranked by rule-based relevance. Matches are leads, never approvals."""
    ctx = funding_service.MatchContext(city=city or None)
    return funding_service.match_programs(all_programs(session), ctx, audience)
