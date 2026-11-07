"use client";

import { useEffect, useState } from "react";
import { FundingStackChart } from "@/components/charts/FundingStackChart";
import { ContributionList } from "@/components/dashboard/ContributionList";
import { WithProject } from "@/components/layout/AppShell";
import { Button, Card, ErrorBox, Notice, NumberField, ProgressBar, SectionTitle, Stat } from "@/components/ui/primitives";
import { createContribution, getDonationImpact } from "@/lib/api";
import { useDebounced, useSyncOnMount } from "@/lib/hooks";
import { useProject } from "@/lib/project-context";
import type { DonationImpact, Project } from "@/lib/types";
import { money, pct } from "@/lib/utils";

const SUGGESTED = [5000, 10000, 25000, 50000];

function DonorInner({ project }: { project: Project }) {
  const { contributions, refresh } = useProject();
  const [amount, setAmount] = useState(25000);
  const [name, setName] = useState("Demo Donor");
  const [impact, setImpact] = useState<DonationImpact | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const debounced = useDebounced(amount, 200);

  useEffect(() => {
    let cancelled = false;
    getDonationImpact(project.id, debounced)
      .then((r) => { if (!cancelled) { setImpact(r); setError(null); } })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : "Calculation failed"); });
    return () => { cancelled = true; };
  }, [debounced, project.id, contributions]);

  async function savePledge() {
    setSaving(true);
    setSaved(null);
    try {
      await createContribution(project.id, { contributor_name: name.trim() || "Demo Donor", contributor_type: "donor", amount });
      await refresh();
      setSaved(`Saved a PROPOSED demo pledge of ${money(amount)}. It does not reduce the secured gap until the finance lead confirms it.`);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save pledge");
    } finally {
      setSaving(false);
    }
  }

  const f = project.finance;
  const mine = contributions.filter((c) => c.contributor_type === "donor");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Donor Dashboard</h1>
        <p className="text-sm text-muted">See what a gift could close on one synthetic home. Nothing here moves real money.</p>
      </div>
      {error && <ErrorBox message={error} />}

      <Card>
        <SectionTitle title={project.name} subtitle={`${project.location_label} · ${project.status}`} />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Total project cost" value={money(f.total_cost)} hint="Synthetic assumption" />
          <Stat label="Initial financing gap" value={money(f.initial_gap)} tone="gap" />
          <Stat label="Confirmed funding" value={money(f.confirmed_additional_funding)} tone="good" hint="Committed or disbursed" />
          <Stat label="Remaining funding need" value={money(f.secured_gap)} tone="gap" hint="Secured gap" />
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle title="Contribution simulator" subtitle="Live calculation from the FastAPI engine." />
          <NumberField label="Donation amount" prefix="$" step={1000} value={amount} onChange={(v) => setAmount(Math.max(0, v))} />
          <input type="range" min={0} max={100000} step={1000} value={Math.min(amount, 100000)} aria-label="Donation amount slider" onChange={(e) => setAmount(Number(e.target.value))} className="mt-3 w-full" />
          <div className="mt-3 flex flex-wrap gap-2">
            {SUGGESTED.map((s) => (
              <Button key={s} variant={amount === s ? "primary" : "secondary"} className="px-3 py-1 text-xs" onClick={() => setAmount(s)}>{money(s)}</Button>
            ))}
          </div>
          {impact && (
            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-surface p-3"><div className="text-xs text-muted">Gap before</div><div className="text-lg font-semibold tabular-nums">{money(impact.current_scenario_gap)}</div></div>
                <div className="rounded-xl bg-teal-50 p-3"><div className="text-xs text-muted">This gift</div><div className="text-lg font-semibold tabular-nums text-teal-600">−{money(impact.amount_applied_to_gap)}</div></div>
                <div className="rounded-xl bg-surface p-3"><div className="text-xs text-muted">Projected gap</div><div className="text-lg font-semibold tabular-nums">{money(impact.projected_scenario_gap)}</div></div>
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs text-muted"><span>Contribution impact</span><span>{pct(impact.percent_of_gap, 1)} of the remaining gap</span></div>
                <ProgressBar value={impact.percent_of_gap} />
              </div>
              {impact.amount_above_gap > 0 && <Notice tone="info">{money(impact.amount_above_gap)} of this gift exceeds the remaining gap.</Notice>}
            </div>
          )}
          <div className="mt-5 border-t border-line pt-4">
            <label className="block text-sm"><span className="font-medium text-navy-800">Pledge name (fictional)</span>
              <input value={name} maxLength={80} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2" />
            </label>
            <Button className="mt-3" onClick={savePledge} loading={saving} disabled={amount <= 0}>Save Demo Pledge</Button>
            {saved && <div className="mt-3"><Notice tone="success">{saved}</Notice></div>}
          </div>
        </Card>

        <Card>
          <SectionTitle title="Impact breakdown" subtitle="PROPOSED allocation across the synthetic cost lines, not a verified expenditure." />
          {impact ? (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-line text-left text-xs uppercase text-muted"><th className="py-2">Cost line</th><th className="py-2 text-right">Share of cost</th><th className="py-2 text-right">Proposed share of gift</th></tr></thead>
              <tbody>
                {impact.lines.filter((l) => l.share_pct > 0).map((l) => (
                  <tr key={l.key} className="border-b border-line/60"><td className="py-2">{l.label}</td><td className="py-2 text-right tabular-nums">{pct(l.share_pct, 1)}</td><td className="py-2 text-right tabular-nums font-medium">{money(l.proposed_allocation)}</td></tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-sm text-muted">Calculating…</p>}
          <p className="mt-3 text-xs text-muted">{impact?.note}</p>
        </Card>
      </div>

      <Card>
        <SectionTitle title="Donor transparency" subtitle="Budget, planned allocations, funding status and demo progress." />
        <FundingStackChart stack={project.funding_stack} height={100} />
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div><div className="text-xs text-muted">Total project budget</div><div className="font-semibold">{money(f.total_cost)}</div></div>
          <div><div className="text-xs text-muted">Funding status</div><div className="text-sm">Confirmed {money(f.confirmed_additional_funding)} · Proposed {money(f.proposed_additional_funding)}</div></div>
          <div><div className="text-xs text-muted">Project progress (demo mode)</div><ProgressBar value={f.funding_coverage_percentage} secured={f.secured_coverage_percentage} /><div className="mt-1 text-xs text-muted">{pct(f.funding_coverage_percentage)} of gap covered if all proposals arrived; {pct(f.secured_coverage_percentage)} confirmed</div></div>
        </div>
        <h3 className="mb-2 mt-5 text-sm font-semibold text-navy-900">Donor pledges on this project</h3>
        <ContributionList items={mine} />
        <div className="mt-4"><Notice tone="warn">Tax deductibility depends on the qualified recipient and applicable rules. Nothing here promises a tax benefit. See the IRS overview of charitable contribution deductions and talk to a tax professional. Prototype for educational and planning purposes; not legal, tax, financial, or lending advice.</Notice></div>
      </Card>
    </div>
  );
}

export default function DonorsPage() {
  useSyncOnMount();
  return <WithProject>{(p) => <DonorInner project={p} />}</WithProject>;
}
