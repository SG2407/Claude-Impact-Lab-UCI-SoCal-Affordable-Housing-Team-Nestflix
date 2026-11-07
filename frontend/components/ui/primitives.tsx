"use client";

import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, children, id }: { className?: string; children: ReactNode; id?: string }) {
  return (
    <section id={id} className={cn("rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6", className)}>
      {children}
    </section>
  );
}

export function SectionTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold text-navy-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function Stat({
  label, value, hint, tone = "default",
}: { label: string; value: string; hint?: string; tone?: "default" | "gap" | "good" | "warn" }) {
  const tones = {
    default: "text-navy-900",
    gap: "text-rose-700",
    good: "text-teal-600",
    warn: "text-amber-700",
  };
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
      <div className={cn("mt-1 text-2xl font-semibold tabular-nums", tones[tone])}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}

export function Button({
  variant = "primary", className, loading, children, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger"; loading?: boolean }) {
  const styles = {
    primary: "bg-teal-600 text-white hover:bg-teal-500 shadow-sm",
    secondary: "border border-line bg-white text-navy-900 hover:bg-teal-50",
    ghost: "text-navy-700 hover:bg-teal-50",
    danger: "border border-rose-200 bg-white text-rose-700 hover:bg-rose-50",
  };
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        styles[variant], className,
      )}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

const BADGE = {
  gray: "bg-slate-100 text-slate-700",
  teal: "bg-teal-100 text-teal-600",
  green: "bg-mint-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-800",
  rose: "bg-rose-100 text-rose-700",
  navy: "bg-navy-900 text-white",
};
export function Badge({ tone = "gray", children, className }: { tone?: keyof typeof BADGE; children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", BADGE[tone], className)}>{children}</span>;
}

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-2 py-8 text-sm text-muted">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {label}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
      <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
      <span className="flex-1">{message}</span>
      {onRetry && <Button variant="danger" onClick={onRetry}>Retry</Button>}
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "success" | "warn"; children: ReactNode }) {
  const t = {
    info: "border-teal-100 bg-teal-50 text-navy-800",
    success: "border-emerald-200 bg-mint-100 text-emerald-900",
    warn: "border-amber-200 bg-amber-50 text-amber-900",
  };
  return (
    <div role="status" className={cn("flex gap-2 rounded-xl border p-3 text-sm", t[tone])}>
      {tone === "success" && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
      <div>{children}</div>
    </div>
  );
}

export function NumberField({
  label, value, onChange, prefix, suffix, step = 1, min = 0, max, hint, id,
}: {
  label: string; value: number; onChange: (v: number) => void; prefix?: string; suffix?: string;
  step?: number; min?: number; max?: number; hint?: string; id?: string;
}) {
  const inputId = id ?? label.replace(/\W+/g, "-").toLowerCase();
  return (
    <label htmlFor={inputId} className="block text-sm">
      <span className="font-medium text-navy-800">{label}</span>
      <div className="mt-1 flex items-center rounded-lg border border-line bg-white focus-within:border-teal-500">
        {prefix && <span className="pl-3 text-muted">{prefix}</span>}
        <input
          id={inputId}
          type="number"
          inputMode="decimal"
          value={Number.isFinite(value) ? value : ""}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
          className="w-full bg-transparent px-3 py-2 tabular-nums outline-none"
        />
        {suffix && <span className="pr-3 text-muted">{suffix}</span>}
      </div>
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function SourceNote({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-xs text-muted">{children}</p>;
}

export function ProgressBar({ value, secured }: { value: number; secured?: number }) {
  const v = Math.min(100, Math.max(0, value));
  const s = secured == null ? 0 : Math.min(v, Math.max(0, secured));
  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100}>
      <div className="relative h-full" style={{ width: `${v}%` }}>
        <div className="absolute inset-0 bg-teal-100" />
        <div className="absolute inset-y-0 left-0 bg-teal-600" style={{ width: v ? `${(s / v) * 100}%` : 0 }} />
      </div>
    </div>
  );
}
