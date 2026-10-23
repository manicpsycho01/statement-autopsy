"use client";

import { useMemo, useRef, useState } from "react";
import type { Report as ReportData } from "@/lib/analyze";
import type { Category } from "@/lib/merchants";
import { day, inr, pct } from "@/lib/format";
import { gsap, MOTION, useGSAP } from "@/lib/gsap";
import { CategoryBars, MonthBars } from "./Charts";
import { FindingCard } from "./FindingCard";
import { Icon } from "./Icon";
import { Footer } from "./Landing";
import { Locker, type LockerFilter } from "./Locker";
import { scrollToEl } from "./SmoothScroll";

/** A short, stable case number for the report header. */
function caseNo(name: string, n: number) {
  let h = 7;
  for (const c of name + n) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `SA-${String(h % 10000).padStart(4, "0")}`;
}

function downloadCsv(report: ReportData, name: string) {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const lines = ["Date,Description,Merchant,Category,Amount", ...report.txns.map((t) => [t.date, esc(t.description), esc(t.merchant), esc(t.category), t.amount.toFixed(2)].join(","))];
  const url = URL.createObjectURL(new Blob(["﻿" + lines.join("\n")], { type: "text/csv" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name.replace(/\.[^.]+$/, "") + "-categorised.csv" });
  a.click();
  URL.revokeObjectURL(url);
}

export function Report({ name, report, overrides, onRelabel, onReset }: {
  name: string;
  report: ReportData;
  overrides: Map<string, Category>;
  onRelabel: (key: string, c: Category) => void;
  onReset: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const locker = useRef<HTMLElement>(null);
  const [filter, setFilter] = useState<LockerFilter>({ category: "all", ids: null, label: null });
  const healthy = report.canSave < 1000;
  const spendPerMonth = report.moneyOut / report.months;
  // The totals cover the whole statement; say so, so the monthly average underneath reads as an average.
  const monthsCovered = Math.round(report.days / 30.44);
  const span = monthsCovered >= 1 ? `over ${monthsCovered} ${monthsCovered === 1 ? "month" : "months"}` : `over ${report.days} days`;
  const caseId = useMemo(() => caseNo(name, report.txns.length), [name, report.txns.length]);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(MOTION, () => {
      gsap.from("[data-in]", { y: 22, opacity: 0, duration: 0.85, ease: "expo.out", stagger: 0.06 });
      const counter = root.current?.querySelector<HTMLElement>("[data-count]");
      if (counter) {
        const target = Number(counter.dataset.count);
        const o = { v: 0 };
        gsap.to(o, { v: target, duration: 1.4, ease: "power3.out", delay: 0.25, onUpdate: () => { counter.textContent = inr(Math.round(o.v / 100) * 100); } });
      }
      gsap.utils.toArray<HTMLElement>("[data-rise]").forEach((el) =>
        gsap.from(el, { y: 28, opacity: 0, duration: 0.85, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 90%", once: true } }),
      );
    });
  }, { scope: root });

  const showEvidence = (f: LockerFilter) => {
    setFilter(f);
    requestAnimationFrame(() => locker.current && scrollToEl(locker.current, -12));
  };

  return (
    <div ref={root}>
      <section className="wrap pt-8 pb-12 md:pt-12 md:pb-16">
        {/* Report header */}
        <div data-in className="flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="label text-muted">Autopsy report · Case {caseId}</p>
            <p className="mt-1 truncate text-[15px] font-medium">{name}</p>
            <p className="text-[15px] text-muted">
              {day(report.from)} – {day(report.to)} · {report.txns.length} transactions · {report.days} days
            </p>
          </div>
          <div className="no-print flex gap-2">
            <button type="button" onClick={onReset} aria-label="New statement" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-4 text-[15px] font-medium whitespace-nowrap text-paper hover:opacity-90">
              <Icon name="upload" className="size-4" /> New<span className="hidden sm:inline"> statement</span>
            </button>
            <button type="button" onClick={() => window.print()} aria-label="Save as PDF" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-sheet px-4 text-[15px] whitespace-nowrap hover:border-ink/40">
              <Icon name="printer" className="size-4" /> <span className="hidden sm:inline">Save as </span>PDF
            </button>
            <button type="button" onClick={() => downloadCsv(report, name)} aria-label="Categorised CSV" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-sheet px-4 text-[15px] whitespace-nowrap hover:border-ink/40">
              <Icon name="download" className="size-4" /> <span className="hidden sm:inline">Categorised </span>CSV
            </button>
          </div>
        </div>

        {/* Verdict */}
        <div data-in className="mt-10 max-w-4xl md:mt-14">
          <p className="label text-muted">The verdict</p>
          {healthy ? (
            <h1 className="display mt-3 text-[clamp(2.6rem,7vw,5rem)] text-balance">
              Clean bill of health. <span className="text-keep">No real leaks.</span>
            </h1>
          ) : (
            <h1 className="display mt-3 text-[clamp(2.6rem,7vw,5rem)] text-balance">
              You could save about <span className="marked num whitespace-nowrap" data-count={report.canSave}>{inr(Math.round(report.canSave / 100) * 100)}</span> a year.
            </h1>
          )}
          <p className="mt-4 max-w-2xl text-lg text-ink-2">
            {healthy
              ? "We didn't find subscriptions piling up, avoidable fees or double charges. The breakdown below shows where your money went."
              : `From ${report.findings.filter((f) => f.saving > 0).length} small fixes below — no budgeting app, no lifestyle overhaul.`}
          </p>
        </div>

        {/* Vital signs */}
        <dl data-in className="mt-10 grid grid-cols-2 overflow-hidden rounded-2xl border border-line bg-sheet lg:grid-cols-4">
          {[
            ["Money in", inr(report.moneyIn), `${span}\navg ${inr(report.moneyIn / report.months)}/month`],
            ["Money out", inr(report.moneyOut), `${span}\navg ${inr(spendPerMonth)}/month`],
            ["Saved", report.savingsRate === null ? "—" : pct(Math.max(report.savingsRate, -9.99)), report.savingsRate !== null && report.savingsRate < 0 ? "spent more than came in" : "of what came in"],
            ["Biggest category", report.categories[0]?.category ?? "—", report.categories[0] ? `${inr(report.categories[0].total)} · ${pct(report.categories[0].share)}` : ""],
          ].map(([label, value, sub], i) => (
            <div key={label} className={`min-w-0 p-5 md:p-6 ${i % 2 ? "border-l border-line" : ""} ${i > 1 ? "border-t border-line lg:border-t-0" : ""} ${i === 2 ? "lg:border-l" : ""}`}>
              <dt className="label text-muted">{label}</dt>
              <dd className="num mt-2 truncate text-[clamp(1.25rem,3vw,1.75rem)] font-semibold leading-tight">{value}</dd>
              <dd className="mt-1 text-[13px] leading-snug whitespace-pre-line text-muted">{sub}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Findings */}
      <section aria-labelledby="findings-title" className="wrap pb-16 md:pb-24">
        <div className="flex items-end justify-between gap-4 border-b border-line pb-4">
          <h2 id="findings-title" className="display text-[clamp(2rem,4.5vw,3rem)]">Findings</h2>
          <p className="label pb-2 text-muted">{report.findings.length} found · worst first</p>
        </div>
        {report.findings.length ? (
          <ol className="mt-6 flex flex-col gap-5">
            {report.findings.map((f, i) => (
              <li key={f.id} data-rise className="print-break">
                <FindingCard n={i + 1} finding={f} onEvidence={() => showEvidence({ category: "all", ids: f.evidence, label: f.title })} />
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-6 text-ink-2">Nothing stood out. That&apos;s a good sign.</p>
        )}
      </section>

      {/* Where it went */}
      <section aria-labelledby="where-title" className="border-t border-line bg-sheet">
        <div className="wrap grid gap-12 py-16 md:py-24 lg:grid-cols-12">
          <div data-rise className="lg:col-span-7">
            <h2 id="where-title" className="display text-[clamp(2rem,4.5vw,3rem)]">Where it went</h2>
            <p className="mt-2 text-[15px] text-muted">Spending by category over {Math.round(report.days / 30.44)} months. Select a category to see its payments.</p>
            <div className="mt-8">
              <CategoryBars data={report.categories} onSelect={(c) => showEvidence({ category: c, ids: null, label: null })} />
            </div>
          </div>
          <div data-rise className="lg:col-span-5">
            <h2 className="display text-[clamp(2rem,4.5vw,3rem)]">Month by month</h2>
            <p className="mt-2 text-[15px] text-muted">Money in and out of the account each month.</p>
            <div className="mt-8">
              <MonthBars data={report.monthly} />
            </div>
            <h3 className="mt-12 text-lg font-semibold">Where most of it went</h3>
            <ol className="mt-3 divide-y divide-line border-y border-line">
              {report.topMerchants.slice(0, 6).map((m, i) => (
                <li key={m.name} className="flex items-baseline gap-3 py-3 text-[15px]">
                  <span className="label w-5 shrink-0 text-muted">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate">{m.name}</span>
                  <span className="shrink-0 text-[13px] text-muted">{m.count}×</span>
                  <span className="num w-24 shrink-0 text-right font-medium">{inr(m.total)}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Evidence locker */}
      <section ref={locker} aria-labelledby="locker-title" className="border-t border-line">
        <div className="wrap py-16 md:py-24">
          <Locker report={report} filter={filter} onFilter={setFilter} overrides={overrides} onRelabel={onRelabel} />
        </div>
      </section>
      <Footer />
    </div>
  );
}
