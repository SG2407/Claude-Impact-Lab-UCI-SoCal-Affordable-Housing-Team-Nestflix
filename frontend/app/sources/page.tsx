"use client";

import { ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge, Card, ErrorBox, SectionTitle, Spinner } from "@/components/ui/primitives";
import { getFundingPrograms } from "@/lib/api";
import type { FundingProgram } from "@/lib/types";
import { DISCLAIMER } from "@/lib/utils";

const REFERENCES = [
  ["HCD 2026 State Income Limits (revised June 23, 2026; replaces the May 29, 2026 version)", "https://www.hcd.ca.gov/sites/default/files/docs/grants-and-funding/income-limits-2026.pdf"],
  ["HCD 2026 State HOME Income Limits (effective June 1, 2026)", "https://www.hcd.ca.gov/sites/default/files/docs/grants-and-funding/2026-california-HOME-income-limits_0.pdf"],
  ["CA Health and Safety Code 50052.5 (owner affordable housing cost)", "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=HSC&sectionNum=50052.5"],
  ["FRED MORTGAGE30US: Freddie Mac 30-year rate, 7.18% on 2026-11-05", "https://fred.stlouisfed.org/series/MORTGAGE30US"],
  ["IRS: charitable contribution deductions", "https://www.irs.gov/charities-non-profits/charitable-organizations/charitable-contribution-deductions"],
];

const REAL = ["Working calculations (Python financial engine, unit-tested)", "Working API and SQLite persistence", "Funding-program descriptions and URLs copied from the event's DATA-SOURCES.md (checked 2026-11-06)"];
const SYNTHETIC = ["The demo project and every cost, price, subsidy and earned-revenue figure (from the event's synthetic-example-deal.json)", "The demo household, donors and employers", "Any proposed pledge or scenario, including the $25,000 / $40,000 / $30,000 example"];
const UNKNOWN = ["Whether any program has funds available now, its award size or its deadlines", "Whether any real financing is approved or can legally be combined", "A real household's eligibility", "Actual project completion costs"];
const DERIVED = [
  "Initial gap = max(0, total cost − buyer price − public subsidies − earned revenue)",
  "Secured gap = max(0, initial gap − committed/disbursed additional funding)",
  "Scenario gap = max(0, secured gap − proposed/applied funding) (hypothetical)",
  "Rate sensitivity: baseline monthly P&I held constant; loan re-solved at the new rate; price = loan ÷ (1 − down payment %)",
  "Affordability: price = max loan + down payment; max housing ratio (30%) and total debt ratio (43%) are ASSUMPTIONS",
];

function List({ items }: { items: string[] }) {
  return <ul className="list-disc space-y-1 pl-5 text-sm text-ink">{items.map((i) => <li key={i}>{i}</li>)}</ul>;
}

export default function SourcesPage() {
  const [programs, setPrograms] = useState<FundingProgram[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { getFundingPrograms().then(setPrograms).catch((e) => setError(e instanceof Error ? e.message : "Failed to load")); }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Sources &amp; Assumptions</h1>
        <p className="text-sm text-muted">What is real, what is synthetic, and what is unknown. {DISCLAIMER}</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card><SectionTitle title="REAL" /><List items={REAL} /></Card>
        <Card><SectionTitle title="SYNTHETIC" /><List items={SYNTHETIC} /></Card>
        <Card><SectionTitle title="UNKNOWN" /><List items={UNKNOWN} /></Card>
      </div>
      <Card>
        <SectionTitle title="Synthetic example deal" subtitle="Attribution" />
        <p className="text-sm text-ink">The demo project comes from the event&apos;s <code>lanes/3-fund-it/data/synthetic-example-deal.json</code>: a made-up deal, not a real project, building, city, program or buyer. Every number is a rounded ASSUMPTION and must not be cited as a benchmark.</p>
      </Card>
      <Card>
        <SectionTitle title="How figures are derived" />
        <List items={DERIVED} />
      </Card>
      <Card>
        <SectionTitle title="Reference sources" subtitle="Checked by the event organizers on 2026-11-06 (per DATA-SOURCES.md). NestFlix did not re-fetch them. Income limits are revised mid-year: read the source before relying on a figure." />
        <ul className="space-y-2 text-sm">
          {REFERENCES.map(([label, url]) => (
            <li key={url}><a href={url} target="_blank" rel="noreferrer" className="inline-flex items-start gap-1 font-medium text-teal-600 hover:underline">{label}<ExternalLink className="mt-1 h-3 w-3 shrink-0" aria-hidden /></a></li>
          ))}
        </ul>
      </Card>
      <Card>
        <SectionTitle title="Funding program records" subtitle="All are leads. Availability is not confirmed for any of them." />
        {error && <ErrorBox message={error} />}
        {!programs && !error && <Spinner />}
        {programs && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead><tr className="border-b border-line text-xs uppercase text-muted"><th className="py-2">Program</th><th>Provider</th><th>Verification</th><th>Last verified</th><th>Availability</th><th>Source</th></tr></thead>
              <tbody>
                {programs.map((p) => (
                  <tr key={p.id} className="border-b border-line/60 align-top">
                    <td className="py-2 pr-2 font-medium text-navy-900">{p.name} {p.synthetic && <Badge>synthetic</Badge>}</td>
                    <td className="pr-2">{p.provider}</td>
                    <td className="pr-2 text-xs">{p.verification_status}</td>
                    <td className="pr-2">{p.last_verified ?? "unknown"}</td>
                    <td className="pr-2 text-xs">{p.availability_status}</td>
                    <td>{p.source_url ? <a className="text-teal-600 hover:underline" href={p.source_url} target="_blank" rel="noreferrer">link</a> : "none"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
