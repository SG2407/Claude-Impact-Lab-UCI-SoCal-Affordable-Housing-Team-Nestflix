"use client";

import { CartesianGrid, Line, LineChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { money } from "@/lib/utils";

export interface RatePoint { rate: number; price: number }

export function RateChart({ points, current }: { points: RatePoint[]; current?: RatePoint }) {
  return (
    <div role="img" aria-label="Affordable purchase price by mortgage rate" className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e3e9f0" />
          <XAxis dataKey="rate" tickFormatter={(v) => `${Number(v).toFixed(1)}%`} fontSize={12} />
          <YAxis tickFormatter={(v) => `$${Math.round(Number(v) / 1000)}k`} fontSize={12} domain={["auto", "auto"]} width={52} />
          <Tooltip formatter={(v) => money(Number(v))} labelFormatter={(l) => `Rate ${Number(l).toFixed(2)}%`} />
          <Line type="monotone" dataKey="price" stroke="#0f8f86" strokeWidth={2.5} dot={false} isAnimationActive={false} name="Affordable price" />
          {current && <ReferenceDot x={current.rate} y={current.price} r={6} fill="#e11d48" stroke="white" />}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
