import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { gridToTxns, parseAmount, parseDate, type RawTxn } from "../src/lib/parse";
import { readCsv, pdfDocToGrid } from "../src/lib/read";
import { counterparty, recognise } from "../src/lib/merchants";
import { analyze } from "../src/lib/analyze";

const csv = (p: string) => gridToTxns(readCsv(readFileSync(p, "utf8")));
const xlsx = (p: string) => {
  const wb = XLSX.read(readFileSync(p));
  return gridToTxns(XLSX.utils.sheet_to_json<string[]>(wb.Sheets[wb.SheetNames[0]!]!, { header: 1, raw: false, defval: "" }));
};
const pdf = async (p: string) => gridToTxns(await pdfDocToGrid(await getDocument({ data: new Uint8Array(readFileSync(p)) }).promise));

/** The balance column is the ground truth: every row must reconcile with the one before it. */
function reconciles(txns: RawTxn[]) {
  for (let i = 1; i < txns.length; i++) {
    const a = txns[i - 1]!, b = txns[i]!;
    expect(Math.round((b.balance! - a.balance!) * 100), `row ${i}: ${b.description}`).toBe(Math.round(b.amount * 100));
  }
}

describe("dates and amounts", () => {
  it.each([
    ["01/07/26", "2026-07-01"], ["31/07/2026", "2026-07-31"], ["05.08.2026", "2026-08-05"], ["05-08-2026", "2026-08-05"],
    ["1 Jul 2026", "2026-07-01"], ["01-Jul-2026", "2026-07-01"], ["01-JUL-26", "2026-07-01"], ["Sep 3, 2026", "2026-09-03"],
    ["2026-09-30", "2026-09-30"], ["01/07/2026 10:15:22", "2026-07-01"],
  ])("%s → %s", (input, out) => expect(parseDate(input)).toBe(out));
  it.each(["31/02/2026", "13/13/2026", "Narration", "", "12345abc"])("rejects %s", (s) => expect(parseDate(s)).toBeNull());
  it("reads Indian number formats and markers", () => {
    expect(parseAmount("1,23,456.78")).toEqual({ value: 123456.78 });
    expect(parseAmount("₹ 1,200")).toEqual({ value: 1200 });
    expect(parseAmount("(500.00)")).toEqual({ value: -500 });
    expect(parseAmount("347.00 Dr")).toEqual({ value: 347, marker: "dr" });
    expect(parseAmount("9,653.00 Cr")).toEqual({ value: 9653, marker: "cr" });
    expect(parseAmount("-")).toBeNull();
    expect(parseAmount("UPI")).toBeNull();
  });
});

describe("bank layouts", () => {
  it("HDFC CSV with account details above the header", () => {
    const t = csv("public/samples/priya-hdfc.csv");
    expect(t).toHaveLength(203);
    expect(t[0]!.date).toBe("2026-07-01");
    reconciles(t);
  });
  it("ICICI Excel export", () => {
    const t = xlsx("public/samples/arjun-icici.xlsx");
    expect(t).toHaveLength(171);
    reconciles(t);
  });
  it("SBI PDF: rebuilds rows from text positions, joins wrapped narrations", async () => {
    const t = await pdf("public/samples/kavya-sbi.pdf");
    expect(t).toHaveLength(123);
    reconciles(t);
    expect(t.every((x) => !/^\d+$/.test(x.description))).toBe(true);
    expect(t.some((x) => /SWIGGY|ZOMATO/.test(x.description))).toBe(true);
  });
  it("Kotak single Withdrawal (Dr) / Deposit (Cr) column", () => {
    const t = csv("tests/fixtures/kotak.csv");
    expect(t.map((x) => x.amount)).toEqual([-347, 52000, -17.7]);
  });
  it("credit-card statement: unmarked amounts are spends, 'Cr' is a payment", () => {
    const t = csv("tests/fixtures/card.csv");
    expect(t.map((x) => x.amount)).toEqual([-649, 12000, -412.5]);
  });
  it("newest-first export with a mis-filed amount: sorts oldest first and fixes the sign from the balance", () => {
    const t = csv("tests/fixtures/newest-first.csv");
    expect(t.map((x) => [x.date, x.amount])).toEqual([["2026-07-02", -500], ["2026-07-03", -500]]);
  });
  it("explains what's wrong with a file that isn't a statement", () => {
    expect(() => gridToTxns([["name", "email"], ["a", "b"]])).toThrow(/Couldn't find the transaction table/);
  });
});

describe("merchant recognition (narrations from real statements)", () => {
  it.each([
    ["UPI/DR/426784531012/ZOMATO PAYMENTS/ZOMATO@ICICI/FOOD ORDER 01JUL", -347, "Food delivery", "Zomato"],
    ["UPI-SWIGGY-swiggy@axisbank-UTIB0000100-412345678901-PAYMENT FROM PHONE", -400, "Food delivery", "Swiggy"],
    ["UPI/P2A/626181509069/TARAPADA /UTIB/Payment/", -500, "Sent to people", undefined],
    ["UPI-RAJESH KUMAR-9812345678@YBL-HDFC0000314-120555000001-UPI", -900, "Sent to people", "Rajesh Kumar"],
    ["NEFT/INWARD/CR-HDFC/INFOSYS BPO LTD/SAL JUL25/N042718362538143", 52000, "Salary", "Salary"],
    ["NEFT/INWARD/CR-ICICI/INTEREST CREDIT SB-A/1234567890/INT JUL25", 120, "Interest", "Interest"],
    ["NFS/CASH WDL/609519430140/MCRM1774/PARAMAKUD/05-04-26 ATM trxn", -2000, "Cash withdrawal", "ATM cash"],
    ["NEFT Dr-SBIN0002288-SBI HOME LOAN-ACMECORP- MUM-N098765432112345", -25000, "Loans & EMIs", "Loan EMI"],
    ["MOBILE BANKING MMT/IMPS/909715291625/April Rent/Puja Dadwa/SBIN000084", -18000, "Rent", "Rent"],
    ["UPI/CR/789012345678/RAHUL MEHTA/REFUND FROM FLIPKART ORDER", 799, "Refunds & cashback", "Refund"],
    ["FOR DUES OF SMS ALERT CHARGES", -17.7, "Bank charges", "SMS alert charges"],
    ["ECS RETURN CHG BAJAJ FINANCE INSUFF BAL", -590, "Bank charges", "Payment bounce charges"],
    ["NON MAINT OF MIN BAL CHGS AUG26", -354, "Bank charges", "Minimum balance penalty"],
    ["APPLE SERVICES ICLOUD STORAGE 123456", -75, "Subscriptions", "iCloud+"],
  ])("%s", (desc, amt, category, name) => {
    const r = recognise(desc, amt);
    expect(r.category).toBe(category);
    if (name) expect(r.name).toBe(name);
  });
  it("names unknown merchants from the narration so repeat payments group", () => {
    expect(counterparty("UPI-SRI LAKSHMI TEA STALL-9812345678@ybl-YESB0000004-412345678901-PAYMENT FROM PHONE").name).toBe("Sri Lakshmi Tea Stall");
    expect(counterparty("UPI/412345678901/VAISHALI CAFE/9711112222@paytm/HDFC BANK").name).toBe("Vaishali Cafe");
  });
});

describe("the autopsy", () => {
  const priya = analyze(csv("public/samples/priya-hdfc.csv"));
  const arjun = analyze(xlsx("public/samples/arjun-icici.xlsx"));
  const find = (r: typeof priya, id: string) => r.findings.find((f) => f.id === id);

  it("covers the statement period and money in/out exactly", () => {
    expect(priya.from).toBe("2026-07-01");
    expect(priya.to).toBe("2026-09-30");
    const inSum = priya.txns.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    expect(priya.moneyIn).toBeCloseTo(inSum, 2);
    expect(priya.categories.reduce((s, c) => s + c.total, 0)).toBeCloseTo(priya.moneyOut, 2);
  });
  it("finds every planted subscription, the overlapping streaming apps and the Netflix price rise", () => {
    const names = priya.subscriptions.map((s) => s.name);
    for (const n of ["Netflix", "Spotify", "JioHotstar", "YouTube Premium", "iCloud+", "cult.fit", "Audible", "Amazon Prime"]) expect(names).toContain(n);
    expect(names).not.toContain("Rent");
    expect(find(priya, "subscriptions")!.detail).toMatch(/video-streaming/);
    expect(find(priya, "hikes")!.detail).toMatch(/Netflix went from ₹499 to ₹649/);
    expect(priya.subscriptions.find((s) => s.name === "Amazon Prime")!.cadence).toBe("yearly");
  });
  it("adds up bank charges by type", () => {
    const f = find(priya, "fees")!;
    expect(f.total).toBeCloseTo(17.7 * 2 + 500 + 90, 2);
    expect(f.rows!.map((r) => r.label)).toEqual(expect.arrayContaining(["Card annual fee", "SMS alert charges"]));
    expect(find(arjun, "fees")!.severity).toBe("high"); // bounce + minimum-balance penalty
  });
  it("flags the double Amazon charge and the double BookMyShow booking", () => {
    expect(priya.txns.filter((t) => find(priya, "duplicates")!.evidence.includes(t.id)).every((t) => t.amount === -2499)).toBe(true);
    expect(find(arjun, "duplicates")!.total).toBe(760);
  });
  it("food delivery, small spends and cash", () => {
    expect(find(priya, "delivery")!.evidence.length).toBe(51);
    expect(find(priya, "small")).toBeDefined();
    expect(find(arjun, "cash")!.total).toBe(9000);
  });
  it("ranks high-severity findings first; the headline is the sum of realistic savings", () => {
    const sev = priya.findings.map((f) => f.severity);
    expect(sev.indexOf("low") === -1 || sev.lastIndexOf("high") < sev.indexOf("low")).toBe(true);
    expect(priya.canKeep).toBeCloseTo(priya.findings.reduce((s, f) => s + f.saving, 0), 2);
    // never claims more than was actually spent on those things
    expect(priya.canKeep).toBeLessThan(priya.moneyOut / (priya.days / 365));
  });
  it("counts a card's annual fee once a year, not four times", () => {
    const f = find(priya, "fees")!;
    expect(f.yearly).toBeCloseTo(590 + (17.7 * 2 * 365) / priya.days, 0);
  });
  it("shops paid through phone-number UPI IDs are spending, not money sent to people", () => {
    for (const r of [arjun]) expect(r.txns.filter((t) => /cafe|tea|prints/i.test(t.merchant)).every((t) => t.category === "Other spending")).toBe(true);
  });
  it("every finding points at real transactions", () => {
    for (const r of [priya, arjun]) for (const f of r.findings) {
      expect(f.evidence.length).toBeGreaterThan(0);
      for (const id of f.evidence) expect(r.txns[id]).toBeDefined();
    }
  });

  it("re-labelling a merchant re-runs every check", () => {
    const raw = csv("public/samples/priya-hdfc.csv");
    const fixed = analyze(raw, new Map([["audible", "Insurance" as const]]));
    expect(fixed.subscriptions.map((s) => s.name)).not.toContain("Audible");
    expect(fixed.categories.find((c) => c.category === "Insurance")!.total).toBe(199 * 3);
  });
});

describe("no false subscriptions", () => {
  it("a monthly café visit with varying bills is not a subscription", () => {
    const r = analyze(csv("public/samples/priya-hdfc.csv"));
    expect(r.subscriptions.map((s) => s.name)).not.toContain("Café");
  });
  it("month labels use plain three-letter names", () => {
    expect(analyze(csv("public/samples/priya-hdfc.csv")).monthly.map((m) => m.label)).toEqual(["Jul ’26", "Aug ’26", "Sep ’26"]);
  });
});

describe("password-protected PDF", () => {
  it("opens with the right password and refuses the wrong one", async () => {
    const data = () => new Uint8Array(readFileSync("tests/fixtures/kavya-locked.pdf"));
    await expect(getDocument({ data: data() }).promise).rejects.toMatchObject({ name: "PasswordException" });
    await expect(getDocument({ data: data(), password: "wrong" }).promise).rejects.toMatchObject({ name: "PasswordException" });
    const t = gridToTxns(await pdfDocToGrid(await getDocument({ data: data(), password: "KAVY0101" }).promise));
    expect(t).toHaveLength(123);
  });
});
