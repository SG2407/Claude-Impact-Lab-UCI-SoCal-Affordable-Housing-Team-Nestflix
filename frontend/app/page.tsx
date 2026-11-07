"use client";

import { ArrowRight, Briefcase, Building2, HeartHandshake, Users } from "lucide-react";
import Link from "next/link";
import { FundingStackChart } from "@/components/charts/FundingStackChart";
import { FinanceMetrics } from "@/components/dashboard/FinanceMetrics";
import { WithProject } from "@/components/layout/AppShell";
import { Card, Notice, SectionTitle } from "@/components/ui/primitives";
import { useSyncOnMount } from "@/lib/hooks";

const PORTALS = [
  { href: "/builders", icon: Building2, title: "Builders", who: "Nonprofit finance lead (primary user)", text: "See the gap, match funding leads, simulate donor/employer/grant money and generate a strategy." },
  { href: "/donors", icon: HeartHandshake, title: "Donors", who: "Individuals and funders", text: "See what a gift could close against the one-home bill, then save a demo pledge." },
  { href: "/buyers", icon: Users, title: "Buyers", who: "Synthetic household", text: "Check affordability and watch mortgage rates move the price a family can pay, and the gap with it." },
  { href: "/employers", icon: Briefcase, title: "Employers", who: "Workforce housing sponsors", text: "Pool demo contributions from several employers and see the combined effect on the gap." },
];

export default function Overview() {
  useSyncOnMount();
  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl bg-navy-900 px-6 py-10 text-white shadow-sm sm:px-10 sm:py-14">
        <p className="text-sm font-medium uppercase tracking-widest text-teal-100">NestFlix · Fund It lane</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-bold leading-tight sm:text-5xl">Affordable housing funding, simplified.</h1>
        <p className="mt-3 max-w-2xl text-lg text-teal-100">Bridging the Gap Between Housing Dreams and Funding Reality.</p>
        <p className="mt-4 max-w-2xl text-sm text-slate-300">
          NestFlix helps affordable housing developers discover, combine and evaluate funding sources, and shows how donors and
          employers could close the affordability gap, while keeping proposed money separate from confirmed money.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/builders" className="inline-flex items-center gap-2 rounded-lg bg-teal-500 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-teal-600">
            Explore Demo Project <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link href="/sources" className="inline-flex items-center rounded-lg border border-white/30 px-5 py-3 text-sm font-medium text-white hover:bg-white/10">
            Sources &amp; Assumptions
          </Link>
        </div>
      </section>

      <WithProject>
        {(p) => (
          <>
            <Card>
              <SectionTitle title={p.name} subtitle="SYNTHETIC one-home example deal. Every figure is an ASSUMPTION. Calculated by the FastAPI backend." />
              <FinanceMetrics f={p.finance} />
            </Card>
            <Card>
              <SectionTitle title="Financing composition" subtitle="Buyer price, public subsidies, earned revenue, donor/employer/grant funding and what is still missing." />
              <FundingStackChart stack={p.funding_stack} />
            </Card>
          </>
        )}
      </WithProject>

      <section aria-labelledby="portals">
        <h2 id="portals" className="mb-3 text-lg font-semibold text-navy-900">Four portals, one shared project</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PORTALS.map(({ href, icon: Icon, title, who, text }) => (
            <Link key={href} href={href} className="group rounded-2xl border border-line bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-500 hover:shadow-md">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-50 text-teal-600"><Icon className="h-5 w-5" aria-hidden /></span>
              <h3 className="mt-3 font-semibold text-navy-900">{title}</h3>
              <p className="text-xs font-medium text-teal-600">{who}</p>
              <p className="mt-2 text-sm text-muted">{text}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-navy-800">Open <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" aria-hidden /></span>
            </Link>
          ))}
        </div>
      </section>

      <Notice tone="warn">
        <b>Assumptions disclaimer.</b> The demo project, household, donors and employers are synthetic. Proposed, applied-for, committed and disbursed funding are
        tracked separately; only committed or disbursed funding reduces the secured gap. Prototype for educational and planning purposes. Not legal, tax, financial, or lending advice.
      </Notice>
    </div>
  );
}
