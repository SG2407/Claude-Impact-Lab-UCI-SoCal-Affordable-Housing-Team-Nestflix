"use client";

import { Home, Landmark, Building2, HeartHandshake, Briefcase, BookOpen, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { DISCLAIMER, cn } from "@/lib/utils";
import { useProject } from "@/lib/project-context";
import { ErrorBox, Spinner } from "../ui/primitives";

export const NAV = [
  { href: "/", label: "Overview", icon: Home },
  { href: "/builders", label: "Builder Dashboard", icon: Building2 },
  { href: "/donors", label: "Donor Dashboard", icon: HeartHandshake },
  { href: "/buyers", label: "Buyer Dashboard", icon: Users },
  { href: "/employers", label: "Employer Dashboard", icon: Briefcase },
  { href: "/sources", label: "Sources & Assumptions", icon: BookOpen },
];

export function Logo({ light }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-teal-600 text-white"><Landmark className="h-4 w-4" aria-hidden /></span>
      <span className={cn("text-lg font-bold tracking-tight", light ? "text-white" : "text-navy-900")}>
        Nest<span className="text-teal-500">Flix</span>
      </span>
    </span>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/" aria-label="NestFlix home"><Logo /></Link>
          <nav aria-label="Main" className="order-3 -mx-1 flex w-full gap-1 overflow-x-auto lg:order-none lg:w-auto lg:flex-1">
            {NAV.map(({ href, label }) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href} href={href} aria-current={active ? "page" : undefined}
                  className={cn("whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition",
                    active ? "bg-navy-900 text-white" : "text-navy-700 hover:bg-teal-50")}
                >
                  {label.replace(" Dashboard", "")}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">Demo Mode — Synthetic Data</span>
            <label className="flex items-center gap-2 text-sm text-muted">
              <span className="hidden sm:inline">Demo role</span>
              <select
                aria-label="Demo role switcher"
                className="rounded-lg border border-line bg-white px-2 py-1.5 text-sm text-navy-900"
                value={NAV.find((n) => n.href !== "/" && pathname.startsWith(n.href))?.href ?? "/"}
                onChange={(e) => router.push(e.target.value)}
              >
                <option value="/">Overview</option>
                <option value="/builders">Builder (finance lead)</option>
                <option value="/donors">Donor</option>
                <option value="/buyers">Buyer</option>
                <option value="/employers">Employer</option>
              </select>
            </label>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:py-8">{children}</main>
      <footer className="border-t border-line bg-white">
        <div className="mx-auto max-w-7xl px-4 py-5 text-xs text-muted">
          <p className="font-medium text-navy-800">{DISCLAIMER}</p>
          <p className="mt-1">All project, household, donor and employer data is SYNTHETIC. No applications are filed, no money moves, and nothing is sent to any agency.</p>
        </div>
      </footer>
    </div>
  );
}

/** Renders children only once the shared project has loaded. */
export function WithProject({ children }: { children: (p: NonNullable<ReturnType<typeof useProject>["project"]>) => ReactNode }) {
  const { project, loading, error, refresh } = useProject();
  if (loading) return <Spinner label="Loading demo project from the API…" />;
  if (error || !project) return <ErrorBox message={error ?? "Project unavailable"} onRetry={() => void refresh()} />;
  return <>{children(project)}</>;
}
