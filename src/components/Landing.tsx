"use client";

import { useRef } from "react";
import { gsap, MOTION, useGSAP } from "@/lib/gsap";
import type { Phase } from "./App";
import { Dropzone } from "./Dropzone";
import { Icon, type IconName } from "./Icon";
import { REPO } from "./SiteHeader";

const SAMPLES = [
  { path: "/samples/priya-hdfc.csv", file: "priya-hdfc.csv", who: "Priya", what: "Salaried · Bengaluru", fmt: "HDFC · CSV" },
  { path: "/samples/arjun-icici.xlsx", file: "arjun-icici.xlsx", who: "Arjun", what: "Freelancer · Pune", fmt: "ICICI · Excel" },
  { path: "/samples/kavya-sbi.pdf", file: "kavya-sbi.pdf", who: "Kavya", what: "Student · Chennai", fmt: "SBI · PDF" },
];

const CHECKS: { icon: IconName; title: string; body: string }[] = [
  { icon: "repeat", title: "Subscriptions", body: "Every recurring charge, overlapping streaming apps, and quiet price rises." },
  { icon: "bank", title: "Bank fees", body: "SMS alerts, card fees, minimum-balance penalties, bounce charges, forex markup." },
  { icon: "copy", title: "Double charges", body: "The same amount to the same merchant twice within two days." },
  { icon: "bag", title: "Food delivery", body: "How often you order, what each order costs, and what a small change keeps." },
  { icon: "coins", title: "Small spends", body: "₹40 here, ₹120 there — the payments you never notice, added up." },
  { icon: "eye", title: "Cash", body: "How much left as cash, where it can no longer be tracked." },
];

const BANKS: [string, string][] = [
  ["HDFC Bank", "NetBanking → Accounts → Account Statement → choose the period → Download as Delimited (CSV) or Excel."],
  ["ICICI Bank", "iMobile or Internet Banking → Accounts → Account Statement → choose dates → Download → XLS (or PDF)."],
  ["SBI", "YONO or OnlineSBI → My Accounts → Account Statement → choose dates → Download in Excel or PDF."],
  ["Axis Bank", "Internet Banking → Accounts → Statement → choose period → Download as Excel or CSV."],
  ["Kotak", "Net Banking or app → Statements → Account statement → choose dates → Download as Excel/CSV."],
  ["Any other bank", "Look for “Account statement” or “Transaction history” and download the CSV or Excel version — PDFs work too if they're not scanned images."],
];

export function Landing({ state, onFile, onSample, onDismiss }: {
  state: Phase;
  onFile: (f: File, password?: string) => void;
  onSample: (path: string, name: string) => void;
  onDismiss: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const busy = state.phase === "reading";

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(MOTION, () => {
      gsap.from("[data-hero] > *", { y: 24, opacity: 0, duration: 0.9, ease: "expo.out", stagger: 0.07 });
      gsap.fromTo("[data-mark]", { "--mark": "0%" }, { "--mark": "100%", duration: 0.9, ease: "power3.inOut", delay: 0.55 });
      gsap.utils.toArray<HTMLElement>("[data-rise]").forEach((el) =>
        gsap.from(el, { y: 32, opacity: 0, duration: 0.9, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 88%", once: true } }),
      );
    });
  }, { scope: root });

  return (
    <div ref={root}>
      <section className="wrap pt-12 pb-16 md:pt-20 md:pb-24">
        <div data-hero className="mx-auto max-w-3xl text-center">
          <p className="label text-muted">For Indian bank statements · free · private</p>
          <h1 className="display mt-5 text-[clamp(2.9rem,8.5vw,5.75rem)] text-balance">
            Find where your money <em data-mark className="marked text-marker">leaks</em>.
          </h1>
          <p className="mx-auto mt-6 max-w-[38rem] text-lg text-ink-2 md:text-xl">
            Drop your bank statement. In seconds you get a plain-English report of forgotten subscriptions, bank fees, double charges and the habits that quietly cost you — with exactly what to do about each.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-3xl md:mt-12">
          <Dropzone state={state} onFile={onFile} onDismiss={onDismiss} />

          <div className={`mt-8 transition-opacity ${busy ? "pointer-events-none opacity-40" : ""}`} aria-hidden={busy}>
            <p className="text-center text-[15px] text-muted">No statement handy? Open a sample:</p>
            <ul className="mt-3 grid gap-3 sm:grid-cols-3">
              {SAMPLES.map((s) => (
                <li key={s.file}>
                  <button
                    type="button"
                    onClick={() => onSample(s.path, s.file)}
                    className="group flex min-h-11 w-full items-center gap-3 rounded-xl border border-line bg-sheet px-4 py-3 text-left transition-[border-color,transform] duration-300 ease-out-expo hover:-translate-y-0.5 hover:border-ink/40"
                  >
                    <span className="display grid size-10 shrink-0 place-items-center rounded-full bg-paper text-xl">{s.who[0]}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="font-semibold">{s.who}</span>
                        <span className="label text-[10.5px] whitespace-nowrap text-muted">{s.fmt}</span>
                      </span>
                      <span className="block text-[13px] text-muted">{s.what}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-center text-[13px] text-muted">Samples are fictional people with realistic statements.</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="checks-title" className="border-t border-line bg-sheet">
        <div className="wrap py-16 md:py-24">
          <div data-rise className="max-w-2xl">
            <p className="label text-muted">What it checks</p>
            <h2 id="checks-title" className="display mt-3 text-[clamp(2.2rem,5vw,3.5rem)]">Six checks a careful accountant would run.</h2>
          </div>
          <ul data-rise className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {CHECKS.map((c, i) => (
              <li key={c.title} className="bg-sheet p-6">
                <div className="flex items-center justify-between">
                  <Icon name={c.icon} className="size-6" />
                  <span className="label text-muted">0{i + 1}</span>
                </div>
                <h3 className="mt-5 text-lg font-semibold">{c.title}</h3>
                <p className="mt-1 text-[15px] text-ink-2">{c.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="how-title" className="border-t border-line">
        <div className="wrap grid gap-10 py-16 md:grid-cols-12 md:py-24">
          <div data-rise className="md:col-span-5">
            <p className="label text-muted">Where to get your statement</p>
            <h2 id="how-title" className="display mt-3 text-[clamp(2.2rem,5vw,3.5rem)]">Two minutes in your bank&apos;s app.</h2>
            <p className="mt-4 text-ink-2">Download the last three to six months. CSV or Excel reads best; regular (not scanned) PDFs work too, including password-protected ones.</p>
          </div>
          <div data-rise className="md:col-span-7">
            <ul className="divide-y divide-line rounded-2xl border border-line bg-sheet">
              {BANKS.map(([bank, steps]) => (
                <li key={bank}>
                  <details className="group">
                    <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 font-medium [&::-webkit-details-marker]:hidden">
                      {bank}
                      <Icon name="down" className="size-4 shrink-0 text-muted transition-transform duration-300 group-open:rotate-180" />
                    </summary>
                    <p className="px-5 pb-5 text-[15px] text-ink-2">{steps}</p>
                  </details>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section aria-labelledby="private-title" className="border-t border-line bg-ink text-paper">
        <div className="wrap grid gap-8 py-16 md:grid-cols-12 md:py-24">
          <div data-rise className="md:col-span-6">
            <p className="label text-paper/60">Privacy, by design</p>
            <h2 id="private-title" className="display mt-3 text-[clamp(2.2rem,5vw,3.5rem)]">Your statement never leaves this device.</h2>
          </div>
          <ul data-rise className="flex flex-col gap-4 text-[15px] text-paper/80 md:col-span-6 md:pt-2">
            <li className="flex gap-3"><Icon name="check" className="mt-1 size-4 shrink-0 text-keep" /> The file is read by your browser. There is no server that receives it, no database, no account.</li>
            <li className="flex gap-3"><Icon name="check" className="mt-1 size-4 shrink-0 text-keep" /> No AI service sees your transactions — every check is a transparent rule you can read in the source.</li>
            <li className="flex gap-3"><Icon name="check" className="mt-1 size-4 shrink-0 text-keep" /> Close the tab and it&apos;s gone. Nothing is saved.</li>
            <li className="flex gap-3"><Icon name="check" className="mt-1 size-4 shrink-0 text-keep" />
              <p>Open source: <a href={REPO} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-paper">read exactly what it does</a>.</p>
            </li>
          </ul>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export function Footer() {
  return (
    <footer className="no-print border-t border-line">
      <div className="wrap flex flex-col gap-2 py-8 text-[13px] text-muted md:flex-row md:justify-between">
        <p>Not financial advice. Figures are estimates from your statement.</p>
        <p>
          Built by <a href="https://aravind-portfolio-theta.vercel.app" className="underline underline-offset-4 hover:text-ink">Aravind Srinivasan</a>
        </p>
      </div>
    </footer>
  );
}
