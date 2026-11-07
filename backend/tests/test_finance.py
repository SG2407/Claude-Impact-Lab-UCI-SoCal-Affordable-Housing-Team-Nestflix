from decimal import Decimal

import pytest

from app.services import finance_service as fin
from app.services import mortgage_service as mortgage

COSTS = [360_000, 85_000, 40_000, 50_000]


def gap(**kw):
    args = dict(total_development_cost=fin.total_cost(COSTS), affordable_buyer_price=285_000,
                existing_public_subsidies=100_000, earned_revenue=55_000)
    args.update(kw)
    return fin.calculate_gap(**args)


def test_total_cost():
    assert fin.total_cost(COSTS) == 535_000


def test_existing_funding():
    assert gap()["existing_funding"] == 440_000


def test_initial_gap():
    assert gap()["initial_gap"] == 95_000


def test_proposed_contribution_scenario_gap():
    g = gap(proposed_additional_funding=25_000)
    assert g["scenario_gap"] == 70_000


def test_proposed_does_not_reduce_secured_gap():
    g = gap(proposed_additional_funding=25_000)
    assert g["secured_gap"] == 95_000


def test_confirmed_reduces_secured_gap():
    assert gap(confirmed_additional_funding=25_000)["secured_gap"] == 70_000


def test_full_scenario_balances():
    g = gap(proposed_additional_funding=25_000 + 40_000 + 30_000)
    assert g["scenario_gap"] == 0
    assert g["funding_surplus"] == 0
    assert g["secured_gap"] == 95_000


def test_surplus_not_negative_gap():
    g = gap(proposed_additional_funding=120_000)
    assert g["scenario_gap"] == 0
    assert g["funding_surplus"] == 25_000


def test_negative_inputs_rejected():
    with pytest.raises(ValueError):
        gap(confirmed_additional_funding=-1)


def test_zero_interest_payment():
    assert mortgage.monthly_payment(360_000, 0, 30) == Decimal(1000)
    assert mortgage.max_principal(1000, 0, 30) == Decimal(360_000)


def test_payment_known_value():
    # 200,000 at 6% for 30 years is about 1,199.10 (standard amortization table value)
    assert round(float(mortgage.monthly_payment(200_000, 6, 30)), 2) == 1199.10


def test_payment_and_principal_are_inverses():
    p = mortgage.monthly_payment(250_000, 7.18, 30)
    assert abs(mortgage.max_principal(p, 7.18, 30) - 250_000) < Decimal("0.0001")


def _rate(new_rate):
    return fin.rate_sensitivity(285_000, 7.18, new_rate, 30, 5, 535_000, 100_000, 55_000)


def test_higher_rate_lowers_price_and_raises_gap():
    r = _rate(9.0)
    assert r["new_affordable_purchase_price"] < 285_000
    assert r["revised_gap"] > r["original_gap"]
    assert r["funding_gap_change"] == -r["change_in_purchase_price"]


def test_lower_rate_raises_price_and_lowers_gap():
    r = _rate(6.0)
    assert r["new_affordable_purchase_price"] > 285_000
    assert r["revised_gap"] < r["original_gap"]


def test_same_rate_no_change():
    r = _rate(7.18)
    assert abs(r["change_in_purchase_price"]) < Decimal("0.01")


def test_affordability_insufficient_budget_is_safe():
    a = fin.affordability(20_000, 1_500, 0, 7, 30, 3_000, 1_000, 0, 0, 0.3, 0.43)
    assert a["budget_is_insufficient"]
    assert a["max_loan_principal"] == 0


def test_affordability_zero_rate():
    a = fin.affordability(60_000, 0, 10_000, 0, 30, 0, 0, 0, 0, 0.3, 0.43)
    assert a["monthly_principal_interest_budget"] == Decimal(1500)
    assert a["estimated_affordable_purchase_price"] == Decimal(1500 * 360 + 10_000)


def test_donation_allocation_sums_to_applied():
    items = [{"key": "a", "label": "A", "amount": 300}, {"key": "b", "label": "B", "amount": 700}]
    r = fin.allocate_donation(50, items, 95)
    assert sum(l["proposed_allocation"] for l in r["lines"]) == 50


def test_status_transitions():
    assert fin.can_transition("proposed", "committed")
    assert not fin.can_transition("disbursed", "proposed")
    assert not fin.can_transition("committed", "proposed")
