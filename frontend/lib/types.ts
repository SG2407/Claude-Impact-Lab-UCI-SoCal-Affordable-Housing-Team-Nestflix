export type Status = "proposed" | "applied" | "committed" | "disbursed";
export type Category = "donor" | "employer" | "grant" | "other";

export interface GapResult {
  total_cost: number;
  existing_funding: number;
  initial_gap: number;
  confirmed_additional_funding: number;
  secured_gap: number;
  proposed_additional_funding: number;
  scenario_gap: number;
  funding_surplus: number;
  funding_coverage_percentage: number;
  secured_coverage_percentage: number;
}

export interface GapRequest {
  total_development_cost?: number;
  cost_items?: Record<string, number>;
  affordable_buyer_price: number;
  existing_public_subsidies: number;
  earned_revenue: number;
  confirmed_additional_funding?: number;
  proposed_additional_funding?: number;
}

export interface CostItem {
  key: string;
  label: string;
  amount: number;
  lane: string;
  label_status: string;
  note: string;
}

export interface StackSegment {
  key: string;
  label: string;
  amount: number;
  status: string;
}

export interface Project {
  id: number;
  slug: string;
  name: string;
  description: string;
  location_label: string;
  housing_type: string;
  units: number;
  status: string;
  synthetic: boolean;
  affordable_purchase_price: number;
  existing_public_subsidies: number;
  earned_revenue: number;
  cost_items: CostItem[];
  finance: GapResult;
  funding_stack: StackSegment[];
  confirmed_by_category: Record<Category, number>;
  proposed_by_category: Record<Category, number>;
  contributions_count: number;
  disclaimer: string;
}

export interface Contribution {
  id: number;
  project_id: number;
  contributor_name: string;
  contributor_type: Category;
  amount: number;
  funding_category: Category;
  status: Status;
  synthetic: boolean;
  created_at: string;
}

export interface ContributionCreate {
  contributor_name: string;
  contributor_type: Category;
  amount: number;
  funding_category?: Category;
}

export interface ScenarioRequest {
  proposed_donor?: number | null;
  proposed_employer?: number | null;
  proposed_grant?: number | null;
  extra_proposed?: number;
  affordable_buyer_price?: number | null;
  cost_items?: Record<string, number> | null;
}

export interface ScenarioResult {
  finance: GapResult;
  funding_stack: StackSegment[];
  proposed_by_category: Record<Category, number>;
  confirmed_by_category: Record<Category, number>;
  scenario_message: string;
}

export interface DonationImpact {
  amount: number;
  amount_applied_to_gap: number;
  amount_above_gap: number;
  percent_of_gap: number;
  current_scenario_gap: number;
  projected_scenario_gap: number;
  initial_gap: number;
  lines: { key: string; label: string; share_pct: number; proposed_allocation: number }[];
  note: string;
}

export interface ConsortiumResult {
  total_employer_contribution: number;
  employer_percent_of_initial_gap: number;
  remaining_gap_employers_only: number;
  combined_scenario: GapResult;
  combined_message: string;
  homes_supported_estimate: number;
  homes_supported_note: string;
}

export interface RateSensitivityRequest {
  baseline_purchase_price: number;
  baseline_rate: number;
  new_rate: number;
  loan_term_years: number;
  down_payment_pct: number;
  total_development_cost: number;
  existing_public_subsidies: number;
  earned_revenue: number;
  confirmed_additional_funding?: number;
}

export interface RateSensitivityResult {
  baseline_monthly_payment: number;
  baseline_loan_amount: number;
  new_loan_amount: number;
  baseline_purchase_price: number;
  new_affordable_purchase_price: number;
  change_in_purchase_price: number;
  original_gap: number;
  revised_gap: number;
  funding_gap_change: number;
  original_secured_gap: number;
  revised_secured_gap: number;
  secured_gap_change: number;
  assumptions: string[];
}

export interface AffordabilityRequest {
  annual_income: number;
  monthly_debt: number;
  down_payment: number;
  interest_rate: number;
  loan_term_years: number;
  annual_property_tax: number;
  annual_insurance: number;
  monthly_hoa: number;
  other_monthly_housing: number;
  max_housing_ratio: number;
  max_total_debt_ratio: number;
}

export interface AffordabilityResult {
  monthly_income: number;
  assumed_available_housing_payment: number;
  binding_limit: string;
  non_mortgage_monthly_costs: number;
  monthly_principal_interest_budget: number;
  max_loan_principal: number;
  estimated_affordable_purchase_price: number;
  monthly_mortgage_payment: number;
  estimated_total_monthly_housing_cost: number;
  budget_is_insufficient: boolean;
  rate_table: { rate: number; monthly_mortgage_payment: number; estimated_affordable_purchase_price: number }[];
  assumptions: string[];
}

export interface DemoHousehold extends AffordabilityRequest {
  label: string;
  baseline_purchase_price: number;
  baseline_rate: number;
  down_payment_pct: number;
  note: string;
}

export interface FundingProgram {
  id: string;
  name: string;
  provider: string;
  category: string;
  audience: string;
  funding_kind: string;
  description: string;
  source_url: string | null;
  last_verified: string | null;
  verification_status: string;
  availability_status: string;
  eligibility_notes: string;
  restrictions: string;
  eligible_project_types: string;
  maximum_funding_if_verified: string | null;
  synthetic: boolean;
  match_status: string;
  relevance_score: number;
  why_it_may_fit: string[];
  unresolved_checks: string[];
  excluded_reason: string | null;
  amount_known: boolean;
}

export interface StrategyRequest {
  project_id: number;
  proposed_donor?: number | null;
  proposed_employer?: number | null;
  proposed_grant?: number | null;
}

export interface StrategyResponse {
  generation_mode: "claude" | "rule_based";
  generation_note: string;
  model: string | null;
  summary: string;
  opportunities: {
    id: string;
    name: string;
    funding_kind: string;
    rationale: string;
    match_status: string;
    source_url: string | null;
    unresolved: string[];
  }[];
  assumptions: string[];
  missing_information: string[];
  risks: string[];
  next_steps: string[];
  sources: string[];
  finance: GapResult;
  funding_stack: StackSegment[];
  disclaimer: string;
}
