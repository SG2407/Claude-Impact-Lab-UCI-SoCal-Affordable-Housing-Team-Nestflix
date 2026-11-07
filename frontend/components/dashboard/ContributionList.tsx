"use client";

import { useState } from "react";
import { deleteContribution, updateContributionStatus } from "@/lib/api";
import { useProject } from "@/lib/project-context";
import type { Contribution, Status } from "@/lib/types";
import { money } from "@/lib/utils";
import { Badge, Button, ErrorBox } from "../ui/primitives";

const STATUS_TONE: Record<Status, "gray" | "amber" | "teal" | "green"> = {
  proposed: "gray", applied: "amber", committed: "teal", disbursed: "green",
};
const NEXT: Record<Status, Status[]> = { proposed: ["applied", "committed"], applied: ["committed"], committed: ["disbursed"], disbursed: [] };

export function ContributionList({ items, editable }: { items: Contribution[]; editable?: boolean }) {
  const { refresh } = useProject();
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(id: number, fn: () => Promise<unknown>) {
    setBusy(id);
    setError(null);
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  if (!items.length) return <p className="rounded-xl border border-dashed border-line p-4 text-sm text-muted">No demo contributions yet. Save a pledge from the Donor or Employer dashboard.</p>;

  return (
    <div className="space-y-2">
      {error && <ErrorBox message={error} />}
      <ul className="divide-y divide-line rounded-xl border border-line">
        {items.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
            <div className="min-w-0 flex-1">
              <div className="font-medium text-navy-900">{c.contributor_name} <span className="font-normal text-muted">· {c.funding_category}</span></div>
              <div className="text-xs text-muted">Synthetic · {new Date(c.created_at).toLocaleString()}</div>
            </div>
            <span className="tabular-nums font-semibold">{money(c.amount)}</span>
            <Badge tone={STATUS_TONE[c.status]}>{c.status}</Badge>
            {editable && (
              <div className="flex gap-1.5">
                {NEXT[c.status].map((s) => (
                  <Button key={s} variant="secondary" className="px-2.5 py-1 text-xs" loading={busy === c.id}
                    onClick={() => run(c.id, () => updateContributionStatus(c.project_id, c.id, s))}>
                    Mark {s}
                  </Button>
                ))}
                {(c.status === "proposed" || c.status === "applied") && (
                  <Button variant="danger" className="px-2.5 py-1 text-xs" disabled={busy === c.id}
                    onClick={() => run(c.id, () => deleteContribution(c.project_id, c.id))}>Remove</Button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
