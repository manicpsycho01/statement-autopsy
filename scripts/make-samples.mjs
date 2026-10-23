/**
 * Generates the fictional sample statements (Jul–Sep 2026) in three real export layouts:
 *   public/samples/priya-hdfc.csv   — HDFC-style CSV (salaried, Bengaluru)
 *   public/samples/arjun-icici.xlsx — ICICI-style Excel (freelancer, Pune)
 *   public/samples/kavya-sbi.pdf    — SBI-style PDF (student, Chennai)
 * plus parser fixtures in tests/fixtures. Deterministic: same output every run.
 * All names, accounts and amounts are invented.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import * as XLSX from "xlsx";
import { chromium } from "@playwright/test";

mkdirSync("public/samples", { recursive: true });
mkdirSync("tests/fixtures", { recursive: true });

function rng(seed) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const MONTHS = [7, 8, 9];
const ref = (r) => String(Math.floor(r() * 9e11) + 1e11);
const round = (n) => Math.round(n * 100) / 100;
const MON = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** events: [day, month, desc, amount(+in/-out)] → sorted with running balance */
function ledger(events, opening) {
  const list = events.map((e, i) => ({ d: e[0], m: e[1], desc: e[2], amt: round(e[3]), i })).sort((a, b) => a.m - b.m || a.d - b.d || a.i - b.i);
  let bal = opening;
  return list.map((t) => { bal = round(bal + t.amt); return { ...t, bal }; });
}

// ---------- Priya: salaried, Bengaluru (HDFC style) ----------
function priya() {
  const r = rng(7), ev = [];
  const upi = (name, handle, ifsc) => `UPI-${name}-${handle}-${ifsc}-${ref(r)}-PAYMENT FROM PHONE`;
  for (const m of MONTHS) {
    const mon = MON[m].toUpperCase();
    ev.push([1, m, `NEFT CR-CITI0000004-GLOBEX TECHNOLOGIES PVT LTD-SALARY ${mon}26`, 96500]);
    ev.push([3, m, `MMT/IMPS/${ref(r)}/${MON[m]} Rent/Suresh Rao/SBIN0000842`, -28000]);
    ev.push([5, m, `ACH D- INDIAN CLEARING CORP-ZERODHA SIP ${ref(r).slice(0, 8)}`, -10000]);
    ev.push([2, m, upi("CULTFIT", "cultfit@icici", "ICIC0000001"), -1599]);
    ev.push([7, m, upi("NETFLIX", "netflix@hdfcbank", "HDFC0000001"), m === 7 ? -499 : -649]);
    ev.push([9, m, `APPLE SERVICES ICLOUD STORAGE ${ref(r).slice(0, 6)}`, -75]);
    ev.push([12, m, upi("SPOTIFY INDIA", "spotify@axisbank", "UTIB0000100"), -119]);
    ev.push([15, m, upi("JIOHOTSTAR", "jiohotstar@ybl", "YESB0000001"), -299]);
    ev.push([20, m, upi("GOOGLE YOUTUBE PREMIUM", "youtube@okicici", "ICIC0000002"), -149]);
    ev.push([25, m, `POS 416021XXXXXX4421 AUDIBLE INDIA`, -199]);
    ev.push([11, m, upi("BESCOM", "bescom@ybl", "YESB0000002"), -(1650 + Math.round(r() * 400))]);
    ev.push([18, m, upi("AIRTEL POSTPAID", "airtel@kotak", "KKBK0000001"), -999]);
    ev.push([21, m, upi("ACT FIBERNET", "actfibernet@hdfcbank", "HDFC0000002"), -1179]);
    ev.push([14, m, `CRED CLUB CREDIT CARD BILL PAYMENT ${ref(r).slice(0, 8)}`, -(14000 + Math.round(r() * 6000))]);
    ev.push([10, m, `NFS/CASH WDL/${ref(r)}/BLR KORAMANGALA`, -2000]);
    // food delivery ~4/week
    for (let k = 0; k < 17; k++) {
      const d = 1 + Math.floor(r() * 28), sw = r() < 0.55;
      ev.push([d, m, sw ? upi("SWIGGY", "swiggy@axisbank", "UTIB0000100") : upi("ZOMATO LTD", "zomato@hdfcbank", "HDFC0000001"), -(240 + Math.round(r() * 520))]);
    }
    // groceries
    for (let k = 0; k < 6; k++) ev.push([2 + k * 5, m, upi(["ZEPTO", "BLINKIT", "BIGBASKET"][k % 3], "grocer@ybl", "YESB0000003"), -(380 + Math.round(r() * 1400))]);
    // rides
    for (let k = 0; k < 9; k++) ev.push([1 + Math.floor(r() * 28), m, upi(r() < 0.6 ? "UBER INDIA" : "RAPIDO", "rides@axisbank", "UTIB0000101"), -(90 + Math.round(r() * 330))]);
    // small spends: tea stalls, snacks, parking
    const shops = ["SRI LAKSHMI TEA STALL", "BANGALORE BAKERY", "CHAI POINT", "SANTOSH STORES", "PARKING BBMP", "FRESH JUICE CORNER"];
    for (let k = 0; k < 14; k++) ev.push([1 + Math.floor(r() * 28), m, upi(shops[k % shops.length], `${9800000000 + Math.floor(r() * 1e8)}@ybl`, "YESB0000004"), -(20 + Math.round(r() * 160))]);
    // eating out, shopping
    ev.push([16, m, `POS 416021XXXXXX4421 THIRD WAVE COFFEE`, -(320 + Math.round(r() * 200))]);
    ev.push([23, m, upi("AMAZON PAY", "amazon@apl", "UTIB0000102"), -(800 + Math.round(r() * 2400))]);
    // friends
    ev.push([19, m, `UPI-ROHAN MENON-rohanm@okaxis-UTIB0000103-${ref(r)}-DINNER SPLIT`, -(600 + Math.round(r() * 900))]);
    ev.push([24, m, `UPI-ANANYA IYER-ananya.iyer@oksbi-SBIN0000999-${ref(r)}-UPI`, 450 + Math.round(r() * 600)]);
  }
  // planted: duplicate Amazon order, yearly Prime, fees, interest
  ev.push([22, 8, upi("AMAZON PAY", "amazon@apl", "UTIB0000102"), -2499]);
  ev.push([22, 8, upi("AMAZON PAY", "amazon@apl", "UTIB0000102"), -2499]);
  ev.push([4, 8, upi("AMAZON PRIME", "primevideo@apl", "UTIB0000102"), -1499]);
  ev.push([30, 7, "SMS ALERT CHARGES APR-JUN26 INCL GST", -17.7]);
  ev.push([30, 9, "SMS ALERT CHARGES JUL-SEP26 INCL GST", -17.7]);
  ev.push([6, 8, "DC ANNUAL FEE 4421 2026-27", -500]);
  ev.push([6, 8, "GST ON DC ANNUAL FEE 4421", -90]);
  ev.push([30, 9, "CREDIT INTEREST CAPITALISED", 612]);
  const rows = ledger(ev, 41250.35);
  const dd = (t) => `${String(t.d).padStart(2, "0")}/${String(t.m).padStart(2, "0")}/26`;
  const csv = [
    "HDFC BANK Ltd.,,,,,,",
    "Account Statement,,,,,,",
    "MS PRIYA NAIR (fictional),,,,,,",
    "Account No :50100XXXXXX812,,,,,,",
    "Statement From :01/07/2026  To :30/09/2026,,,,,,",
    ",,,,,,",
    "Date,Narration,Chq./Ref.No.,Value Dt,Withdrawal Amt.,Deposit Amt.,Closing Balance",
    ...rows.map((t) => [dd(t), `"${t.desc}"`, `0000${ref(r).slice(0, 8)}`, dd(t), t.amt < 0 ? (-t.amt).toFixed(2) : "", t.amt > 0 ? t.amt.toFixed(2) : "", t.bal.toFixed(2)].join(",")),
  ].join("\n");
  writeFileSync("public/samples/priya-hdfc.csv", csv);
  return rows;
}

// ---------- Arjun: freelancer, Pune (ICICI style, Excel) ----------
function arjun() {
  const r = rng(21), ev = [];
  const upi = (name, handle) => `UPI/${ref(r)}/${name}/${handle}/HDFC BANK`;
  ev.push([4, 7, "NEFT-N186260412345-BRIGHTLOOP DESIGN LLP-INV 0712", 68000]);
  ev.push([19, 7, "NEFT-N201260478812-NORTHWIND MEDIA PVT LTD-INV 0715", 42000]);
  ev.push([28, 8, "NEFT-N240260499876-BRIGHTLOOP DESIGN LLP-INV 0721", 54000]);
  ev.push([22, 9, "IMPS-626512345678-KESTREL APPS-BKID-XXXXXXX0091-INVOICE", 36500]);
  for (const m of MONTHS) {
    ev.push([2, m, upi("OPENAI CHATGPT", "openai@icici"), -1999]);
    ev.push([3, m, upi("ADOBE SYSTEMS", "adobe@hdfcbank"), -1675.28]);
    ev.push([6, m, upi("NOTION LABS", "notion@icici"), -880]);
    ev.push([8, m, upi("LINKEDIN PREMIUM", "linkedin@icici"), -1567]);
    ev.push([10, m, upi("SPOTIFY INDIA", "spotify@axisbank"), -119]);
    ev.push([13, m, upi("JIOHOTSTAR", "jiohotstar@ybl"), -299]);
    ev.push([13, m, upi("SONYLIV", "sonyliv@hdfcbank"), -299]);
    ev.push([5, m, `MMT/IMPS/${ref(r)}/Rent ${MON[m]}/Meera Kulkarni/HDFC0001234`, -18500]);
    ev.push([15, m, `ACH/BAJAJ FINANCE LTD/EMI LAPTOP/${ref(r).slice(0, 9)}`, -4210]);
    ev.push([17, m, upi("MSEDCL ELECTRICITY", "msedcl@sbi"), -(1100 + Math.round(r() * 500))]);
    ev.push([20, m, upi("JIO PREPAID", "jio@sbi"), -349]);
    for (let k = 0; k < 22; k++) ev.push([1 + Math.floor(r() * 28), m, upi(r() < 0.5 ? "SWIGGY" : "ZOMATO", r() < 0.5 ? "swiggy@ybl" : "zomato@icici"), -(190 + Math.round(r() * 480))]);
    for (let k = 0; k < 4; k++) ev.push([3 + k * 7, m, upi(k % 2 ? "BLINKIT" : "DMART", "grocery@ybl"), -(600 + Math.round(r() * 1700))]);
    for (let k = 0; k < 6; k++) ev.push([1 + Math.floor(r() * 28), m, upi("UBER INDIA", "uber@axisbank"), -(120 + Math.round(r() * 260))]);
    for (let k = 0; k < 10; k++) ev.push([1 + Math.floor(r() * 28), m, upi(["VAISHALI CAFE", "AMRUTTULYA TEA", "PUNE PRINTS", "GOODLUCK CAFE"][k % 4], `${9700000000 + Math.floor(r() * 1e8)}@paytm`), -(30 + Math.round(r() * 200))]);
    ev.push([12, m, `ATM CASH WDL ATW ${ref(r).slice(0, 6)} PUNE FC ROAD`, -3000]);
  }
  ev.push([9, 8, "ECS RETURN CHG BAJAJ FINANCE INSUFF BAL", -590]);
  ev.push([9, 8, "GST ON ECS RETURN CHG", -106.2]);
  ev.push([31, 8, "NON MAINT OF MIN BAL CHGS AUG26", -354]);
  ev.push([18, 9, upi("BOOKMYSHOW", "bookmyshow@icici"), -760]);
  ev.push([18, 9, upi("BOOKMYSHOW", "bookmyshow@icici"), -760]);
  const rows = ledger(ev, 23810.4);
  const dd = (t) => `${String(t.d).padStart(2, "0")}/${String(t.m).padStart(2, "0")}/2026`;
  const aoa = [
    ["DETAILED STATEMENT"], ["Account Name: ARJUN DESHPANDE (fictional)"], ["Account Number: XXXXXXXX4471"], ["Transaction Period: From 01/07/2026 To 30/09/2026"], [],
    ["S No.", "Value Date", "Transaction Date", "Cheque Number", "Transaction Remarks", "Withdrawal Amount (INR )", "Deposit Amount (INR )", "Balance (INR )"],
    ...rows.map((t, i) => [String(i + 1), dd(t), dd(t), "-", t.desc, t.amt < 0 ? (-t.amt).toFixed(2) : "0.00", t.amt > 0 ? t.amt.toFixed(2) : "0.00", t.bal.toFixed(2)]),
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), "OpTransactionHistory");
  writeFileSync("public/samples/arjun-icici.xlsx", XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
  return rows;
}

// ---------- Kavya: student, Chennai (SBI style, PDF) ----------
function kavya() {
  const r = rng(99), ev = [];
  const upi = (name, handle, code = "YESB") => `TO TRANSFER-UPI/DR/${ref(r)}/${name}/${code}/${handle}/Payment--`;
  for (const m of MONTHS) {
    ev.push([1, m, `BY TRANSFER-IMPS/${ref(r)}/RAMESH S/From Dad--`, 15000]);
    ev.push([4, m, upi("SPOTIFY", "spotify@ybl"), -59]);
    ev.push([6, m, upi("YOUTUBE PREMIUM", "youtube@okicici", "ICIC"), -149]);
    ev.push([9, m, upi("JIO RECHARGE", "jio@sbi", "SBIN"), -299]);
    for (let k = 0; k < 9; k++) ev.push([1 + Math.floor(r() * 28), m, upi(r() < 0.5 ? "SWIGGY" : "ZOMATO", "food@ybl"), -(150 + Math.round(r() * 250))]);
    for (let k = 0; k < 24; k++) ev.push([1 + Math.floor(r() * 28), m, upi(["CAMPUS CANTEEN", "MURUGAN TEA STALL", "XEROX POINT", "AMMA MESS", "CHENNAI METRO"][k % 5], `${9600000000 + Math.floor(r() * 1e8)}@okaxis`, "UTIB"), -(15 + Math.round(r() * 120))]);
    ev.push([14, m, upi("RAPIDO", "rapido@axl", "UTIB"), -(70 + Math.round(r() * 90))]);
    ev.push([21, m, upi("MYNTRA", "myntra@icici", "ICIC"), -(499 + Math.round(r() * 900))]);
    ev.push([25, m, `ATM WDL ${ref(r).slice(0, 6)} CHENNAI GUINDY`, -1000]);
  }
  ev.push([26, 8, "ATM TXN CHGS 4 FREE TXNS EXCEEDED", -23.6]);
  ev.push([30, 9, "SMS ALERT CHGS QTR SEP26", -17.7]);
  ev.push([30, 9, "SB INT CR 01JUL TO 30SEP", 41]);
  const rows = ledger(ev, 3120.5);
  const dd = (t) => `${t.d} ${MON[t.m]} 2026`;
  const fmt = (n) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const tr = rows.map((t) => `<tr><td>${dd(t)}</td><td>${dd(t)}</td><td class="d">${t.desc}</td><td>-</td><td class="n">${t.amt < 0 ? fmt(-t.amt) : ""}</td><td class="n">${t.amt > 0 ? fmt(t.amt) : ""}</td><td class="n">${fmt(t.bal)}</td></tr>`).join("");
  return { rows, html: `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font:9px Helvetica,Arial,sans-serif;margin:28px;color:#111} h1{font-size:13px;margin:0 0 4px} p{margin:2px 0}
    table{width:100%;border-collapse:collapse;margin-top:14px;table-layout:fixed} th,td{border:1px solid #999;padding:3px 4px;vertical-align:top}
    th{background:#e8eef7;text-align:left} td.n{text-align:right;white-space:nowrap} td.d{word-break:break-all}
    col.c1,col.c2{width:62px} col.c3{width:auto} col.c4{width:40px} col.c5,col.c6,col.c7{width:64px}
  </style></head><body>
    <h1>STATE BANK OF INDIA</h1><p>Account Name : Ms. KAVYA RAMESH (fictional)</p><p>Account Number : 000000XXXXX5520</p><p>Statement from 1 Jul 2026 to 30 Sep 2026</p>
    <table><colgroup><col class="c1"><col class="c2"><col class="c3"><col class="c4"><col class="c5"><col class="c6"><col class="c7"></colgroup>
    <thead><tr><th>Txn Date</th><th>Value Date</th><th>Description</th><th>Ref No./Cheque No.</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead>
    <tbody>${tr}</tbody></table></body></html>` };
}

// ---------- Fixtures ----------
function fixtures() {
  writeFileSync("tests/fixtures/kotak.csv", [
    "Kotak Mahindra Bank,,,,,", "Account No.,XXXX2231,,,,", ",,,,,",
    "Sl. No.,Date,Description,Chq / Ref No.,Withdrawal (Dr) / Deposit (Cr),Balance",
    '1,01-Jul-2026,"UPI/DR/426784531012/ZOMATO PAYMENTS/ZOMATO@ICICI/FOOD ORDER",UPI-426784531012,"347.00 Dr","9,653.00 Cr"',
    '2,02-Jul-2026,"NEFT/INWARD/CR-HDFC/INFOSYS BPO LTD/SAL JUL26/N042718362538143",,"52,000.00 Cr","61,653.00 Cr"',
    '3,02-Jul-2026,"FOR DUES OF SMS ALERT CHARGES",,"17.70 Dr","61,635.30 Cr"',
  ].join("\n"));
  writeFileSync("tests/fixtures/card.csv", [
    "Date,Transaction Details,Amount (Rs.)",
    "03/07/2026,NETFLIX.COM MUMBAI,649.00",
    "05/07/2026,PAYMENT RECEIVED - THANK YOU,\"12,000.00 Cr\"",
    "09/07/2026,SWIGGY BANGALORE,412.50",
  ].join("\n"));
  writeFileSync("tests/fixtures/newest-first.csv", [
    "Tran Date,CHQNO,PARTICULARS,DR,CR,BAL,SOL",
    "03-07-2026,,UPI/P2A/626181509069/TARAPADA /UTIB/Payment/,500.00,,9000.00,1234",
    "02-07-2026,,UPI/P2M/412345678901/SWIGGY LIMITED/Payment/AXIS BANK,,500.00,9500.00,1234",
    "01-07-2026,,OPENING BALANCE,,,10000.00,1234",
  ].join("\n"));
}

const p = priya(), a = arjun(), k = kavya();
fixtures();
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(k.html);
writeFileSync("public/samples/kavya-sbi.pdf", await page.pdf({ format: "A4", printBackground: true }));
await browser.close();
console.log(`priya ${p.length} rows · arjun ${a.length} rows · kavya ${k.rows.length} rows`);
