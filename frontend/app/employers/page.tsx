"use client";

import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { ContributionList } from "@/components/dashboard/ContributionList";
import { WithProject } from "@/components/layout/AppShell";
import { Button, Card, ErrorBox, Notice, NumberField, ProgressBar, SectionTitle, Stat } from "@/components/ui/primitives";
import { calculateConsortium, createContribution, runScenario } from "@/lib/api";
import { useDebounced, useSyncOnMount } from "@/lib/hooks";
import { useProject } from "@/lib/project-context";
import type { ConsortiumResult, Project, ScenarioResult } from "@/lib/types";
import { money, pct } from "@/lib/utils";

interface Member { id: number; name: string; amount: number }

function EmployerInner({ project }: { project: Project }) {
  const { contributions, refresh } = useProject();
  const [single, setSingle] = useState(40000);
  const [singleResult, setSingleResult] = useState<ScenarioResult | null>(null);
  const [members, setMembers] = useState<Member[]>([
    { id: 1, name: "Employer A", amount: 15000 }, { id: 2, name: "Employer B", amount: 15000 }, { id: 3, name: "Employer C", amount: 10000 },
  ]);
  const [nextId, setNextId] = useState(4);
  const [consortium, setConsortium] = useState<ConsortiumResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  const dSingle = useDebounced(single, 200);
  const dMembers = useDebounced(members, 250);

  useEffect(() => {
    let cancelled = false;
    runScenario(project.id, { proposed_employer: dSingle })
      .then((r) => { if (!cancelled) setSingleResult(r); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : "Calculation failed"); });
    return () => { cancelled = true; };
  }, [dSingle, project.id]);

  useEffect(() => {
    let cancelled = false;
    calculateConsortium(project.id, dMembers.map((m) => ({ name: m.name.trim() || "Demo employer", amount: m.amount })))
      .then((r) => { if (!cancelled) { setConsortium(r); setError(null); } })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : "Calculation failed"); });
    return () => { cancelled = true; };
  }, [dMembers, project.id, contributions]);

  async function savePledges(list: { name: string; amount: number }[]) {
    setSaving(true);
    setSaved(null);
    try {
      for (const m of list.filter((x) => x.amount > 0)) {
        await createContribution(project.id, { contributor_name: m.name.trim() || "Demo employer", contributor_type: "employer", amount: m.amount });
      }
      await refresh();
      setSaved("Saved as PROPOSED demo pledges. They count only toward the scenario gap until the finance lead confirms them.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save pledges");
    } finally {
      setSaving(false);
    }
  }

  const f = project.finance;
  const mine = contributions.filter((c) => c.contributor_type === "employer");
  const committedEmployer = project.confirmed_by_category.employer;
  const updateMember = (id: number, patch: Partial<Member>) => setMembers((ms) => ms.map((m) => (m.id === id ? { ...m, ...patch } : m)));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Employer Dashboard</h1>
        <p className="text-sm text-muted">Explore how employers could help workforce housing get built. Synthetic employers, no real commitments.</p>
      </div>
      {error && <ErrorBox message={error} />}

      <Card>
        <SectionTitle title="Supported project" subtitle={`${project.name} · ${project.location_label}`} />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Project financing gap" value={money(f.initial_gap)} tone="gap" />
          <Stat label="Employer commitments" value={money(committedEmployer)} tone="good" hint="Committed or disbursed" />
          <Stat label="Employer proposals" value={money(project.proposed_by_category.employer)} hint="Proposed/applied, hypothetical" />
          <Stat label="Homes supported (arithmetic)" value={f.initial_gap > 0 ? `${((committedEmployer + project.proposed_by_category.employer) / f.initial_gap).toFixed(2)}` : "—"} hint="Employer total ÷ this home's gap" />
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle title="Employer funding simulator" subtitle="One employer, what-if. Not saved." />
          <NumberField label="Employer contribution" prefix="$" step={1000} value={single} onChange={(v) => setSingle(Math.max(0, v))} />
          <input type="range" min={0} max={100000} step={1000} value={Math.min(single, 100000)} aria-label="Employer contribution slider" onChange={(e) => setSingle(Number(e.target.value))} className="mt-3 w-full" />
          {singleResult && (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Scenario gap" value={money(singleResult.finance.scenario_gap)} tone="warn" hint="Includes saved donor/grant proposals" />
                <Stat label="Secured gap" value={money(singleResult.finance.secured_gap)} tone="gap" hint="Unchanged by proposals" />
              </div>
              <ProgressBar value={singleResult.finance.funding_coverage_percentage} secured={singleResult.finance.secured_coverage_percentage} />
              <p className="text-xs text-muted">{pct(singleResult.finance.funding_coverage_percentage)} of the initial gap covered if all proposals arrived.</p>
            </div>
          )}
          <Button className="mt-4" variant="secondary" loading={saving} disabled={single <= 0} onClick={() => savePledges([{ name: "Demo Employer", amount: single }])}>Save as demo pledge</Button>
        </Card>

        <Card>
          <SectionTitle title="Multi-employer consortium" subtitle="Add employers, set amounts, and the backend combines them." />
          <ul className="space-y-3">
            {members.map((m) => (
              <li key={m.id} className="flex items-end gap-2">
                <label className="flex-1 text-sm"><span className="font-medium text-navy-800">Employer name (fictional)</span>
                  <input value={m.name} maxLength={80} onChange={(e) => updateMember(m.id, { name: e.target.value })} className="mt-1 w-full rounded-lg border border-line px-3 py-2" />
                </label>
                <div className="w-36"><NumberField label="Amount" prefix="$" step={1000} value={m.amount} onChange={(v) => updateMember(m.id, { amount: Math.max(0, v) })} id={`amt-${m.id}`} /></div>
                <Button variant="danger" aria-label={`Remove ${m.name}`} onClick={() => setMembers((ms) => ms.filter((x) => x.id !== m.id))}><Trash2 className="h-4 w-4" aria-hidden /></Button>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => { setMembers((ms) => [...ms, { id: nextId, name: `Employer ${String.fromCharCode(64 + nextId)}`, amount: 5000 }]); setNextId((n) => n + 1); }}>
              <Plus className="h-4 w-4" aria-hidden /> Add demo employer
            </Button>
            <Button loading={saving} disabled={!members.some((m) => m.amount > 0)} onClick={() => savePledges(members)}>Save consortium as demo pledges</Button>
          </div>
          {saved && <div className="mt-3"><Notice tone="success">{saved}</Notice></div>}
        </Card>
      </div>

      {consortium && (
        <Card>
          <SectionTitle title="Employer contribution impact" subtitle="Calculated by FastAPI for the consortium above (replaces saved employer proposals in the scenario)." />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Total employer contribution" value={money(consortium.total_employer_contribution)} tone="good" />
            <Stat label="% of funding gap covered" value={pct(consortium.employer_percent_of_initial_gap, 1)} />
            <Stat label="Remaining gap (employers only)" value={money(consortium.remaining_gap_employers_only)} tone="warn" />
            <Stat label="Combined with donor + grant proposals" value={money(consortium.combined_scenario.scenario_gap)} tone="warn" hint="Scenario gap" />
          </div>
          {consortium.combined_scenario.scenario_gap === 0 && consortium.combined_scenario.initial_gap > 0 && (
            <div className="mt-4"><Notice tone="warn">{consortium.combined_message}</Notice></div>
          )}
          <p className="mt-3 text-xs text-muted">{consortium.homes_supported_note}</p>
        </Card>
      )}

      <Card>
        <SectionTitle title="Saved employer pledges" />
        <ContributionList items={mine} />
      </Card>

      <Notice tone="info">
        <b>Employer-sponsored workforce housing.</b> Employers may help employees live closer to work by contributing to an affordable development or to
        homeownership assistance through a suitable partner. Contributions do not guarantee employee retention or commute savings, and this prototype does not
        model employment-linked eligibility rules. No verified employer-program source was found in the challenge data, so this is a lead only.
      </Notice>
    </div>
  );
}

export default function EmployersPage() {
  useSyncOnMount();
  return <WithProject>{(p) => <EmployerInner project={p} />}</WithProject>;
}
