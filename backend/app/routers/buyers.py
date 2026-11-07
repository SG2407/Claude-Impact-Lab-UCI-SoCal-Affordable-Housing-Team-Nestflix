from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlmodel import Session

from ..database import get_session
from ..schemas import MatchedProgram
from ..services import funding_service
from .funding import all_programs

router = APIRouter(prefix="/api/buyers", tags=["buyers"])

# FICTIONAL household. Every value is an ASSUMPTION.
DEMO_HOUSEHOLD = {
    "label": "SYNTHETIC household (fictional, not a real person)",
    "annual_income": 90700,
    "monthly_debt": 250,
    "down_payment": 14250,
    "interest_rate": 7.18,
    "loan_term_years": 30,
    "annual_property_tax": 2800,
    "annual_insurance": 1200,
    "monthly_hoa": 0,
    "other_monthly_housing": 100,
    "max_housing_ratio": 0.30,
    "max_total_debt_ratio": 0.43,
    "baseline_purchase_price": 285000,
    "baseline_rate": 7.18,
    "down_payment_pct": 5,
    "note": (
        "ASSUMPTION: all inputs are made up for the demo; income and down payment were picked so the estimate lands near the synthetic home's $285,000 price at 7.18%. 7.18% is the Freddie Mac 30-year rate shown on FRED for "
        "2026-11-05 (dated reference, not a live quote)."
    ),
}


@router.get("/demo-household")
def demo_household():
    return DEMO_HOUSEHOLD


@router.get("/assistance", response_model=list[MatchedProgram])
def assistance(city: str | None = None, session: Session = Depends(get_session)):
    """Buyer-side candidate assistance. Never an approval; availability is not confirmed."""
    ctx = funding_service.MatchContext(city=city or None)
    return funding_service.match_programs(all_programs(session), ctx, "buyer")
