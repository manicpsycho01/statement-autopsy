"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Category } from "@/lib/merchants";
import type { RawTxn } from "@/lib/parse";
import type { Report as ReportData } from "@/lib/analyze";
import { reanalyze, runStatement, type Stage } from "@/lib/run";
import { Landing } from "./Landing";
import { Report } from "./Report";
import { SiteHeader } from "./SiteHeader";
import { scrollToEl } from "./SmoothScroll";

export type Phase =
  | { phase: "idle" }
  | { phase: "reading"; name: string; stage: Stage }
  | { phase: "password"; file: File; wrong: boolean }
  | { phase: "error"; message: string };

type Done = { name: string; raw: RawTxn[]; report: ReportData; overrides: Map<string, Category> };

/** Minimum time the reading animation stays up, so a fast parse still reads as a deliberate step. */
const MIN_READ_MS = 1300;

export function App() {
  const [state, setState] = useState<Phase>({ phase: "idle" });
  const [done, setDone] = useState<Done | null>(null);
  const top = useRef<HTMLDivElement>(null);

  const open = useCallback(async (file: File, password?: string) => {
    const started = performance.now();
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    setState({ phase: "reading", name: file.name, stage: "read" });
    const res = await runStatement(file, (stage) => setState({ phase: "reading", name: file.name, stage }), password);
    const wait = reduced ? 0 : MIN_READ_MS - (performance.now() - started);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    if (res.ok) {
      setDone({ name: file.name, raw: res.raw, report: res.report, overrides: new Map() });
      setState({ phase: "idle" });
      requestAnimationFrame(() => scrollToEl(0));
    } else if (res.kind === "password") setState({ phase: "password", file, wrong: res.wrong });
    else setState({ phase: "error", message: res.message });
  }, []);

  const openSample = useCallback(async (path: string, name: string) => {
    const blob = await (await fetch(path)).blob();
    await open(new File([blob], name, { type: blob.type }));
  }, [open]);

  const relabel = useCallback((key: string, category: Category) => {
    setDone((d) => {
      if (!d) return d;
      const overrides = new Map(d.overrides).set(key, category);
      return { ...d, overrides, report: reanalyze(d.raw, overrides) };
    });
  }, []);

  const reset = useCallback(() => {
    setDone(null);
    setState({ phase: "idle" });
    requestAnimationFrame(() => scrollToEl(0));
  }, []);

  // Drop a file anywhere on the page.
  useEffect(() => {
    const over = (e: DragEvent) => { if (e.dataTransfer?.types.includes("Files")) e.preventDefault(); };
    const drop = (e: DragEvent) => {
      const f = e.dataTransfer?.files?.[0];
      if (!f) return;
      e.preventDefault();
      void open(f);
    };
    window.addEventListener("dragover", over);
    window.addEventListener("drop", drop);
    return () => { window.removeEventListener("dragover", over); window.removeEventListener("drop", drop); };
  }, [open]);

  return (
    <div ref={top}>
      <SiteHeader onHome={done ? reset : undefined} />
      <main id="main">
        {done ? (
          <Report key={done.name} name={done.name} report={done.report} overrides={done.overrides} onRelabel={relabel} onReset={reset} />
        ) : (
          <Landing state={state} onFile={open} onSample={openSample} onDismiss={() => setState({ phase: "idle" })} />
        )}
      </main>
    </div>
  );
}
