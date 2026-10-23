export { inr } from "./analyze";

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-07-01" → "1 Jul 2026" (or "1 Jul" without the year). */
export function day(iso: string, withYear = true) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MON[m! - 1]}${withYear ? ` ${y}` : ""}`;
}

/** Compact Indian rupees for chart labels: ₹850, ₹12.4k, ₹1.2L, ₹3.4Cr. */
export function inrShort(n: number) {
  const a = Math.abs(n);
  if (a >= 1e7) return `₹${(a / 1e7).toFixed(1).replace(/\.0$/, "")}Cr`;
  if (a >= 1e5) return `₹${(a / 1e5).toFixed(1).replace(/\.0$/, "")}L`;
  if (a >= 1e3) return `₹${(a / 1e3).toFixed(1).replace(/\.0$/, "")}k`;
  return `₹${Math.round(a)}`;
}

export const pct = (x: number) => `${Math.round(x * 100)}%`;
