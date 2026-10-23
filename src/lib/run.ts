/** Reads → parses → analyses a statement, reporting each stage so the UI can show real progress. */
import { analyze, type Report } from "./analyze";
import type { Category } from "./merchants";
import { gridToTxns, ParseError, type RawTxn } from "./parse";
import { PasswordNeeded, readToGrid } from "./read";

export type Stage = "read" | "table" | "merchants" | "checks";
export const STAGES: { id: Stage; label: string }[] = [
  { id: "read", label: "Reading the file on this device" },
  { id: "table", label: "Finding the transaction table" },
  { id: "merchants", label: "Recognising merchants and categories" },
  { id: "checks", label: "Running the checks" },
];

export type Outcome =
  | { ok: true; raw: RawTxn[]; report: Report }
  | { ok: false; kind: "password"; wrong: boolean }
  | { ok: false; kind: "error"; message: string };

const tick = () => new Promise((r) => setTimeout(r, 0));

export async function runStatement(file: File, onStage: (s: Stage) => void, password?: string): Promise<Outcome> {
  try {
    if (file.size > 25 * 1024 * 1024) return { ok: false, kind: "error", message: "That file is over 25 MB — statements are usually much smaller. Try a shorter period." };
    onStage("read");
    const grid = await readToGrid(file, password);
    onStage("table");
    await tick();
    const raw = gridToTxns(grid);
    onStage("merchants");
    await tick();
    onStage("checks");
    const report = analyze(raw);
    return { ok: true, raw, report };
  } catch (e) {
    if (e instanceof PasswordNeeded) return { ok: false, kind: "password", wrong: e.wrong };
    if (e instanceof ParseError) return { ok: false, kind: "error", message: e.message };
    console.error(e);
    return { ok: false, kind: "error", message: "This file couldn't be read. If it's a scanned PDF (a picture of a statement), download the CSV or Excel version from net banking instead." };
  }
}

/** Re-runs the checks after the user re-labels a merchant. */
export function reanalyze(raw: RawTxn[], overrides: Map<string, Category>): Report {
  return analyze(raw, overrides);
}
