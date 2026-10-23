"use client";

import { useRef, useState } from "react";
import { STAGES } from "@/lib/run";
import type { Phase } from "./App";
import { Icon } from "./Icon";

const ACCEPT = ".csv,.txt,.xls,.xlsx,.pdf";

/** The specimen tray: drop or pick a statement; shows real reading progress, a PDF password prompt, or a fixable error. */
export function Dropzone({ state, onFile, onDismiss }: { state: Phase; onFile: (f: File, password?: string) => void; onDismiss: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [password, setPassword] = useState("");

  if (state.phase === "reading") {
    const at = STAGES.findIndex((s) => s.id === state.stage);
    return (
      <div className="relative overflow-hidden rounded-2xl border border-line bg-sheet p-6 md:p-8" role="status" aria-live="polite">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-10">
          <div aria-hidden className="relative mx-auto h-40 w-32 shrink-0 overflow-hidden rounded-md border border-line bg-paper p-3 md:mx-0">
            {Array.from({ length: 9 }, (_, i) => (
              <span key={i} className="mb-2 block h-1.5 rounded-full bg-line" style={{ width: `${55 + ((i * 37) % 45)}%` }} />
            ))}
            <span className="scanline absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-transparent via-marker/25 to-transparent" />
            <span className="scanline absolute inset-x-0 top-5 h-px bg-marker" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="label text-muted">Examining</p>
            <p className="mt-1 truncate text-lg font-medium">{state.name}</p>
            <ol className="mt-5 flex flex-col gap-2.5">
              {STAGES.map((s, i) => (
                <li key={s.id} className={`flex items-center gap-3 text-[15px] transition-colors ${i <= at ? "text-ink" : "text-muted/60"}`}>
                  <span className={`grid size-5 shrink-0 place-items-center rounded-full border ${i < at ? "border-keep bg-keep text-sheet" : i === at ? "border-ink" : "border-line"}`}>
                    {i < at ? <Icon name="check" className="size-3" strokeWidth={3} /> : i === at ? <span className="size-1.5 animate-pulse rounded-full bg-ink" /> : null}
                  </span>
                  {s.label}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    );
  }

  if (state.phase === "password") {
    return (
      <form
        className="rounded-2xl border border-line bg-sheet p-6 md:p-8"
        onSubmit={(e) => { e.preventDefault(); if (password) onFile(state.file, password); }}
      >
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-paper"><Icon name="lock" /></span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">This statement is password-protected</h2>
            <p className="mt-1 text-[15px] text-ink-2">
              Banks usually lock e-statements with a password like your customer ID, or the first letters of your name plus your date of birth — check the email it came with.
              The password is only used here to open the file.
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <label className="sr-only" htmlFor="pdf-password">PDF password</label>
          <input
            id="pdf-password"
            type="password"
            autoFocus
            autoComplete="off"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="min-h-12 flex-1 rounded-xl border border-line bg-paper px-4 text-base outline-none focus:border-ink"
            placeholder="PDF password"
            aria-invalid={state.wrong}
          />
          <button type="submit" className="min-h-12 rounded-xl bg-ink px-6 font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-40" disabled={!password}>
            Open statement
          </button>
        </div>
        {state.wrong && <p className="mt-3 text-[15px] text-marker" role="alert">That password didn&apos;t work. Try again.</p>}
        <button type="button" onClick={onDismiss} className="mt-4 min-h-11 text-[15px] text-muted underline underline-offset-4 hover:text-ink">Choose a different file</button>
      </form>
    );
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); e.stopPropagation(); }}
        className={`group relative rounded-2xl border-2 border-dashed bg-sheet transition-[border-color,background-color,transform] duration-300 ease-out-expo ${
          over ? "scale-[1.01] border-marker bg-marker-soft" : "border-ink/20 hover:border-ink/45"
        }`}
      >
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="flex w-full flex-col items-center gap-3 px-5 py-8 text-center sm:gap-4 sm:px-6 sm:py-12 md:py-16 short:py-9"
          aria-describedby="drop-help"
        >
          <span className={`grid size-14 place-items-center rounded-full transition-colors ${over ? "bg-marker text-sheet" : "bg-paper text-ink group-hover:bg-ink group-hover:text-paper"}`}>
            <Icon name="upload" className="size-6" />
          </span>
          <span>
            <span className="block text-lg font-semibold sm:text-xl md:text-2xl">{over ? "Drop it — we'll take it from here" : "Drop your bank statement here"}</span>
            <span className="mt-1 block text-[15px] text-muted">
              or <span className="text-ink underline underline-offset-4">choose a file</span> · CSV, Excel or PDF
            </span>
          </span>
        </button>
        <input ref={input} type="file" accept={ACCEPT} className="sr-only" tabIndex={-1} aria-label="Choose a bank statement file" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
      </div>
      <p id="drop-help" className="mt-3 flex items-center justify-center gap-2 text-[14px] text-muted">
        <Icon name="lock" className="size-4 shrink-0" /> Read on this device. Never uploaded. No sign-up.
      </p>
      {state.phase === "error" && (
        <div role="alert" className="mt-4 flex items-start gap-3 rounded-xl border border-marker/30 bg-marker-soft p-4 text-[15px]">
          <Icon name="alert" className="mt-0.5 size-5 shrink-0 text-marker" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">We couldn&apos;t read that one</p>
            <p className="mt-0.5 text-ink-2">{state.message}</p>
            <p className="mt-1 text-ink-2">Most banks let you download the same statement as CSV or Excel — see the steps for your bank below.</p>
          </div>
          <button type="button" onClick={onDismiss} aria-label="Dismiss" className="-m-2 grid size-11 shrink-0 place-items-center text-muted hover:text-ink"><Icon name="x" className="size-4" /></button>
        </div>
      )}
    </div>
  );
}
