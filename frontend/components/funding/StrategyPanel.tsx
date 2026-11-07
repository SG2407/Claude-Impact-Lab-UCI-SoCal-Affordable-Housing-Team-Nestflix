"use client";

import { Download, Sparkles } from "lucide-react";
import { useState } from "react";
import { generateFundingStrategy, reportUrl } from "@/lib/api";
import type { Project, StrategyResponse } from "@/lib/types";
import { money } from "@/lib/utils";
import { FundingStackChart } from "../charts/FundingStackChart";
import { Badge, Button, Card, ErrorBox, Notice, SectionTitle } from "../ui/primitives";

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-navy-900">{title}</h4>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink">{items.map((i) => <li key={i}>{i}</li>)}</ul>
    </div>
  );
}

export function StrategyPanel({ project, proposed }: { project: Project; proposed?: { donor?: number; employer?: number; grant?: number } }) {
  const [data, setData] = useState<StrategyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      setData(await generateFundingStrategy({
        project_id: project.id,
        proposed_donor: proposed?.donor ?? null,
        proposed_employer: proposed?.employer ?? null,
        proposed_grant: proposed?.grant ?? null,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate strategy");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card id="strategy">
      <SectionTitle
        title="Funding strategy & impact report"
        subtitle="Built from backend-calculated figures. Uses Claude only if an API key is configured; otherwise a clearly labelled rule-based report."
        right={
          <div className="flex gap-2">
            <Button onClick={generate} loading={loading}><Sparkles className="h-4 w-4" aria-hidden /> Generate Funding Strategy</Button>
            <a href={reportUrl(project.id)} className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-sm font-medium text-navy-900 hover:bg-teal-50">
              <Download className="h-4 w-4" aria-hidden /> Download report (.md)
            </a>
          </div>
        }
      />
      {error && <ErrorBox message={error} />}
      {!data && !error && <p className="text-sm text-muted">Click “Generate Funding Strategy” to produce a summary, candidate programs, missing information, risks and next steps.</p>}
      {data && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={data.generation_mode === "claude" ? "navy" : "amber"}>
              {data.generation_mode === "claude" ? `Claude analysis${data.model ? ` (${data.model})` : ""}` : "Rule-based analysis"}
            </Badge>
            <span className="text-xs text-muted">{data.generation_note}</span>
          </div>
          <p className="text-sm leading-relaxed text-ink">{data.summary}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-surface p-3 text-sm"><div className="text-xs text-muted">Initial gap</div><b>{money(data.finance.initial_gap)}</b></div>
            <div className="rounded-xl bg-surface p-3 text-sm"><div className="text-xs text-muted">Remaining secured gap</div><b>{money(data.finance.secured_gap)}</b></div>
            <div className="rounded-xl bg-surface p-3 text-sm"><div className="text-xs text-muted">Scenario gap (hypothetical)</div><b>{money(data.finance.scenario_gap)}</b></div>
          </div>
          <FundingStackChart stack={data.funding_stack} height={90} />
          <div>
            <h4 className="text-sm font-semibold text-navy-900">Candidate funding opportunities (leads, not approvals)</h4>
            <ul className="mt-2 grid gap-2 md:grid-cols-2">
              {data.opportunities.map((o) => (
                <li key={o.id} className="rounded-xl border border-line p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-navy-900">{o.name}</span>
                    <Badge tone={o.match_status === "Possibly eligible" ? "green" : "amber"}>{o.match_status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted">{o.rationale}</p>
                  {o.source_url && <a className="mt-1 inline-block text-xs font-medium text-teal-600 hover:underline" href={o.source_url} target="_blank" rel="noreferrer">Source</a>}
                </li>
              ))}
            </ul>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <List title="Missing eligibility information" items={data.missing_information} />
            <List title="Risks & restrictions" items={data.risks} />
            <List title="Recommended next actions" items={data.next_steps} />
            <List title="Assumptions" items={data.assumptions} />
          </div>
          <Notice tone="warn">{data.disclaimer}</Notice>
        </div>
      )}
    </Card>
  );
}
