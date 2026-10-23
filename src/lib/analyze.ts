/**
 * The autopsy: turns transactions into ranked findings with a yearly rupee cost and a plain next step,
 * plus vitals, category totals and monthly money in/out. Pure and deterministic — every figure can be
 * traced to the transactions listed as its evidence.
 */
import type { RawTxn } from "./parse";
import { COMMITMENTS, recognise, type Category } from "./merchants";

export type Txn = RawTxn & { id: number; key: string; merchant: string; category: Category; family?: string; fee?: string };

export type Finding = {
  id: "subscriptions" | "fees" | "delivery" | "small" | "duplicates" | "cash" | "hikes";
  title: string;
  /** One sentence, plain English. */
  detail: string;
  action: string;
  /** Projected cost per year, used to rank (0 when not a recurring cost). */
  yearly: number;
  /** Amount in the statement period. */
  total: number;
  /** What the suggested action realistically saves per year (counted in the headline). */
  saving: number;
  savingNote: string;
  severity: "high" | "medium" | "low";
  evidence: number[];
  rows?: { label: string; value: number; note?: string }[];
};

export type Subscription = { key: string; name: string; monthly: number; last: string; count: number; cadence: string; family?: string; amounts: number[] };

export type Report = {
  txns: Txn[];
  from: string;
  to: string;
  days: number;
  months: number;
  moneyIn: number;
  moneyOut: number;
  savingsRate: number | null;
  findings: Finding[];
  /** Sum of every finding's realistic saving per year. */
  canSave: number;
  subscriptions: Subscription[];
  categories: { category: Category; total: number; count: number; share: number }[];
  monthly: { month: string; label: string; in: number; out: number }[];
  topMerchants: { name: string; total: number; count: number }[];
};

const DAY = 86400000;
const days = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / DAY);
const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);
const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2; };
export const inr = (n: number, opts: { decimals?: boolean } = {}) =>
  "₹" + Math.abs(n).toLocaleString("en-IN", { maximumFractionDigits: opts.decimals ? 2 : 0, minimumFractionDigits: opts.decimals ? 2 : 0 });
const plural = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`;

/** Recognises every transaction; `overrides` (merchant key → category) applies the user's own re-labels. */
export function enrich(raw: RawTxn[], overrides?: Map<string, Category>): Txn[] {
  return raw.map((t, id) => {
    const r = recognise(t.description, t.amount);
    const category = overrides?.get(r.key) ?? r.category;
    const keepFee = category === "Bank charges" && r.fee;
    return { ...t, id, key: r.key, merchant: r.name, category, ...(r.family && category === r.category ? { family: r.family } : {}), ...(keepFee ? { fee: r.fee } : category === "Bank charges" ? { fee: "Other bank charges" } : {}) };
  });
}

const cadenceOf = (gap: number): [string, number] | null =>
  gap >= 25 && gap <= 35 ? ["monthly", 1] : gap >= 6 && gap <= 8 ? ["weekly", 30.44 / 7] : gap >= 84 && gap <= 95 ? ["quarterly", 1 / 3] : gap >= 355 && gap <= 372 ? ["yearly", 1 / 12] : null;

/** Recurring same-merchant debits with a steady rhythm and similar amounts, plus known subscription services. */
export function findSubscriptions(txns: Txn[]): Subscription[] {
  const groups = new Map<string, Txn[]>();
  for (const t of txns) if (t.amount < 0) groups.set(t.key, [...(groups.get(t.key) ?? []), t]);
  const subs: Subscription[] = [];
  for (const [key, list] of groups) {
    const cat = list[0]!.category;
    const known = cat === "Subscriptions";
    // Unknown merchants only count when they look like a plan: a category that can be one, and a fixed price.
    if (!known && !(["Other spending", "Entertainment", "Education", "Health"] as Category[]).includes(cat)) continue;
    const amounts = list.map((t) => -t.amount);
    if (list.length >= 2) {
      const gaps = list.slice(1).map((t, i) => days(list[i]!.date, t.date));
      const cad = cadenceOf(median(gaps));
      const steady = Math.max(...amounts) / Math.min(...amounts) <= (known ? 1.35 : 1.02);
      if (cad && steady && (known || Math.max(...amounts) <= 5000)) {
        // Price changes are kept: use the latest amount as the current cost.
        subs.push({ key, name: list[0]!.merchant, monthly: amounts[amounts.length - 1]! * cad[1], last: list[list.length - 1]!.date, count: list.length, cadence: cad[0], amounts, ...(list[0]!.family ? { family: list[0]!.family } : {}) });
        continue;
      }
    }
    if (known) {
      const latest = amounts[amounts.length - 1]!;
      // Seen once: a yearly plan if it's large, otherwise assume monthly.
      const yearly = latest >= 900 && list.length === 1;
      subs.push({ key, name: list[0]!.merchant, monthly: yearly ? latest / 12 : latest, last: list[list.length - 1]!.date, count: list.length, cadence: yearly ? "yearly" : "monthly", amounts, ...(list[0]!.family ? { family: list[0]!.family } : {}) });
    }
  }
  return subs.sort((a, b) => b.monthly - a.monthly);
}

export function analyze(raw: RawTxn[], overrides?: Map<string, Category>): Report {
  const txns = enrich(raw, overrides);
  const from = txns[0]!.date, to = txns[txns.length - 1]!.date;
  const span = Math.max(1, days(from, to) + 1);
  const months = Math.max(span / 30.44, 1);
  const perYear = (total: number) => (total / span) * 365;
  const debits = txns.filter((t) => t.amount < 0);
  const moneyIn = sum(txns.filter((t) => t.amount > 0).map((t) => t.amount));
  const moneyOut = -sum(debits.map((t) => t.amount));
  const findings: Finding[] = [];

  // 1 · Subscriptions
  const subscriptions = findSubscriptions(txns);
  if (subscriptions.length) {
    const monthly = sum(subscriptions.map((s) => s.monthly));
    const families = new Map<string, Subscription[]>();
    for (const s of subscriptions) if (s.family) families.set(s.family, [...(families.get(s.family) ?? []), s]);
    const overlap = [...families.entries()].filter(([, l]) => l.length >= 2).sort((a, b) => b[1].length - a[1].length)[0];
    const label: Record<string, string> = { video: "video-streaming", music: "music", cloud: "cloud-storage", ai: "AI assistant", fitness: "fitness" };
    const extras = [...families.values()].filter((l) => l.length >= 2).flatMap((l) => [...l].sort((a, b) => a.monthly - b.monthly).slice(1));
    const subSaving = sum(extras.map((s) => s.monthly)) * 12;
    findings.push({
      id: "subscriptions",
      saving: subSaving,
      savingNote: subSaving ? `by keeping one of each overlapping service (cancel ${extras.map((s) => s.name).join(", ")})` : "",
      title: `${plural(subscriptions.length, "subscription")} quietly renewing`,
      detail: overlap
        ? `You pay ${inr(monthly)} a month for ${plural(subscriptions.length, "subscription")} — including ${overlap[1].length} ${label[overlap[0]] ?? overlap[0]} services (${overlap[1].map((s) => s.name).join(", ")}).`
        : `You pay ${inr(monthly)} a month for ${plural(subscriptions.length, "subscription")}. Each one is small; together they're ${inr(monthly * 12)} a year.`,
      action: overlap
        ? `Keep one ${label[overlap[0]] ?? overlap[0]} service at a time and rotate. Cancel anything you haven't opened this month.`
        : "Open each one and ask: did I use this in the last 30 days? Cancel the ones you didn't.",
      yearly: monthly * 12,
      total: sum(subscriptions.flatMap((s) => s.amounts)),
      severity: monthly * 12 > 12000 ? "high" : "medium",
      evidence: txns.filter((t) => subscriptions.some((s) => s.key === t.key) && t.amount < 0).map((t) => t.id),
      rows: subscriptions.map((s) => ({ label: s.name, value: s.monthly, note: s.cadence === "monthly" ? "per month" : `${s.cadence} plan, shown per month` })),
    });
    // Price hikes
    const hikes = subscriptions.filter((s) => s.amounts.length >= 2 && s.amounts[s.amounts.length - 1]! > s.amounts[0]! * 1.04);
    if (hikes.length) {
      const extra = sum(hikes.map((s) => (s.amounts[s.amounts.length - 1]! - s.amounts[0]!) * (s.cadence === "monthly" ? 12 : s.cadence === "weekly" ? 52 : 1)));
      findings.push({
        id: "hikes",
        saving: 0,
        savingNote: "",
        title: hikes.length === 1 ? `${hikes[0]!.name} raised its price` : `${plural(hikes.length, "subscription")} got more expensive`,
        detail: hikes.map((s) => `${s.name} went from ${inr(s.amounts[0]!)} to ${inr(s.amounts[s.amounts.length - 1]!)}`).join("; ") + ".",
        action: "Check for a cheaper plan (annual billing, mobile-only, or a family plan you can share).",
        yearly: extra,
        total: 0,
        severity: "low",
        evidence: txns.filter((t) => hikes.some((s) => s.key === t.key) && t.amount < 0).map((t) => t.id),
      });
    }
  }

  // 2 · Bank charges
  const fees = debits.filter((t) => t.category === "Bank charges");
  if (fees.length) {
    const total = -sum(fees.map((t) => t.amount));
    const byType = new Map<string, number>();
    for (const t of fees) byType.set(t.fee!, (byType.get(t.fee!) ?? 0) - t.amount);
    const serious = fees.some((t) => /bounce|penalty/i.test(t.fee!));
    const annual = -sum(fees.filter((t) => t.fee === "Card annual fee" || (/gst/i.test(t.fee!) && /annual|dc fee|amc/i.test(t.description))).map((t) => t.amount));
    const feesYearly = annual + perYear(total - annual);
    findings.push({
      id: "fees",
      title: `Your bank charged you ${inr(total)} in fees`,
      detail: `${plural(fees.length, "charge")}: ${[...byType.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${inr(v)}`).join(", ")}. At this rate that's about ${inr(feesYearly)} a year.`,
      action: serious
        ? "Penalties and bounce charges can often be reversed — call or chat with your bank and ask for a one-time waiver. Keep the minimum balance or move to a zero-balance account."
        : "Ask your bank to waive them (they often do once), turn off SMS alerts if the app notifies you anyway, or switch to a zero-fee account.",
      yearly: feesYearly,
      total,
      saving: feesYearly,
      savingNote: "with a zero-fee account, or by asking for a waiver",
      severity: serious || feesYearly > 3000 ? "high" : "medium",
      evidence: fees.map((t) => t.id),
      rows: [...byType.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value })),
    });
  }

  // 3 · Food delivery
  const delivery = debits.filter((t) => t.category === "Food delivery");
  if (delivery.length >= 3) {
    const total = -sum(delivery.map((t) => t.amount));
    const avg = total / delivery.length;
    const perWeek = delivery.length / (span / 7);
    const saving = Math.min(perYear(total), avg * 0.6 * Math.min(2, perWeek) * 52);
    findings.push({
      id: "delivery",
      title: `${inr(perYear(total))} a year on food delivery`,
      detail: `${plural(delivery.length, "order")} in ${Math.round(span / 7)} weeks — about ${perWeek.toFixed(1)} a week at ${inr(avg)} each, before tips.`,
      action: `Cooking ${Math.min(2, Math.max(1, Math.round(perWeek / 2)))} of those meals a week instead would save roughly ${inr(saving)} a year.`,
      yearly: perYear(total),
      total,
      saving,
      savingNote: `by cooking ${Math.min(2, Math.max(1, Math.round(perWeek / 2)))} of the delivery meals each week at home`,
      severity: perYear(total) > 36000 ? "high" : "medium",
      evidence: delivery.map((t) => t.id),
    });
  }

  // 4 · Possible duplicate charges
  const dupIds: number[] = [];
  let dupTotal = 0;
  const byKey = new Map<string, Txn[]>();
  for (const t of debits) if (t.category !== "Sent to people" && t.category !== "Bank charges" && -t.amount >= 100) byKey.set(t.key, [...(byKey.get(t.key) ?? []), t]);
  for (const list of byKey.values())
    for (let i = 1; i < list.length; i++) {
      const a = list[i - 1]!, b = list[i]!;
      if (a.amount === b.amount && days(a.date, b.date) <= 2 && !dupIds.includes(a.id)) { dupIds.push(a.id, b.id); dupTotal -= b.amount; }
    }
  if (dupIds.length) {
    findings.push({
      id: "duplicates",
      title: `${plural(dupIds.length / 2, "possible double charge")}`,
      detail: `The same amount went to the same merchant twice within two days (${inr(dupTotal)} in the second payments).`,
      action: "Check these against your orders. If you were charged twice, raise a dispute in your bank app — UPI and card disputes usually resolve in days.",
      yearly: 0,
      total: dupTotal,
      saving: dupTotal,
      savingNote: "if the second payments are refunded",
      severity: "high",
      evidence: dupIds,
    });
  }

  // 5 · Small spends that add up
  const smallSkip: Category[] = ["Subscriptions", "Bank charges", "Food delivery", "Bills & utilities", "Investments", "Insurance", "Loans & EMIs", "Rent"];
  const small = debits.filter((t) => -t.amount <= 250 && !smallSkip.includes(t.category));
  const smallTotal = -sum(small.map((t) => t.amount));
  if (small.length >= 10 && smallTotal / months >= 1000) {
    const top = [...new Map(small.map((t) => [t.merchant, 0])).keys()]
      .map((m) => ({ m, v: -sum(small.filter((t) => t.merchant === m).map((t) => t.amount)) }))
      .sort((a, b) => b.v - a.v).slice(0, 3);
    findings.push({
      id: "small",
      title: `${plural(small.length, "small payment")} added up to ${inr(smallTotal)}`,
      detail: `Payments of ₹250 or less — mostly ${top.map((x) => x.m).join(", ")}. That's ${inr(smallTotal / months)} a month you probably don't notice.`,
      action: "Set a weekly limit for small UPI spends, or move a fixed 'fun money' amount to a separate account each week.",
      yearly: perYear(smallTotal),
      total: smallTotal,
      saving: perYear(smallTotal) * 0.25,
      savingNote: "by trimming a quarter of them",
      severity: "low",
      evidence: small.map((t) => t.id),
    });
  }

  // 6 · Cash
  const cash = debits.filter((t) => t.category === "Cash withdrawal");
  const cashTotal = -sum(cash.map((t) => t.amount));
  if (cash.length && cashTotal >= 0.05 * moneyOut) {
    findings.push({
      id: "cash",
      title: `${inr(cashTotal)} left as cash`,
      detail: `${plural(cash.length, "ATM withdrawal")}. Cash spending is invisible here, so this part of your money can't be tracked.`,
      action: "Pay by UPI where you can so spending shows up in your statement — and you avoid ATM charges after the free withdrawals.",
      yearly: 0,
      total: cashTotal,
      saving: 0,
      savingNote: "",
      severity: "low",
      evidence: cash.map((t) => t.id),
    });
  }

  const order = { high: 0, medium: 1, low: 2 };
  findings.sort((a, b) => order[a.severity] - order[b.severity] || b.yearly + b.total - (a.yearly + a.total));
  const canSave = sum(findings.map((f) => f.saving));

  // Categories & months
  const catMap = new Map<Category, { total: number; count: number }>();
  for (const t of debits) { const c = catMap.get(t.category) ?? { total: 0, count: 0 }; c.total -= t.amount; c.count++; catMap.set(t.category, c); }
  const categories = [...catMap.entries()].map(([category, v]) => ({ category, ...v, share: v.total / moneyOut })).sort((a, b) => b.total - a.total);
  const mMap = new Map<string, { in: number; out: number }>();
  for (const t of txns) { const k = t.date.slice(0, 7); const m = mMap.get(k) ?? { in: 0, out: 0 }; if (t.amount > 0) m.in += t.amount; else m.out -= t.amount; mMap.set(k, m); }
  const monthly = [...mMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, v]) => ({
    month, label: `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][+month.slice(5) - 1]} ’${month.slice(2, 4)}`, ...v,
  }));
  const merch = new Map<string, { total: number; count: number }>();
  for (const t of debits) { const m = merch.get(t.merchant) ?? { total: 0, count: 0 }; m.total -= t.amount; m.count++; merch.set(t.merchant, m); }
  const topMerchants = [...merch.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.total - a.total).slice(0, 8);

  return {
    txns, from, to, days: span, months, moneyIn, moneyOut,
    savingsRate: moneyIn > 0 ? (moneyIn - moneyOut) / moneyIn : null,
    findings, canSave, subscriptions, categories, monthly, topMerchants,
  };
}
