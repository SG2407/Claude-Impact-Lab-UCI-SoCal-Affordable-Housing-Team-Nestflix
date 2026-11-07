"use client";

import { useEffect, useState } from "react";
import { RateChart } from "@/components/charts/RateChart";
import { ProgramCard } from "@/components/funding/ProgramCard";
import { WithProject } from "@/components/layout/AppShell";
import { Badge, Button, Card, ErrorBox, Notice, NumberField, SectionTitle, Spinner, Stat } from "@/components/ui/primitives";
import { calculateAffordability, calculateFundingGap, calculateRateSensitivity, getBuyerAssistance, getDemoHousehold } from "@/lib/api";
import { useDebounced, useSyncOnMount } from "@/lib/hooks";
import type { AffordabilityRequest, AffordabilityResult, DemoHousehold, FundingProgram, GapResult, Project, RateSensitivityResult } from "@/lib/types";
import { money, money2, signedMoney } from "@/lib/utils";

const CHART_RATES = [5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];
const PRESETS = [6.0, 7.18, 8.0, 9.0];

function BuyerInner({ project, hh }: { project: Project; hh: DemoHousehold }) {
  const [form, setForm] = useState<AffordabilityRequest>({
    annual_income: hh.annual_income, monthly_debt: hh.monthly_debt, down_payment: hh.down_payment, interest_rate: hh.interest_rate,
    loan_term_years: hh.loan_term_years, annual_property_tax: hh.annual_property_tax, annual_insurance: hh.annual_insurance,
    monthly_hoa: hh.monthly_hoa, other_monthly_housing: hh.other_monthly_housing, max_housing_ratio: hh.max_housing_ratio,
    max_total_debt_ratio: hh.max_total_debt_ratio,
  });
  const [afford, setAfford] = useState<AffordabilityResult | null>(null);
  const [householdGap, setHouseholdGap] = useState<GapResult | null>(null);
  const [rate, setRate] = useState(hh.baseline_rate);
  const [sens, setSens] = useState<RateSensitivityResult | null>(null);
  const [assist, setAssist] = useState<FundingProgram[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dForm = useDebounced(form, 250);
  const dRate = useDebounced(rate, 150);
  const set = <K extends keyof AffordabilityRequest>(k: K, v: AffordabilityRequest[K]) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const a = await calculateAffordability({ ...dForm, compare_rates: CHART_RATES } as Partial<AffordabilityRequest>);
        const g = await calculateFundingGap({
          cost_items: Object.fromEntries(project.cost_items.map((i) => [i.key, i.amount])),
          affordable_buyer_price: a.estimated_affordable_purchase_price,
          existing_public_subsidies: project.existing_public_subsidies, earned_revenue: project.earned_revenue,
          confirmed_additional_funding: project.finance.confirmed_additional_funding,
        });
        if (!cancelled) { setAfford(a); setHouseholdGap(g); setError(null); }
      } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : "Calculation failed"); }
    })();
    return () => { cancelled = true; };
  }, [dForm, project]);

  useEffect(() => {
    let cancelled = false;
    calculateRateSensitivity({
      baseline_purchase_price: project.affordable_purchase_price, baseline_rate: hh.baseline_rate, new_rate: dRate,
      loan_term_years: form.loan_term_years, down_payment_pct: hh.down_payment_pct,
      total_development_cost: project.finance.total_cost, existing_public_subsidies: project.existing_public_subsidies,
      earned_revenue: project.earned_revenue, confirmed_additional_funding: project.finance.confirmed_additional_funding,
    })
      .then((r) => { if (!cancelled) { setSens(r); setError(null); } })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : "Calculation failed"); });
    return () => { cancelled = true; };
  }, [dRate, form.loan_term_years, hh, project]);

  useEffect(() => { getBuyerAssistance().then(setAssist).catch((e) => setError(e instanceof Error ? e.message : "Could not load programs")); }, []);

  const chartPoints = afford?.rate_table.filter((r) => CHART_RATES.includes(r.rate)).map((r) => ({ rate: r.rate, price: r.estimated_affordable_purchase_price })) ?? [];
  const current = afford ? { rate: form.interest_rate, price: afford.estimated_affordable_purchase_price } : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Buyer Dashboard</h1>
        <p className="text-sm text-muted">Help a household understand affordability. Not a lender, no pre-approval, no real person.</p>
      </div>
      {error && <ErrorBox message={error} />}
      <Notice tone="warn"><b>{hh.label}.</b> {hh.note}</Notice>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle title="Affordability calculator" subtitle="Computed in Python by the backend, not by AI." />
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberField label="Annual household income" prefix="$" step={1000} value={form.annual_income} onChange={(v) => set("annual_income", v)} />
            <NumberField label="Monthly existing debt" prefix="$" step={50} value={form.monthly_debt} onChange={(v) => set("monthly_debt", v)} />
            <NumberField label="Available down payment" prefix="$" step={1000} value={form.down_payment} onChange={(v) => set("down_payment", v)} />
            <NumberField label="Mortgage interest rate" suffix="%" step={0.01} max={30} value={form.interest_rate} onChange={(v) => set("interest_rate", v)} />
            <NumberField label="Loan term" suffix="years" min={1} max={50} value={form.loan_term_years} onChange={(v) => set("loan_term_years", Math.max(1, Math.round(v)))} />
            <NumberField label="Annual property tax (estimate)" prefix="$" step={100} value={form.annual_property_tax} onChange={(v) => set("annual_property_tax", v)} />
            <NumberField label="Annual insurance (estimate)" prefix="$" step={100} value={form.annual_insurance} onChange={(v) => set("annual_insurance", v)} />
            <NumberField label="Monthly HOA" prefix="$" step={10} value={form.monthly_hoa} onChange={(v) => set("monthly_hoa", v)} />
            <NumberField label="Other monthly housing expenses" prefix="$" step={10} value={form.other_monthly_housing} onChange={(v) => set("other_monthly_housing", v)} />
            <NumberField label="Max housing budget ratio (ASSUMPTION)" suffix="%" step={1} min={1} max={100} value={Math.round(form.max_housing_ratio * 100)} onChange={(v) => set("max_housing_ratio", Math.min(1, Math.max(0.01, v / 100)))} hint="A planning assumption, not a universal underwriting rule." />
            <NumberField label="Max total debt ratio (ASSUMPTION)" suffix="%" step={1} min={1} max={100} value={Math.round(form.max_total_debt_ratio * 100)} onChange={(v) => set("max_total_debt_ratio", Math.min(1, Math.max(0.01, v / 100)))} hint="Housing + existing debt cap. Configurable assumption." />
          </div>
        </Card>

        <Card>
          <SectionTitle title="Estimated results" subtitle="Prototype estimate for a fictional household." />
          {!afford ? <Spinner /> : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Monthly income" value={money(afford.monthly_income)} />
                <Stat label="Assumed available housing payment" value={money(afford.assumed_available_housing_payment)} hint={`Binding limit: ${afford.binding_limit.replace(/_/g, " ")}`} />
                <Stat label="Max estimated loan" value={money(afford.max_loan_principal)} />
                <Stat label="Estimated affordable price" value={money(afford.estimated_affordable_purchase_price)} tone="good" hint="Loan + down payment" />
                <Stat label="Monthly mortgage payment (P&I)" value={money2(afford.monthly_mortgage_payment)} />
                <Stat label="Total monthly housing cost" value={money2(afford.estimated_total_monthly_housing_cost)} hint={`Includes ${money(afford.non_mortgage_monthly_costs)} non-mortgage`} />
              </div>
              {afford.budget_is_insufficient && <div className="mt-3"><Notice tone="warn">Income minus debts and non-mortgage costs leaves no room for a mortgage payment under these assumptions.</Notice></div>}
              <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-muted">{afford.assumptions.map((a) => <li key={a}>{a}</li>)}</ul>
            </>
          )}
        </Card>
      </div>

      <Card>
        <SectionTitle title="Mortgage interest-rate simulator" subtitle="Holds the buyer's monthly payment capacity fixed, reprices the home, and recomputes the developer's gap (illustrative scenario model)." />
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <div className="flex items-end justify-between">
              <span className="text-sm font-medium text-navy-800">Interest rate: <span className="text-xl font-semibold tabular-nums text-teal-600">{rate.toFixed(2)}%</span></span>
              <div className="flex gap-1.5">{PRESETS.map((p) => <Button key={p} variant={rate === p ? "primary" : "secondary"} className="px-2.5 py-1 text-xs" onClick={() => setRate(p)}>{p.toFixed(p === 7.18 ? 2 : 1)}%</Button>)}</div>
            </div>
            <input type="range" min={4} max={10} step={0.01} value={rate} aria-label="Mortgage interest rate" onChange={(e) => setRate(Number(e.target.value))} className="mt-3 w-full" />
            <p className="mt-1 text-xs text-muted">7.18% = Freddie Mac 30-year rate shown on FRED for 2026-11-05 (dated reference, not a live quote). Source: fred.stlouisfed.org/series/MORTGAGE30US.</p>
            {sens && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Stat label="Baseline price → revised price" value={money(sens.new_affordable_purchase_price)} hint={`from ${money(sens.baseline_purchase_price)} (${signedMoney(sens.change_in_purchase_price)})`} tone={sens.change_in_purchase_price < 0 ? "gap" : "good"} />
                <Stat label="Revised development gap" value={money(sens.revised_gap)} hint={`was ${money(sens.original_gap)} (${signedMoney(sens.funding_gap_change)})`} tone={sens.funding_gap_change > 0 ? "gap" : "good"} />
                <Stat label="Fixed monthly P&I capacity" value={money2(sens.baseline_monthly_payment)} hint="At the baseline rate" />
                <Stat label="Revised loan amount" value={money(sens.new_loan_amount)} hint={`was ${money(sens.baseline_loan_amount)}`} />
              </div>
            )}
            {sens && <p className="mt-3 text-sm text-ink">{sens.funding_gap_change > 0 ? `Higher mortgage costs shrink what the family can pay, so the developer's gap grows by ${money(sens.funding_gap_change)}.` : sens.funding_gap_change < 0 ? `Lower rates raise what the family can pay, so the gap shrinks by ${money(Math.abs(sens.funding_gap_change))}.` : "At the baseline rate there is no change."}</p>}
          </div>
          <div>
            <h3 className="mb-1 text-sm font-semibold text-navy-900">This household: affordable price by rate</h3>
            <RateChart points={chartPoints} current={current} />
            {afford && (
              <table className="mt-2 w-full text-sm">
                <thead><tr className="border-b border-line text-left text-xs uppercase text-muted"><th className="py-1">Rate</th><th className="py-1 text-right">P&I payment</th><th className="py-1 text-right">Affordable price</th></tr></thead>
                <tbody>{afford.rate_table.filter((r) => [6, 7, 8, 9].includes(r.rate) || r.rate === form.interest_rate).map((r) => (
                  <tr key={r.rate} className="border-b border-line/60"><td className="py-1">{r.rate.toFixed(2)}%</td><td className="py-1 text-right tabular-nums">{money2(r.monthly_mortgage_payment)}</td><td className="py-1 text-right tabular-nums">{money(r.estimated_affordable_purchase_price)}</td></tr>
                ))}</tbody>
              </table>
            )}
          </div>
        </div>
        {sens && <ul className="mt-4 list-disc space-y-1 pl-5 text-xs text-muted">{sens.assumptions.map((a) => <li key={a}>{a}</li>)}</ul>}
      </Card>

      <Card>
        <SectionTitle title="Buyer-to-project gap" subtitle="Same synthetic home: a lower buyer purchasing capacity increases the funding requirement; higher reduces it." />
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Project's assumed buyer price" value={money(project.affordable_purchase_price)} hint={`Initial gap ${money(project.finance.initial_gap)}`} />
          <Stat label="This household's estimated price" value={money(afford?.estimated_affordable_purchase_price)} hint={householdGap ? `Gap ${money(householdGap.initial_gap)}` : ""} tone="good" />
          <Stat label="Gap difference vs. project" value={householdGap ? signedMoney(householdGap.initial_gap - project.finance.initial_gap) : "…"} tone={householdGap && householdGap.initial_gap > project.finance.initial_gap ? "gap" : "good"} hint="Each dollar of buyer capacity moves the gap one-for-one" />
        </div>
      </Card>

      <Card>
        <SectionTitle title="Assistance opportunities" subtitle="Sourced candidate programs. Eligibility is never promised; availability is not confirmed." right={<Badge tone="amber">Leads, not approvals</Badge>} />
        {!assist ? <Spinner /> : <div className="grid gap-4 lg:grid-cols-2">{assist.map((p) => <ProgramCard key={p.id} p={p} />)}</div>}
        <p className="mt-3 text-xs text-muted">Buyer-side assistance must not be double-counted as developer subsidy. NestFlix is not a lender and does not approve loans.</p>
      </Card>
    </div>
  );
}

function BuyerLoader({ project }: { project: Project }) {
  const [hh, setHh] = useState<DemoHousehold | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { getDemoHousehold().then(setHh).catch((e) => setError(e instanceof Error ? e.message : "Failed to load household")); }, []);
  if (error) return <ErrorBox message={error} />;
  if (!hh) return <Spinner label="Loading synthetic household…" />;
  return <BuyerInner project={project} hh={hh} />;
}

export default function BuyersPage() {
  useSyncOnMount();
  return <WithProject>{(p) => <BuyerLoader project={p} />}</WithProject>;
}
