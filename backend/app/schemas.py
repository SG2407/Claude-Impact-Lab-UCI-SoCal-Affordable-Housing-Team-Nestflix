from datetime import datetime
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, PlainSerializer

# Money in/out: validated as Decimal, serialised to JSON as a number.
Money = Annotated[
    Decimal,
    Field(ge=0, le=Decimal("1000000000000")),
    PlainSerializer(lambda v: round(float(v), 2), return_type=float, when_used="json"),
]
SignedMoney = Annotated[
    Decimal,
    PlainSerializer(lambda v: round(float(v), 2), return_type=float, when_used="json"),
]
Pct = Annotated[Decimal, PlainSerializer(lambda v: round(float(v), 2), return_type=float, when_used="json")]

Status = Literal["proposed", "applied", "committed", "disbursed"]
Category = Literal["donor", "employer", "grant", "other"]


class Health(BaseModel):
    status: str
    application: str
    version: str


# ---------- finance ----------
class GapRequest(BaseModel):
    total_development_cost: Money | None = Field(None, description="Use this OR cost_items")
    cost_items: dict[str, Money] | None = None
    affordable_buyer_price: Money
    existing_public_subsidies: Money
    earned_revenue: Money
    confirmed_additional_funding: Money = Decimal(0)
    proposed_additional_funding: Money = Decimal(0)


class GapResult(BaseModel):
    total_cost: Money
    existing_funding: Money
    initial_gap: Money
    confirmed_additional_funding: Money
    secured_gap: Money
    proposed_additional_funding: Money
    scenario_gap: Money
    funding_surplus: Money
    funding_coverage_percentage: Pct
    secured_coverage_percentage: Pct


class RateSensitivityRequest(BaseModel):
    baseline_purchase_price: Money
    baseline_rate: Annotated[Decimal, Field(ge=0, le=30)] = Field(description="Annual %, e.g. 7.18")
    new_rate: Annotated[Decimal, Field(ge=0, le=30)]
    loan_term_years: Annotated[int, Field(ge=1, le=50)] = 30
    down_payment_pct: Annotated[Decimal, Field(ge=0, lt=100)] = Decimal(5)
    total_development_cost: Money
    existing_public_subsidies: Money
    earned_revenue: Money
    confirmed_additional_funding: Money = Decimal(0)


class RateSensitivityResult(BaseModel):
    baseline_monthly_payment: Money
    baseline_loan_amount: Money
    new_loan_amount: Money
    baseline_purchase_price: Money
    new_affordable_purchase_price: Money
    change_in_purchase_price: SignedMoney
    original_gap: Money
    revised_gap: Money
    funding_gap_change: SignedMoney
    original_secured_gap: Money
    revised_secured_gap: Money
    secured_gap_change: SignedMoney
    assumptions: list[str]


class AffordabilityRequest(BaseModel):
    annual_income: Money
    monthly_debt: Money = Decimal(0)
    down_payment: Money = Decimal(0)
    interest_rate: Annotated[Decimal, Field(ge=0, le=30)]
    loan_term_years: Annotated[int, Field(ge=1, le=50)] = 30
    annual_property_tax: Money = Decimal(0)
    annual_insurance: Money = Decimal(0)
    monthly_hoa: Money = Decimal(0)
    other_monthly_housing: Money = Decimal(0)
    max_housing_ratio: Annotated[Decimal, Field(gt=0, le=1)] = Decimal("0.30")
    max_total_debt_ratio: Annotated[Decimal, Field(gt=0, le=1)] = Decimal("0.43")
    compare_rates: list[Annotated[Decimal, Field(ge=0, le=30)]] = Field(
        default_factory=lambda: [Decimal("6.0"), Decimal("7.18"), Decimal("8.0"), Decimal("9.0")]
    )


class AffordabilityBase(BaseModel):
    monthly_income: Money
    assumed_available_housing_payment: Money
    binding_limit: str
    non_mortgage_monthly_costs: Money
    monthly_principal_interest_budget: Money
    max_loan_principal: Money
    estimated_affordable_purchase_price: Money
    monthly_mortgage_payment: Money
    estimated_total_monthly_housing_cost: Money
    budget_is_insufficient: bool


class RatePoint(BaseModel):
    rate: Pct
    monthly_mortgage_payment: Money
    estimated_affordable_purchase_price: Money


class AffordabilityResult(AffordabilityBase):
    rate_table: list[RatePoint]
    assumptions: list[str]


class DonationImpactRequest(BaseModel):
    project_id: int
    amount: Money


class AllocationLine(BaseModel):
    key: str
    label: str
    share_pct: Pct
    proposed_allocation: Money


class DonationImpact(BaseModel):
    amount: Money
    amount_applied_to_gap: Money
    amount_above_gap: Money
    percent_of_gap: Pct
    current_scenario_gap: Money
    projected_scenario_gap: Money
    initial_gap: Money
    lines: list[AllocationLine]
    note: str


# ---------- projects ----------
class CostItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    key: str
    label: str
    amount: Money
    lane: str
    label_status: str
    note: str


class ContributionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    project_id: int
    contributor_name: str
    contributor_type: str
    amount: Money
    funding_category: str
    status: Status
    synthetic: bool
    created_at: datetime


class ContributionCreate(BaseModel):
    contributor_name: Annotated[str, Field(min_length=1, max_length=80)]
    contributor_type: Category
    amount: Annotated[int, Field(gt=0, le=1_000_000_000)]
    funding_category: Category | None = None


class ContributionStatusUpdate(BaseModel):
    status: Status


class StackSegment(BaseModel):
    key: str
    label: str
    amount: Money
    status: str


class ProjectOut(BaseModel):
    id: int
    slug: str
    name: str
    description: str
    location_label: str
    housing_type: str
    units: int
    status: str
    synthetic: bool
    affordable_purchase_price: Money
    existing_public_subsidies: Money
    earned_revenue: Money
    cost_items: list[CostItemOut]
    finance: GapResult
    funding_stack: list[StackSegment]
    confirmed_by_category: dict[str, Money]
    proposed_by_category: dict[str, Money]
    contributions_count: int
    disclaimer: str


class CostUpdate(BaseModel):
    costs: dict[str, Money]


class ScenarioRequest(BaseModel):
    """What-if overlay. A None override keeps the saved proposed/applied total for that category."""

    proposed_donor: Money | None = None
    proposed_employer: Money | None = None
    proposed_grant: Money | None = None
    extra_proposed: Money = Decimal(0)
    affordable_buyer_price: Money | None = None
    cost_items: dict[str, Money] | None = None


class ScenarioResult(BaseModel):
    finance: GapResult
    funding_stack: list[StackSegment]
    proposed_by_category: dict[str, Money]
    confirmed_by_category: dict[str, Money]
    scenario_message: str


class ConsortiumMember(BaseModel):
    name: Annotated[str, Field(min_length=1, max_length=80)]
    amount: Money


class ConsortiumRequest(BaseModel):
    project_id: int
    employers: list[ConsortiumMember]
    include_saved_donor_and_grant: bool = True


class ConsortiumResult(BaseModel):
    total_employer_contribution: Money
    employer_percent_of_initial_gap: Pct
    remaining_gap_employers_only: Money
    combined_scenario: GapResult
    combined_message: str
    homes_supported_estimate: Pct
    homes_supported_note: str


# ---------- funding programs & AI ----------
class MatchedProgram(BaseModel):
    id: str
    name: str
    provider: str
    category: str
    audience: str
    funding_kind: str
    description: str
    source_url: str | None
    last_verified: str | None
    verification_status: str
    availability_status: str
    eligibility_notes: str
    restrictions: str
    eligible_project_types: str
    maximum_funding_if_verified: str | None
    synthetic: bool
    match_status: str
    relevance_score: int
    why_it_may_fit: list[str]
    unresolved_checks: list[str]
    excluded_reason: str | None
    amount_known: bool


class StrategyRequest(BaseModel):
    project_id: int
    proposed_donor: Money | None = None
    proposed_employer: Money | None = None
    proposed_grant: Money | None = None


class StrategyOpportunity(BaseModel):
    id: str
    name: str
    funding_kind: str
    rationale: str
    match_status: str
    source_url: str | None
    unresolved: list[str]


class StrategyResponse(BaseModel):
    generation_mode: Literal["claude", "rule_based"]
    generation_note: str
    model: str | None = None
    summary: str
    opportunities: list[StrategyOpportunity]
    assumptions: list[str]
    missing_information: list[str]
    risks: list[str]
    next_steps: list[str]
    sources: list[str]
    finance: GapResult
    funding_stack: list[StackSegment]
    disclaimer: str
