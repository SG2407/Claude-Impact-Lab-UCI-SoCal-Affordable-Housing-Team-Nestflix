"use client";

import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { FundingStackChart } from "@/components/charts/FundingStackChart";
import { ContributionList } from "@/components/dashboard/ContributionList";
import { FinanceMetrics } from "@/components/dashboard/FinanceMetrics";
import { ProgramCard } from "@/components/funding/ProgramCard";
import { StrategyPanel } from "@/components/funding/StrategyPanel";
import { WithProject } from "@/components/layout/AppShell";
import { Button, Card, ErrorBox, Notice, NumberField, ProgressBar, SectionTitle, Spinner, Stat } from "@/components/ui/primitives";
import { getFundingPrograms, resetContributions, resetCosts, runScenario, saveCosts } from "@/lib/api";
import { useDebounced, useSyncOnMount } from "@/lib/hooks";
import { useProject } from "@/lib/project-context";
import type { FundingProgram, Project, ScenarioResult } from "@/lib/types";
import { SCENARIO_FUNDED_MESSAGE, money, pct } from "@/lib/utils";

function BuilderInner({ project }: { project: Project }) {
  const { contributions, refresh, setProject } = useProject();
  const savedCosts = useMemo(() => Object.fromEntries(project.cost_items.map((i) => [i.key, i.amount])), [project.cost_items]);
  const [costs, setCosts] = useState<Record<string, number>>(savedCosts);
  const [sim, setSim] = useState({
    donor: project.proposed_by_category.donor, employer: project.proposed_by_category.employer,
    grant: project.proposed_by_category.grant,
  });
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [programs, setPrograms] = useState<FundingProgram[] | null>(null);
  const [progLoading, setProgLoading] = useState(false);

  const pending = useMemo(() => ({ costs, sim }), [costs, sim]);
  const debounced = useDebounced(pending, 250);
  const calculating = debounced !== pending;
  useEffect(() => {
    let cancelled = false;
    runScenario(project.id, {
      cost_items: debounced.costs,
      proposed_donor: debounced.sim.donor, proposed_employer: debounced.sim.employer, proposed_grant: debounced.sim.grant,
    })
      .then((r) => { if (!cancelled) { setResult(r); setError(null); } })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : "Calculation failed"); })

    return () => { cancelled = true; };
  }, [debounced, project.id]);

  const finance = result?.finance ?? project.finance;
  const stack = result?.funding_stack ?? project.funding_stack;
  const proposedTotal = sim.donor + sim.employer + sim.grant + project.proposed_by_category.other;
  const costsDirty = JSON.stringify(costs) !== JSON.stringify(savedCosts);

  async function onSaveCosts() {
    try { setProject(await saveCosts(project.id, costs)); setNotice("Cost changes saved to the shared demo project."); }
    catch (e) { setError(e instanceof Error ? e.message : "Save failed"); }
  }
  async function onResetCosts() {
    try { const p = await resetCosts(project.id); setProject(p); setCosts(Object.fromEntries(p.cost_items.map((i) => [i.key, i.amount]))); setNotice("Costs reset to the synthetic example values."); }
    catch (e) { setError(e instanceof Error ? e.message : "Reset failed"); }
  }
  async function onResetPledges() {
    try { await resetContributions(project.id); await refresh(); setNotice("All demo contributions removed."); }
    catch (e) { setError(e instanceof Error ? e.message : "Reset failed"); }
  }
  async function findFunding() {
    setProgLoading(true);
    try { setPrograms(await getFundingPrograms("developer")); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load programs"); }
    finally { setProgLoading(false); }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Builder Dashboard</h1>
        <p className="text-sm text-muted">For the nonprofit finance lead: does it pencil, and who closes the gap?</p>
      </div>
      {error && <ErrorBox message={error} />}
      {notice && <Notice tone="success">{notice}</Notice>}

      <Card>
        <SectionTitle title={project.name} subtitle={project.description} />
        <div className="mb-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div><span className="text-muted">Location: </span>{project.location_label}</div>
          <div><span className="text-muted">Homes: </span>{project.units}</div>
          <div><span className="text-muted">Type: </span>{project.housing_type}</div>
          <div><span className="text-muted">Status: </span>{project.status}</div>
        </div>
        <FinanceMetrics f={finance} />
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Stat label="Affordable buyer price" value={money(project.affordable_purchase_price)} hint="ASSUMPTION (fixed by income)" />
          <Stat label="Existing public subsidies" value={money(project.existing_public_subsidies)} hint="ASSUMPTION (placeholder funds, not real programs)" />
          <Stat label="Earned revenue" value={money(project.earned_revenue)} hint="ASSUMPTION" />
        </div>
        {finance.scenario_gap === 0 && finance.initial_gap > 0 && <div className="mt-4"><Notice tone="warn">{result?.scenario_message ?? SCENARIO_FUNDED_MESSAGE}</Notice></div>}
        {finance.funding_surplus > 0 && <div className="mt-4"><Notice tone="info">Funding surplus of {money(finance.funding_surplus)} above cost (not shown as a negative gap).</Notice></div>}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle title="Cost breakdown" subtitle="Edit a line: totals recalculate through the backend. Not saved until you press Save." />
          <div className="grid gap-3 sm:grid-cols-2">
            {project.cost_items.map((i) => (
              <NumberField key={i.key} label={i.label} prefix="$" step={1000} value={costs[i.key] ?? 0}
                onChange={(v) => setCosts((c) => ({ ...c, [i.key]: Math.max(0, v) }))} hint={i.lane ? `${i.lane} · ${i.label_status}` : i.label_status} />
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button onClick={onSaveCosts} disabled={!costsDirty}>Save costs</Button>
            <Button variant="secondary" onClick={onResetCosts}>Reset to synthetic values</Button>
            <span className="ml-auto text-sm font-semibold tabular-nums">Total: {money(finance.total_cost)} {calculating && <span className="text-xs font-normal text-muted">recalculating…</span>}</span>
          </div>
        </Card>

        <Card>
          <SectionTitle title="Funding simulator" subtitle="What-if amounts, not saved. Starts from saved pledges. Proposed funding is hypothetical." />
          <div className="space-y-4">
            {([["donor", "Donor contribution"], ["employer", "Employer contribution"], ["grant", "Additional grant (hypothetical)"]] as const).map(([k, label]) => (
              <div key={k}>
                <NumberField label={label} prefix="$" step={1000} value={sim[k]} onChange={(v) => setSim((s) => ({ ...s, [k]: Math.max(0, v) }))} />
                <input type="range" min={0} max={100000} step={1000} value={Math.min(sim[k], 100000)} aria-label={`${label} slider`}
                  onChange={(e) => setSim((s) => ({ ...s, [k]: Number(e.target.value) }))} className="mt-2 w-full" />
              </div>
            ))}
          </div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-muted"><span>Proposed funding {money(proposedTotal)}</span><span>{pct(finance.funding_coverage_percentage)} of the initial gap covered (if all arrived)</span></div>
            <ProgressBar value={finance.funding_coverage_percentage} secured={finance.secured_coverage_percentage} />
            <p className="mt-1 text-xs text-muted">Dark = confirmed ({pct(finance.secured_coverage_percentage)}). Light = proposed, not yet secured.</p>
          </div>
          <Button variant="ghost" className="mt-3" onClick={() => setSim({ donor: project.proposed_by_category.donor, employer: project.proposed_by_category.employer, grant: project.proposed_by_category.grant })}>Reset to saved pledges</Button>
        </Card>
      </div>

      <Card>
        <SectionTitle title="Funding stack" subtitle="Confirmed and proposed money are shown separately." />
        <FundingStackChart stack={stack} />
      </Card>

      <Card>
        <SectionTitle
          title="Funding Matcher"
          subtitle="Sourced candidate programs ranked by rule-based relevance. Leads only: nothing here is approved or confirmed available."
          right={<Button onClick={findFunding} loading={progLoading}><Search className="h-4 w-4" aria-hidden /> Find Funding Opportunities</Button>}
        />
        {progLoading && <Spinner />}
        {!programs && !progLoading && <p className="text-sm text-muted">Click “Find Funding Opportunities” to match the project against the sourced program list.</p>}
        {programs && (
          <div className="grid gap-4 lg:grid-cols-2">
            {programs.map((p) => <ProgramCard key={p.id} p={p} />)}
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle title="Contribution records" subtitle="Pledges stay proposed until you explicitly confirm them. Only committed or disbursed money reduces the secured gap."
          right={contributions.length > 0 ? <Button variant="danger" onClick={onResetPledges}>Clear demo contributions</Button> : undefined} />
        <ContributionList items={contributions} editable />
      </Card>

      <StrategyPanel project={project} proposed={sim} />
    </div>
  );
}

export default function BuildersPage() {
  useSyncOnMount();
  return (
    <WithProject>
      {(p) => <BuilderInner key={JSON.stringify(p.proposed_by_category) + JSON.stringify(p.cost_items.map((c) => c.amount))} project={p} />}
    </WithProject>
  );
}
