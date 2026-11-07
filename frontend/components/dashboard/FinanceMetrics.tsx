import type { GapResult } from "@/lib/types";
import { money } from "@/lib/utils";
import { Stat } from "../ui/primitives";

export function FinanceMetrics({ f }: { f: GapResult }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
      <Stat label="Total development cost" value={money(f.total_cost)} hint="Synthetic assumption" />
      <Stat label="Existing funding" value={money(f.existing_funding)} hint="Buyer price + subsidies + earned revenue" />
      <Stat label="Initial funding gap" value={money(f.initial_gap)} tone="gap" hint="Cost − existing funding" />
      <Stat label="Committed additional" value={money(f.confirmed_additional_funding)} tone="good" hint="Committed or disbursed only" />
      <Stat label="Remaining secured gap" value={money(f.secured_gap)} tone="gap" hint="Initial gap − committed" />
      <Stat label="Scenario gap" value={money(f.scenario_gap)} tone="warn" hint="If proposed funding arrived (hypothetical)" />
    </div>
  );
}
