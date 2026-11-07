from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from ..database import get_session
from ..schemas import (
    AffordabilityRequest, AffordabilityResult, ConsortiumRequest, ConsortiumResult, DonationImpact,
    DonationImpactRequest, GapRequest, GapResult, RateSensitivityRequest, RateSensitivityResult,
)
from ..services import finance_service as fin, project_service as ps
from .deps import get_project_or_404

router = APIRouter(prefix="/api/finance", tags=["finance"])

RATE_ASSUMPTIONS = [
    "ILLUSTRATIVE scenario model, not a lending quote.",
    "The monthly principal-and-interest payment at the baseline rate is held constant as the household's payment capacity.",
    "Down-payment percentage and non-mortgage housing costs are held fixed.",
    "The family's price is what the household can finance, so the developer's gap moves dollar-for-dollar with it.",
    "Baseline price, baseline rate and down-payment % are ASSUMPTIONS. The 7.18% default is the Freddie Mac 30-year rate "
    "reported on FRED for 2026-11-05 (https://fred.stlouisfed.org/series/MORTGAGE30US), a dated reference, not a live quote.",
]

AFFORDABILITY_ASSUMPTIONS = [
    "FICTIONAL household. Prototype estimate, not a lender pre-approval or underwriting.",
    "ASSUMPTION: max housing-cost ratio (default 30% of gross income) is a configurable planning assumption, not a universal rule.",
    "ASSUMPTION: max total debt ratio (default 43%) caps housing + existing debt. Configurable.",
    "Estimated price = maximum loan + down payment. Taxes, insurance and HOA are user inputs, not looked up.",
]


@router.post("/calculate", response_model=GapResult)
def calculate(body: GapRequest):
    if body.cost_items is not None:
        total = fin.total_cost(body.cost_items.values())
    elif body.total_development_cost is not None:
        total = body.total_development_cost
    else:
        raise HTTPException(status_code=422, detail="Provide total_development_cost or cost_items")
    return fin.calculate_gap(
        total, body.affordable_buyer_price, body.existing_public_subsidies, body.earned_revenue,
        body.confirmed_additional_funding, body.proposed_additional_funding,
    )


@router.post("/rate-sensitivity", response_model=RateSensitivityResult)
def rate_sensitivity(body: RateSensitivityRequest):
    result = fin.rate_sensitivity(
        body.baseline_purchase_price, body.baseline_rate, body.new_rate, body.loan_term_years,
        body.down_payment_pct, body.total_development_cost, body.existing_public_subsidies,
        body.earned_revenue, body.confirmed_additional_funding,
    )
    return {**result, "assumptions": RATE_ASSUMPTIONS}


@router.post("/affordability", response_model=AffordabilityResult)
def affordability(body: AffordabilityRequest):
    def run(rate):
        return fin.affordability(
            body.annual_income, body.monthly_debt, body.down_payment, rate, body.loan_term_years,
            body.annual_property_tax, body.annual_insurance, body.monthly_hoa, body.other_monthly_housing,
            body.max_housing_ratio, body.max_total_debt_ratio,
        )

    base = run(body.interest_rate)
    rates = sorted({Decimal(r) for r in body.compare_rates} | {body.interest_rate})
    table = []
    for r in rates:
        row = run(r)
        table.append({
            "rate": r,
            "monthly_mortgage_payment": row["monthly_mortgage_payment"],
            "estimated_affordable_purchase_price": row["estimated_affordable_purchase_price"],
        })
    return {**base, "rate_table": table, "assumptions": AFFORDABILITY_ASSUMPTIONS}


@router.post("/donation-impact", response_model=DonationImpact)
def donation_impact(body: DonationImpactRequest, session: Session = Depends(get_session)):
    project = get_project_or_404(session, body.project_id)
    items, contribs = ps.load_project_bundle(session, project)
    before = ps.compute_view(project, items, contribs)["finance"]
    after = ps.compute_view(project, items, contribs, {"extra_proposed": body.amount})["finance"]
    alloc = fin.allocate_donation(
        body.amount, [{"key": i.key, "label": i.label, "amount": i.amount} for i in items], before["scenario_gap"]
    )
    return {
        **alloc,
        "current_scenario_gap": before["scenario_gap"],
        "projected_scenario_gap": after["scenario_gap"],
        "initial_gap": before["initial_gap"],
        "note": (
            "Proposed, illustrative allocation: each cost line's share of total cost applied to the gift. "
            "It is not a record of what the money would buy or pay. Tax deductibility depends on the "
            "qualified recipient and applicable rules; nothing here promises a tax benefit."
        ),
    }


@router.post("/consortium", response_model=ConsortiumResult)
def consortium(body: ConsortiumRequest, session: Session = Depends(get_session)):
    project = get_project_or_404(session, body.project_id)
    items, contribs = ps.load_project_bundle(session, project)
    total = sum((m.amount for m in body.employers), Decimal(0))
    overrides: dict = {"proposed_employer": total}
    if not body.include_saved_donor_and_grant:
        overrides.update(proposed_donor=0, proposed_grant=0)
    only = ps.compute_view(project, items, contribs, {"proposed_employer": total, "proposed_donor": 0, "proposed_grant": 0})["finance"]
    combined = ps.compute_view(project, items, contribs, overrides)["finance"]
    initial = combined["initial_gap"]
    return {
        "total_employer_contribution": total,
        "employer_percent_of_initial_gap": min(Decimal(100), total / initial * 100) if initial > 0 else Decimal(0),
        "remaining_gap_employers_only": only["scenario_gap"],
        "combined_scenario": combined,
        "combined_message": ps.scenario_message(combined),
        "homes_supported_estimate": total / initial if initial > 0 else Decimal(0),
        "homes_supported_note": (
            "Arithmetic only: employer total divided by this one synthetic home's initial gap. "
            "Not a forecast of retention, commute or housing outcomes."
        ),
    }
