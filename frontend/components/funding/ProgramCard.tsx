import { ExternalLink } from "lucide-react";
import type { FundingProgram } from "@/lib/types";
import { Badge } from "../ui/primitives";

const TONE: Record<string, "green" | "amber" | "rose"> = {
  "Possibly eligible": "green",
  "More information required": "amber",
  "Not matched under known rules": "rose",
};

export function ProgramCard({ p }: { p: FundingProgram }) {
  return (
    <article className="flex flex-col rounded-xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-navy-900">{p.name}</h3>
          <p className="text-xs text-muted">{p.provider}</p>
        </div>
        <Badge tone={TONE[p.match_status] ?? "gray"}>{p.match_status}</Badge>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge tone="teal">{p.funding_kind.replace("_", " ")}</Badge>
        <Badge tone={p.verification_status.toUpperCase().startsWith("VERIFIED") ? "green" : "amber"}>{p.verification_status.split("(")[0].trim()}</Badge>
        {p.synthetic && <Badge tone="gray">Synthetic placeholder</Badge>}
      </div>
      <p className="mt-2 text-sm text-ink">{p.description}</p>
      <dl className="mt-3 space-y-1.5 text-xs text-muted">
        <div><dt className="inline font-medium text-navy-800">Availability: </dt><dd className="inline">{p.availability_status}</dd></div>
        <div><dt className="inline font-medium text-navy-800">Maximum funding: </dt><dd className="inline">{p.maximum_funding_if_verified ?? "Unknown (not stated in our sources)"}</dd></div>
        <div><dt className="inline font-medium text-navy-800">Who may qualify: </dt><dd className="inline">{p.eligibility_notes}</dd></div>
        <div><dt className="inline font-medium text-navy-800">Restrictions: </dt><dd className="inline">{p.restrictions}</dd></div>
        {p.excluded_reason && <div><dt className="inline font-medium text-rose-700">Excluded because: </dt><dd className="inline">{p.excluded_reason}</dd></div>}
        {p.why_it_may_fit.length > 0 && <div><dt className="inline font-medium text-navy-800">Why it may fit: </dt><dd className="inline">{p.why_it_may_fit.join("; ")}</dd></div>}
      </dl>
      <details className="mt-2 text-xs text-muted">
        <summary className="cursor-pointer font-medium text-navy-800">Unresolved checks ({p.unresolved_checks.length})</summary>
        <ul className="mt-1 list-disc space-y-0.5 pl-4">{p.unresolved_checks.map((c) => <li key={c}>{c}</li>)}</ul>
      </details>
      <div className="mt-3 flex items-center justify-between border-t border-line pt-2 text-xs text-muted">
        {p.source_url ? (
          <a href={p.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-teal-600 hover:underline">
            Source <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
        ) : <span>No verified source URL</span>}
        <span>Last verified: {p.last_verified ?? "unknown"} (per event DATA-SOURCES.md)</span>
      </div>
    </article>
  );
}
