"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { StackSegment } from "@/lib/types";
import { money } from "@/lib/utils";

const COLORS: Record<string, string> = {
  buyer: "#12294a",
  subsidies: "#1c3a63",
  earned: "#4a6a94",
  remaining_gap: "#e11d48",
  surplus: "#a3a3a3",
};
const CAT_CONFIRMED: Record<string, string> = { donor: "#0f8f86", employer: "#0b7a72", grant: "#3dbb7e", other: "#2f9e6b" };

export function segmentColor(seg: StackSegment): string {
  if (COLORS[seg.key]) return COLORS[seg.key];
  const [state, cat] = seg.key.split("_");
  const base = CAT_CONFIRMED[cat] ?? "#14a89d";
  return state === "proposed" ? `${base}66` : base; // proposed = translucent
}

export function FundingStackChart({ stack, height = 120 }: { stack: StackSegment[]; height?: number }) {
  const visible = stack.filter((s) => s.amount > 0);
  const row: Record<string, number | string> = { name: "Funding" };
  visible.forEach((s) => (row[s.key] = s.amount));

  return (
    <div>
      <div role="img" aria-label={`Funding stack: ${visible.map((s) => `${s.label} ${money(s.amount)}`).join(", ")}`}>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={[row]} layout="vertical" margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <XAxis type="number" tickFormatter={(v) => `$${Math.round(Number(v) / 1000)}k`} fontSize={12} />
            <YAxis type="category" dataKey="name" hide />
            <Tooltip
              formatter={(v, name) => [money(Number(v)), visible.find((s) => s.key === name)?.label ?? String(name)]}
              cursor={{ fill: "rgba(20,168,157,0.06)" }}
            />
            {visible.map((s) => (
              <Bar
                key={s.key} dataKey={s.key} stackId="a" fill={segmentColor(s)} isAnimationActive={false}
                stroke={s.status === "proposed" ? "#0f8f86" : undefined} strokeDasharray={s.status === "proposed" ? "4 2" : undefined}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        {visible.map((s) => (
          <li key={s.key} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-sm border" style={{ background: segmentColor(s), borderColor: s.status === "proposed" ? "#0f8f86" : "transparent", borderStyle: s.status === "proposed" ? "dashed" : "solid" }} />
              {s.label}
            </span>
            <span className="tabular-nums font-medium">{money(s.amount)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted">Solid teal/green = confirmed (committed or disbursed). Dashed light = proposed or applied-for, hypothetical until committed. Buyer price, subsidies and earned revenue are synthetic assumptions.</p>
    </div>
  );
}
