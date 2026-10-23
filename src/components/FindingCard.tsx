import type { Finding } from "@/lib/analyze";
import { inr } from "@/lib/format";
import { Icon } from "./Icon";

const SEVERITY = {
  high: { label: "Act on this", icon: "alert", cls: "bg-marker-soft text-marker" },
  medium: { label: "Worth a look", icon: "info", cls: "bg-warn-soft text-warn" },
  low: { label: "Good to know", icon: "eye", cls: "bg-paper text-muted" },
} as const;

export function FindingCard({ n, finding: f, onEvidence }: { n: number; finding: Finding; onEvidence: () => void }) {
  const sev = SEVERITY[f.severity];
  return (
    <article className="rounded-2xl border border-line bg-sheet p-5 md:p-8" aria-labelledby={`f-${f.id}`}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="label text-muted">Finding {String(n).padStart(2, "0")}</span>
        <span className={`label inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${sev.cls}`}>
          <Icon name={sev.icon} className="size-3.5" /> {sev.label}
        </span>
      </div>

      <div className="mt-4 grid gap-6 md:grid-cols-12">
        <div className="md:col-span-7">
          <h3 id={`f-${f.id}`} className="display text-[clamp(1.7rem,3.4vw,2.35rem)] text-balance">{f.title}</h3>
          <p className="mt-3 text-ink-2">{f.detail}</p>
          {f.rows && f.rows.length > 0 && (
            <ul className="mt-5 divide-y divide-line-2 border-y border-line text-[15px]">
              {f.rows.map((r) => (
                <li key={r.label} className="flex items-baseline gap-3 py-2.5">
                  <span className="min-w-0 flex-1 truncate">{r.label}</span>
                  {r.note && <span className="hidden shrink-0 text-[13px] text-muted sm:inline">{r.note}</span>}
                  <span className="num w-24 shrink-0 text-right font-medium">{inr(r.value)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-4 md:col-span-5">
          <div className="rounded-xl bg-paper p-4 md:p-5">
            <p className="label text-muted">What to do</p>
            <p className="mt-1.5 text-[15px] leading-relaxed">{f.action}</p>
          </div>
          {f.saving > 0 && (
            <div className="rounded-xl bg-keep-soft p-4 md:p-5">
              <p className="label text-keep">{f.id === "duplicates" ? "Could get back" : "Could save"}</p>
              <p className="num mt-1 text-2xl font-semibold">
                {inr(f.saving)}
                {f.id !== "duplicates" && <span className="text-base font-normal text-ink-2"> a year</span>}
              </p>
              <p className="mt-0.5 text-[13px] text-ink-2">{f.savingNote}</p>
            </div>
          )}
          <button
            type="button"
            onClick={onEvidence}
            className="no-print group inline-flex min-h-11 items-center gap-2 self-start text-[15px] font-medium underline-offset-4 hover:underline"
          >
            See the {f.evidence.length} {f.evidence.length === 1 ? "payment" : "payments"}
            <Icon name="arrow" className="size-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </article>
  );
}
