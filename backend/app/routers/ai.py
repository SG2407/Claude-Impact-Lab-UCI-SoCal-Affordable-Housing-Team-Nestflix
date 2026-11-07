from fastapi import APIRouter, Depends
from sqlmodel import Session

from ..database import get_session
from ..schemas import StrategyRequest, StrategyResponse
from ..services import ai_service, project_service as ps
from .deps import get_project_or_404
from .funding import build_facts

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/funding-strategy", response_model=StrategyResponse)
def funding_strategy(body: StrategyRequest, session: Session = Depends(get_session)):
    project = get_project_or_404(session, body.project_id)
    overrides = {
        k: v for k, v in body.model_dump().items() if k.startswith("proposed_") and v is not None
    }
    facts = build_facts(session, project, overrides)
    result = ai_service.generate_strategy(facts)
    return {**result, "finance": facts["finance"], "funding_stack": facts["stack"], "disclaimer": ai_service.DISCLAIMER}
