"use client";

import { useRef, useState } from "react";
import type { Report } from "@/lib/analyze";
import type { Category } from "@/lib/merchants";
import { inr, inrShort, pct } from "@/lib/format";

type Tip = { x: number; y: number; lines: string[] } | null;

function Tooltip({ tip }: { tip: Tip }) {
  if (!tip) return null;
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-20 w-max max-w-[16rem] -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-lg bg-ink px-3 py-2 text-[13px] leading-snug text-paper shadow-lg"
      style={{ left: tip.x, top: tip.y }}
    >
      {tip.lines.map((l, i) => <p key={i} className={i === 0 ? "font-semibold" : "text-paper/80"}>{l}</p>)}
    </div>
  );
}

/** Spending by category: one hue, sorted, direct-labelled; each row is a button that filters the evidence. */
export function CategoryBars({ data, onSelect }: { data: Report["categories"]; onSelect: (c: Category) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Tip>(null);
  const top = data.slice(0, 8);
  const rest = data.slice(8);
  const restTotal = rest.reduce((s, c) => s + c.total, 0);
  const max = Math.max(...top.map((c) => c.total), restTotal);
  const place = (el: HTMLElement, lines: string[]) => {
    const b = box.current!.getBoundingClientRect(), r = el.getBoundingClientRect();
    setTip({ x: Math.min(Math.max(r.left - b.left + r.width / 2, 90), b.width - 90), y: r.top - b.top, lines });
  };
  return (
    <div ref={box} className="relative" onMouseLeave={() => setTip(null)}>
      <ul className="flex flex-col gap-1">
        {top.map((c) => {
          const lines = [c.category, `${inr(c.total)} · ${pct(c.share)} of spending`, `${c.count} ${c.count === 1 ? "payment" : "payments"} · avg ${inr(c.total / c.count)}`];
          return (
            <li key={c.category}>
              <button
                type="button"
                onClick={() => onSelect(c.category)}
                onMouseEnter={(e) => place(e.currentTarget.querySelector("[data-bar]")!, lines)}
                onFocus={(e) => place(e.currentTarget.querySelector("[data-bar]")!, lines)}
                onBlur={() => setTip(null)}
                aria-label={`${c.category}: ${inr(c.total)}, ${pct(c.share)} of spending. Show payments.`}
                className="group grid min-h-11 w-full grid-cols-[minmax(6.5rem,10rem)_1fr_auto] items-center gap-3 rounded-lg px-2 text-left transition-colors hover:bg-paper sm:grid-cols-[11rem_1fr_auto]"
              >
                <span className="truncate text-[15px]">{c.category}</span>
                <span className="relative h-3">
                  <span data-bar className="absolute inset-y-0 left-0 rounded-r-[4px] bg-series-1 transition-[width] duration-700 ease-out-expo" style={{ width: `${Math.max((c.total / max) * 100, 1.5)}%` }} />
                </span>
                <span className="num w-[5.5rem] text-right text-[15px] font-medium">{inrShort(c.total)}</span>
              </button>
            </li>
          );
        })}
        {rest.length > 0 && (
          <li className="grid min-h-11 grid-cols-[minmax(6.5rem,10rem)_1fr_auto] items-center gap-3 px-2 text-muted sm:grid-cols-[11rem_1fr_auto]">
            <span className="truncate text-[15px]">Everything else</span>
            <span className="relative h-3"><span className="absolute inset-y-0 left-0 rounded-r-[4px] bg-muted/40" style={{ width: `${Math.max((restTotal / max) * 100, 1.5)}%` }} /></span>
            <span className="num w-[5.5rem] text-right text-[15px]">{inrShort(restTotal)}</span>
          </li>
        )}
      </ul>
      <Tooltip tip={tip} />
    </div>
  );
}

/** Money in vs out per month: two series on one axis, legend + direct labels, tooltip per month. */
export function MonthBars({ data }: { data: Report["monthly"] }) {
  const box = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Tip>(null);
  const [active, setActive] = useState<number | null>(null);
  const H = 200, top = 22;
  const max = Math.max(1, ...data.flatMap((m) => [m.in, m.out]));
  const h = (v: number) => (v / max) * (H - top);
  const show = (i: number, el: HTMLElement) => {
    const m = data[i]!, b = box.current!.getBoundingClientRect(), r = el.getBoundingClientRect();
    const kept = m.in - m.out;
    setActive(i);
    setTip({ x: Math.min(Math.max(r.left - b.left + r.width / 2, 90), b.width - 90), y: r.top - b.top + 8, lines: [m.label, `In ${inr(m.in)}`, `Out ${inr(m.out)}`, kept >= 0 ? `Kept ${inr(kept)}` : `Overspent ${inr(-kept)}`] });
  };
  const hide = () => { setTip(null); setActive(null); };
  return (
    <div ref={box} className="relative" onMouseLeave={hide}>
      <div className="mb-4 flex gap-5 text-[13px] text-ink-2" aria-hidden>
        <span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-[3px] bg-series-1" />Money in</span>
        <span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-[3px] bg-series-2" />Money out</span>
      </div>
      <div className="relative flex items-end gap-3 border-b border-line sm:gap-5" style={{ height: H }}>
        {data.map((m, i) => (
          <button
            key={m.month}
            type="button"
            onMouseEnter={(e) => show(i, e.currentTarget)}
            onFocus={(e) => show(i, e.currentTarget)}
            onBlur={hide}
            aria-label={`${m.label}: in ${inr(m.in)}, out ${inr(m.out)}`}
            className={`flex h-full min-w-0 flex-1 items-end justify-center gap-[2px] rounded-t-md transition-opacity ${active !== null && active !== i ? "opacity-45" : ""}`}
          >
            {(["in", "out"] as const).map((k) => (
              <span key={k} className="relative flex h-full w-full max-w-10 flex-col justify-end">
                <span className="num pointer-events-none mb-1 text-center text-[11px] whitespace-nowrap text-muted">{inrShort(m[k])}</span>
                <span className={`block w-full rounded-t-[4px] ${k === "in" ? "bg-series-1" : "bg-series-2"}`} style={{ height: Math.max(h(m[k]), m[k] > 0 ? 2 : 0) }} />
              </span>
            ))}
          </button>
        ))}
      </div>
      <div className="mt-2 flex gap-3 sm:gap-5" aria-hidden>
        {data.map((m) => <span key={m.month} className="label min-w-0 flex-1 text-center text-muted">{m.label}</span>)}
      </div>
      <Tooltip tip={tip} />
    </div>
  );
}
