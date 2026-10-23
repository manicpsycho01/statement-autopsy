"use client";

import { useMemo, useState } from "react";
import type { Report } from "@/lib/analyze";
import { CATEGORIES, type Category } from "@/lib/merchants";
import { day, inr } from "@/lib/format";
import { Icon } from "./Icon";

export type LockerFilter = { category: Category | "all"; ids: number[] | null; label: string | null };

const PAGE = 40;

/** Every transaction: search, filter, sort, and re-label a merchant (the whole report re-runs). */
export function Locker({ report, filter, onFilter, overrides, onRelabel }: {
  report: Report;
  filter: LockerFilter;
  onFilter: (f: LockerFilter) => void;
  overrides: Map<string, Category>;
  onRelabel: (key: string, c: Category) => void;
}) {
  const [q, setQ] = useState("");
  const [flow, setFlow] = useState<"all" | "out" | "in">("all");
  const [sort, setSort] = useState<"date" | "amount">("date");
  const [shown, setShown] = useState(PAGE);
  const [toast, setToast] = useState<string | null>(null);

  const rows = useMemo(() => {
    const ids = filter.ids ? new Set(filter.ids) : null;
    const needle = q.trim().toLowerCase();
    const list = report.txns.filter((t) =>
      (!ids || ids.has(t.id)) &&
      (filter.category === "all" || t.category === filter.category) &&
      (flow === "all" || (flow === "in" ? t.amount > 0 : t.amount < 0)) &&
      (!needle || t.description.toLowerCase().includes(needle) || t.merchant.toLowerCase().includes(needle) || t.category.toLowerCase().includes(needle)));
    return sort === "amount" ? [...list].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)) : [...list].reverse();
  }, [report.txns, filter, q, flow, sort]);

  const total = rows.reduce((s, t) => s + t.amount, 0);
  const relabel = (key: string, merchant: string, c: Category) => {
    const n = report.txns.filter((t) => t.key === key).length;
    onRelabel(key, c);
    setToast(`${merchant}: ${n} ${n === 1 ? "payment" : "payments"} moved to ${c}. Report updated.`);
    setTimeout(() => setToast(null), 3500);
  };
  const active = filter.ids || filter.category !== "all";

  return (
    <div>
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 id="locker-title" className="display text-[clamp(2rem,4.5vw,3rem)]">Evidence locker</h2>
          <p className="mt-1 text-[15px] text-muted">Every transaction, with the category we gave it. Wrong? Change it — the whole report updates.</p>
        </div>
      </div>

      <div className="no-print mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search transactions</span>
          <Icon name="search" className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={q}
            onChange={(e) => { setQ(e.target.value); setShown(PAGE); }}
            placeholder="Search a merchant, UPI ID or category"
            className="min-h-12 w-full rounded-xl border border-line bg-sheet pr-4 pl-10 text-base outline-none focus:border-ink"
          />
        </label>
        <div className="flex flex-wrap gap-3">
          <label className="min-w-0 flex-1 sm:flex-none">
            <span className="sr-only">Category</span>
            <select
              value={filter.category}
              onChange={(e) => { onFilter({ category: e.target.value as Category | "all", ids: null, label: null }); setShown(PAGE); }}
              className="min-h-12 w-full rounded-xl border border-line bg-sheet px-3 text-[15px] sm:w-52"
            >
              <option value="all">All categories</option>
              {report.categories.map((c) => <option key={c.category} value={c.category}>{c.category}</option>)}
            </select>
          </label>
          <div className="flex rounded-xl border border-line bg-sheet p-1" role="group" aria-label="Money direction">
            {(["all", "out", "in"] as const).map((f) => (
              <button key={f} type="button" aria-pressed={flow === f} onClick={() => setFlow(f)} className={`min-h-11 min-w-11 rounded-lg px-3 text-[14px] ${flow === f ? "bg-ink text-paper" : "text-ink-2 hover:text-ink"}`}>
                {f === "all" ? "All" : f === "out" ? "Out" : "In"}
              </button>
            ))}
          </div>
          <label>
            <span className="sr-only">Sort</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as "date" | "amount")} className="min-h-12 rounded-xl border border-line bg-sheet px-3 text-[15px]">
              <option value="date">Newest first</option>
              <option value="amount">Largest first</option>
            </select>
          </label>
        </div>
      </div>

      <div className="mt-4 flex min-h-11 flex-wrap items-center justify-between gap-3 text-[14px] text-muted">
        <p aria-live="polite">
          {rows.length} {rows.length === 1 ? "transaction" : "transactions"}
          {filter.label ? <> · <span className="text-ink">{filter.label}</span></> : null}
          {" · "}net <span className="num text-ink">{total < 0 ? "−" : "+"}{inr(total)}</span>
        </p>
        {active && (
          <button type="button" onClick={() => onFilter({ category: "all", ids: null, label: null })} className="inline-flex min-h-11 items-center gap-1.5 text-ink underline underline-offset-4">
            <Icon name="x" className="size-3.5" /> Clear filter
          </button>
        )}
      </div>

      <ul className="mt-2 divide-y divide-line border-y border-line">
        {rows.slice(0, shown).map((t) => (
          <li key={t.id} className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 py-3.5 md:grid-cols-[6.5rem_1fr_13rem_8rem] md:items-center">
            <span className="num order-2 col-span-2 text-[13px] text-muted md:order-none md:col-span-1 md:text-[14px]">{day(t.date)}</span>
            <span className="order-1 min-w-0 md:order-none">
              <span className="block truncate font-medium">{t.merchant}</span>
              <span className="block truncate text-[13px] text-muted" title={t.description}>{t.description}</span>
            </span>
            <label className="order-3 col-span-2 md:order-none md:col-span-1">
              <span className="sr-only">Category for {t.merchant}</span>
              <select
                value={t.category}
                onChange={(e) => relabel(t.key, t.merchant, e.target.value as Category)}
                className={`no-print min-h-11 w-full rounded-lg border bg-transparent px-2.5 text-[14px] ${overrides.has(t.key) ? "border-series-1" : "border-line"}`}
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <span className={`num order-1 text-right font-semibold md:order-none ${t.amount > 0 ? "text-keep" : ""}`}>
              {t.amount > 0 ? "+" : "−"}{inr(t.amount, { decimals: true })}
            </span>
          </li>
        ))}
      </ul>
      {rows.length === 0 && <p className="py-8 text-center text-muted">No transactions match.</p>}
      {rows.length > shown && (
        <div className="no-print mt-6 text-center">
          <button type="button" onClick={() => setShown((s) => s + PAGE * 2)} className="min-h-12 rounded-full border border-line bg-sheet px-6 text-[15px] font-medium hover:border-ink/40">
            Show more ({rows.length - shown} left)
          </button>
        </div>
      )}

      <div aria-live="polite" className="no-print pointer-events-none fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 flex justify-center px-4">
        {toast && <p className="pointer-events-auto rounded-full bg-ink px-5 py-3 text-[14px] text-paper shadow-xl">{toast}</p>}
      </div>
    </div>
  );
}
