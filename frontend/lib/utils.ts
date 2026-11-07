import clsx, { type ClassValue } from "clsx";

export const cn = (...inputs: ClassValue[]) => clsx(inputs);

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const usd2 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

export const money = (n: number | null | undefined) => (n == null ? "Unknown" : usd.format(n));
export const money2 = (n: number | null | undefined) => (n == null ? "Unknown" : usd2.format(n));
export const pct = (n: number | null | undefined, digits = 0) => (n == null ? "Unknown" : `${n.toFixed(digits)}%`);
export const signedMoney = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${usd.format(Math.abs(n))}`;

export const SCENARIO_FUNDED_MESSAGE = "Scenario fully funded — commitments and eligibility still require verification.";
export const DISCLAIMER =
  "Prototype for educational and planning purposes. Not legal, tax, financial, or lending advice.";
