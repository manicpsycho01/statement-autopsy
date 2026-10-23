# Statement Autopsy

**Find where your money leaks.** Drop an Indian bank statement (CSV, Excel or PDF) and get a plain-English report of forgotten subscriptions, bank fees, double charges and spending habits, with what to do about each.

**Live:** https://statement-autopsy-teal.vercel.app

Everything runs in your browser. The file is never uploaded: there's no server, no database, no account and no AI service.

## What it checks

| Check | What it finds |
|---|---|
| Subscriptions | Recurring charges with a steady rhythm. It also flags overlapping services (e.g. three video apps) and price rises. |
| Bank fees | SMS alerts, card annual fees, minimum-balance penalties, bounce charges, ATM and forex charges. |
| Double charges | The same amount paid to the same merchant twice within two days. |
| Food delivery | Orders per week, average order, and what cooking one or two of those meals would save. |
| Small spends | Payments of ₹250 or less that add up. |
| Cash | Money withdrawn at ATMs, which can't be tracked after that. |

The headline ("You could save about ₹X a year") adds up only concrete savings:
- avoidable fees;
- cancelling overlapping subscriptions;
- cooking one or two delivery meals a week;
- refunds of double charges;
- trimming a quarter of small spends.

## How it reads statements

- **Formats:** CSV via Papa Parse, Excel (`.xls`/`.xlsx`) via SheetJS, and PDF via pdf.js. For PDFs, table rows are rebuilt from the text positions under the header columns. Password-protected PDFs prompt for the password.
- **Layouts:**
  - separate withdrawal/deposit columns (HDFC, ICICI, SBI, Axis);
  - a single Dr/Cr amount column (Kotak);
  - credit-card statements;
  - newest-first exports;
  - narrations that wrap onto the next line.
- **Balance check:** the running balance is used to fix any amount that landed in the wrong column.
- **Merchants:** about 120 Indian merchants and services are recognised from UPI, NEFT, IMPS, ACH and POS narrations. Unknown merchants are named from the narration, so repeat payments still group together.
- **Corrections:** you can re-label any merchant in the evidence locker, and every check runs again.

## Run it

```bash
pnpm install
pnpm samples        # regenerate the fictional sample statements in public/samples
pnpm dev            # http://localhost:3200
```

## Tests

```bash
pnpm test                                        # 51 unit tests: parsing, recognition, every check
pnpm build && pnpm start &
BASE_URL=http://localhost:3200 pnpm e2e          # browser tests: flows, plus a layout audit at 17 screen sizes
```

The browser suite covers:
- each sample;
- file picker, drag-and-drop, and password PDFs (wrong, then right password);
- a non-statement file;
- evidence filtering, category filters, search, re-labelling and the CSV download.

The layout audit checks every page at 17 screen sizes, from a 320 px phone to a 2560 px monitor. It looks for:
- sideways overflow;
- text that is off-screen or overlapping;
- tiny text;
- touch targets under 44 px;
- the hero and drop zone fitting the first screen.

It also scrolls through with animations on and checks for overlaps.

## Stack

Next.js 16, React 19, TypeScript, Tailwind CSS 4, GSAP + Lenis for motion, Papa Parse, SheetJS, pdf.js, Vitest and Playwright.

Bank layouts were checked against the open-source [indian-bank-statement-parser](https://github.com/raptar231/indian-bank-statement-parser) (Apache-2.0).

The sample statements describe fictional people. Statement Autopsy is not financial advice.
