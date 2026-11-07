"""Pure financial engine. No database or web imports: everything here is unit-testable.

Funding categories (kept separate so money is never counted twice):
  * existing funding  = buyer price + existing public subsidies + earned revenue
  * confirmed funding = additional contributions with status committed/disbursed
  * proposed funding  = additional contributions with status proposed/applied (hypothetical)
"""

from decimal import Decimal
from typing import Iterable

from . import mortgage_service as mortgage
from .mortgage_service import to_decimal

ZERO = Decimal(0)
CONFIRMED_STATUSES = ("committed", "disbursed")
PIPELINE_STATUSES = ("proposed", "applied")
ALL_STATUSES = ("proposed", "applied", "committed", "disbursed")
CATEGORIES = ("donor", "employer", "grant", "other")

# Explicit, one-way demo transitions. Nothing goes backwards once committed.
ALLOWED_TRANSITIONS = {
    "proposed": {"applied", "committed"},
    "applied": {"committed", "proposed"},
    "committed": {"disbursed"},
    "disbursed": set(),
}


def can_transition(current: str, new: str) -> bool:
    return new in ALLOWED_TRANSITIONS.get(current, set())


def _d(value) -> Decimal:
    return to_decimal(value)


def _pct(numerator: Decimal, denominator: Decimal) -> Decimal:
    if denominator <= 0:
        return Decimal(100) if numerator >= 0 else ZERO
    return min(Decimal(100), max(ZERO, numerator / denominator * 100))


def total_cost(amounts: Iterable) -> Decimal:
    return sum((_d(a) for a in amounts), ZERO)


def calculate_gap(
    total_development_cost,
    affordable_buyer_price,
    existing_public_subsidies,
    earned_revenue,
    confirmed_additional_funding=0,
    proposed_additional_funding=0,
) -> dict:
    cost = _d(total_development_cost)
    buyer = _d(affordable_buyer_price)
    subsidies = _d(existing_public_subsidies)
    earned = _d(earned_revenue)
    confirmed = _d(confirmed_additional_funding)
    proposed = _d(proposed_additional_funding)
    for name, v in (
        ("total_development_cost", cost),
        ("affordable_buyer_price", buyer),
        ("existing_public_subsidies", subsidies),
        ("earned_revenue", earned),
        ("confirmed_additional_funding", confirmed),
        ("proposed_additional_funding", proposed),
    ):
        if v < 0:
            raise ValueError(f"{name} cannot be negative")

    existing = buyer + subsidies + earned
    initial_gap = max(ZERO, cost - existing)
    secured_gap = max(ZERO, initial_gap - confirmed)
    scenario_gap = max(ZERO, secured_gap - proposed)
    surplus = max(ZERO, existing + confirmed + proposed - cost)

    return {
        "total_cost": cost,
        "existing_funding": existing,
        "initial_gap": initial_gap,
        "confirmed_additional_funding": confirmed,
        "secured_gap": secured_gap,
        "proposed_additional_funding": proposed,
        "scenario_gap": scenario_gap,
        "funding_surplus": surplus,
        # Share of the initial gap closed if every proposed dollar arrived (capped at 100).
        "funding_coverage_percentage": _pct(confirmed + proposed, initial_gap)
        if initial_gap > 0
        else Decimal(100),
        # Share closed by confirmed money only.
        "secured_coverage_percentage": _pct(confirmed, initial_gap)
        if initial_gap > 0
        else Decimal(100),
    }


def funding_stack(
    gap: dict,
    buyer_price,
    subsidies,
    earned,
    confirmed_by_category: dict,
    proposed_by_category: dict,
) -> list[dict]:
    """Ordered segments for the stacked bar. Sums to total cost (plus any surplus)."""
    labels = {
        "donor": "Donor",
        "employer": "Employer",
        "grant": "Grant",
        "other": "Other",
    }
    stack = [
        {"key": "buyer", "label": "Buyer purchase price", "amount": _d(buyer_price), "status": "assumption"},
        {"key": "subsidies", "label": "Existing public subsidies", "amount": _d(subsidies), "status": "assumption"},
        {"key": "earned", "label": "Earned revenue", "amount": _d(earned), "status": "assumption"},
    ]
    for cat in CATEGORIES:
        amount = _d(confirmed_by_category.get(cat, 0))
        if amount > 0:
            stack.append({"key": f"confirmed_{cat}", "label": f"{labels[cat]} (confirmed)", "amount": amount, "status": "confirmed"})
    for cat in CATEGORIES:
        amount = _d(proposed_by_category.get(cat, 0))
        if amount > 0:
            stack.append({"key": f"proposed_{cat}", "label": f"{labels[cat]} (proposed)", "amount": amount, "status": "proposed"})
    stack.append({"key": "remaining_gap", "label": "Remaining gap", "amount": gap["scenario_gap"], "status": "gap"})
    return stack


def allocate_donation(amount, cost_items: list[dict], initial_gap) -> dict:
    """Illustrative, proportional allocation of a proposed gift across cost lines.

    This is NOT a record of where money would be spent. It only scales each line's
    share of the total cost so a donor can see a labelled, proposed breakdown.
    """
    amt = _d(amount)
    if amt < 0:
        raise ValueError("amount cannot be negative")
    gap = _d(initial_gap)
    total = total_cost(i["amount"] for i in cost_items)
    applied = min(amt, gap) if gap > 0 else ZERO
    lines = []
    for item in cost_items:
        share = _d(item["amount"]) / total if total > 0 else ZERO
        lines.append({"key": item["key"], "label": item["label"], "share_pct": share * 100, "proposed_allocation": applied * share})
    return {
        "amount": amt,
        "amount_applied_to_gap": applied,
        "amount_above_gap": max(ZERO, amt - applied),
        "percent_of_gap": _pct(applied, gap) if gap > 0 else ZERO,
        "lines": lines,
    }


def rate_sensitivity(
    baseline_purchase_price,
    baseline_rate_pct,
    new_rate_pct,
    term_years,
    down_payment_pct,
    total_development_cost,
    existing_public_subsidies,
    earned_revenue,
    confirmed_additional_funding=0,
) -> dict:
    """Hold the buyer's monthly principal-and-interest capacity constant and reprice.

    ILLUSTRATIVE scenario model. Assumptions: the monthly P&I at the baseline rate is
    the household's fixed payment capacity; down-payment percentage and non-mortgage
    costs stay fixed; the buyer price is what the household can finance, so the
    developer's gap moves dollar-for-dollar with it.
    """
    price0 = _d(baseline_purchase_price)
    down_pct = _d(down_payment_pct)
    if price0 < 0:
        raise ValueError("baseline_purchase_price cannot be negative")
    loan0 = price0 * (1 - down_pct / 100)
    payment0 = mortgage.monthly_payment(loan0, baseline_rate_pct, term_years)
    loan1 = mortgage.max_principal(payment0, new_rate_pct, term_years)
    price1 = mortgage.purchase_price_from_loan(loan1, down_pct)

    def gaps(price):
        g = calculate_gap(
            total_development_cost, price, existing_public_subsidies, earned_revenue, confirmed_additional_funding
        )
        return g["initial_gap"], g["secured_gap"]

    initial0, secured0 = gaps(price0)
    initial1, secured1 = gaps(price1)
    return {
        "baseline_monthly_payment": payment0,
        "baseline_loan_amount": loan0,
        "new_loan_amount": loan1,
        "baseline_purchase_price": price0,
        "new_affordable_purchase_price": price1,
        "change_in_purchase_price": price1 - price0,
        "original_gap": initial0,
        "revised_gap": initial1,
        "funding_gap_change": initial1 - initial0,
        "original_secured_gap": secured0,
        "revised_secured_gap": secured1,
        "secured_gap_change": secured1 - secured0,
    }


def affordability(
    annual_income,
    monthly_debt,
    down_payment,
    annual_rate_pct,
    term_years,
    annual_property_tax,
    annual_insurance,
    monthly_hoa,
    other_monthly_housing,
    max_housing_ratio,
    max_total_debt_ratio,
) -> dict:
    """Estimate a purchase price from income. Ratios are ASSUMPTIONS, not underwriting rules."""
    income = _d(annual_income)
    monthly_income = income / 12
    housing_ratio = _d(max_housing_ratio)
    dti = _d(max_total_debt_ratio)
    non_mortgage = _d(annual_property_tax) / 12 + _d(annual_insurance) / 12 + _d(monthly_hoa) + _d(other_monthly_housing)

    by_housing_ratio = monthly_income * housing_ratio
    by_total_debt = monthly_income * dti - _d(monthly_debt)
    available_housing = max(ZERO, min(by_housing_ratio, by_total_debt))
    pi_budget = max(ZERO, available_housing - non_mortgage)

    loan = mortgage.max_principal(pi_budget, annual_rate_pct, term_years)
    price = loan + _d(down_payment)
    payment = mortgage.monthly_payment(loan, annual_rate_pct, term_years)
    return {
        "monthly_income": monthly_income,
        "assumed_available_housing_payment": available_housing,
        "binding_limit": "housing_ratio" if by_housing_ratio <= by_total_debt else "total_debt_ratio",
        "non_mortgage_monthly_costs": non_mortgage,
        "monthly_principal_interest_budget": pi_budget,
        "max_loan_principal": loan,
        "estimated_affordable_purchase_price": price,
        "monthly_mortgage_payment": payment,
        "estimated_total_monthly_housing_cost": payment + non_mortgage,
        "budget_is_insufficient": pi_budget <= 0,
    }
