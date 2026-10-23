/**
 * Recognises who a transaction was with and what kind of spend it is, from the bank narration.
 * Narrations look like "UPI/412345678901/SWIGGY/swiggy@axb/Axis Bank" or
 * "UPI-ZOMATO LTD-zomato@hdfcbank-HDFC0000001-4123…" — known merchants are matched by keyword,
 * anything else is named from the most name-like token so repeat payments still group together.
 */

export const CATEGORIES = [
  "Food delivery", "Groceries", "Dining out", "Shopping", "Subscriptions", "Bills & utilities", "Rent",
  "Transport", "Fuel", "Travel", "Health", "Entertainment", "Education", "Insurance", "Investments",
  "Loans & EMIs", "Credit card bill", "Cash withdrawal", "Bank charges", "Sent to people", "Other spending",
  "Salary", "Interest", "Refunds & cashback", "Received from people", "Other income",
] as const;
export type Category = (typeof CATEGORIES)[number];

/** Spending categories that are fixed commitments rather than discretionary leaks. */
export const COMMITMENTS: Category[] = ["Rent", "Loans & EMIs", "Insurance", "Investments", "Credit card bill", "Bills & utilities"];

type Rule = [RegExp, string, Category, string?];

/** [pattern, display name, category, subscription family] */
const RULES: Rule[] = [
  // Food delivery & quick commerce
  [/swiggy\s*instamart|instamart/i, "Swiggy Instamart", "Groceries"],
  [/swiggy/i, "Swiggy", "Food delivery"],
  [/zomato/i, "Zomato", "Food delivery"],
  [/eatsure|faasos|box8|magicpin/i, "Food delivery app", "Food delivery"],
  [/zepto/i, "Zepto", "Groceries"],
  [/blinkit|grofers/i, "Blinkit", "Groceries"],
  [/bigbasket|bbnow|bb now/i, "BigBasket", "Groceries"],
  [/dmart|avenue supermart/i, "DMart", "Groceries"],
  [/jiomart|reliance (retail|smart|fresh)/i, "JioMart / Reliance", "Groceries"],
  [/more retail|spencer|nature'?s basket|ratnadeep/i, "Supermarket", "Groceries"],
  // Subscriptions
  [/netflix/i, "Netflix", "Subscriptions", "video"],
  [/spotify/i, "Spotify", "Subscriptions", "music"],
  [/jio\s?hotstar|hotstar|disney/i, "JioHotstar", "Subscriptions", "video"],
  [/prime\s?video|amazon\s?prime|primemember/i, "Amazon Prime", "Subscriptions", "video"],
  [/youtube|google\s?\*?youtube/i, "YouTube Premium", "Subscriptions", "video"],
  [/sony\s?liv|sonyliv/i, "SonyLIV", "Subscriptions", "video"],
  [/zee5/i, "ZEE5", "Subscriptions", "video"],
  [/apple\s?music/i, "Apple Music", "Subscriptions", "music"],
  [/icloud/i, "iCloud+", "Subscriptions", "cloud"],
  [/apple\.com|apple services|itunes/i, "Apple", "Subscriptions"],
  [/google\s?one/i, "Google One", "Subscriptions", "cloud"],
  [/google\s?play/i, "Google Play", "Subscriptions"],
  [/audible/i, "Audible", "Subscriptions"],
  [/linkedin/i, "LinkedIn Premium", "Subscriptions"],
  [/openai|chatgpt/i, "ChatGPT", "Subscriptions", "ai"],
  [/anthropic|claude\.ai/i, "Claude", "Subscriptions", "ai"],
  [/notion/i, "Notion", "Subscriptions"],
  [/adobe/i, "Adobe", "Subscriptions"],
  [/microsoft|office\s?365/i, "Microsoft", "Subscriptions"],
  [/cult\.?fit|curefit|cultfit/i, "cult.fit", "Subscriptions", "fitness"],
  [/gym|fitness/i, "Gym", "Subscriptions", "fitness"],
  [/times\s?prime|swiggy\s?one|zomato\s?gold/i, "Membership", "Subscriptions"],
  // Bills & utilities
  [/airtel/i, "Airtel", "Bills & utilities"],
  [/jio(?!\s?(mart|hotstar))|reliance\s?jio/i, "Jio", "Bills & utilities"],
  [/vodafone|\bvi\b|vodaidea/i, "Vi", "Bills & utilities"],
  [/bsnl/i, "BSNL", "Bills & utilities"],
  [/act\s?fibernet|hathway|excitel|you\s?broadband/i, "Broadband", "Bills & utilities"],
  [/bescom|tata\s?power|adani\s?electricity|msedcl|mseb|tneb|tangedco|bses|cesc|electricity/i, "Electricity", "Bills & utilities"],
  [/mahanagar gas|igl|indraprastha gas|indane|bharat\s?gas|hp\s?gas|gas cylinder/i, "Gas", "Bills & utilities"],
  [/water (board|bill)|bwssb/i, "Water", "Bills & utilities"],
  [/dth|tata\s?play|dish\s?tv|sun\s?direct/i, "DTH", "Bills & utilities"],
  // Shopping
  [/amazon|amzn/i, "Amazon", "Shopping"],
  [/flipkart/i, "Flipkart", "Shopping"],
  [/myntra/i, "Myntra", "Shopping"],
  [/ajio/i, "AJIO", "Shopping"],
  [/nykaa/i, "Nykaa", "Shopping"],
  [/meesho/i, "Meesho", "Shopping"],
  [/decathlon|ikea|croma|reliance digital|lifestyle|westside|pantaloons|h&m|zara|uniqlo/i, "Store", "Shopping"],
  // Transport, fuel, travel
  [/uber/i, "Uber", "Transport"],
  [/\bola\b|olacabs|ani technologies/i, "Ola", "Transport"],
  [/rapido|roppen/i, "Rapido", "Transport"],
  [/namma\s?yatri|metro|bmtc|best bus/i, "Public transport", "Transport"],
  [/fastag|netc/i, "FASTag", "Transport"],
  [/indian\s?oil|iocl|hpcl|hindustan petroleum|bpcl|bharat petroleum|shell|petrol|fuel/i, "Fuel", "Fuel"],
  [/irctc/i, "IRCTC", "Travel"],
  [/makemytrip|goibibo|cleartrip|ixigo|easemytrip|redbus|yatra/i, "Travel booking", "Travel"],
  [/indigo|interglobe|air\s?india|vistara|akasa|spicejet/i, "Airline", "Travel"],
  [/oyo|airbnb|booking\.com|agoda|taj hotels|marriott/i, "Stay", "Travel"],
  // Dining & entertainment
  [/starbucks|third wave|blue tokai|chaayos|cafe coffee day|ccd/i, "Café", "Dining out"],
  [/mcdonald|domino|kfc|burger king|pizza hut|subway|haldiram|restaurant|dhaba|bar & grill|eatery/i, "Restaurant", "Dining out"],
  [/bookmyshow|pvr|inox|cinepolis|district/i, "Movies & events", "Entertainment"],
  [/steam|playstation|xbox|dream11|mpl/i, "Games", "Entertainment"],
  // Health, education, insurance
  [/pharmeasy|1mg|tata 1mg|netmeds|apollo|medplus|pharmacy|chemist/i, "Pharmacy", "Health"],
  [/practo|hospital|clinic|diagnostic|lab|thyrocare|healthians/i, "Healthcare", "Health"],
  [/udemy|coursera|byju|unacademy|upgrad|school|college|tuition/i, "Education", "Education"],
  [/\blic\b|life insurance|hdfc\s?life|icici\s?pru|sbi\s?life|max\s?life|star\s?health|niva|bupa|acko|digit insurance|policybazaar|insurance|premium/i, "Insurance", "Insurance"],
  // Money management
  [/zerodha|groww|upstox|kuvera|coin by|paytm money|indmoney|smallcase|iccl|indian clearing|nse clearing|bse ltd|bse limited|mutual fund|\bsip\b|camsonline|kfintech|ppf|\bnps\b/i, "Investments", "Investments"],
  [/\bcred\b|credit card|cc payment|card payment|billdesk.*card|autopay.*card/i, "Credit card bill", "Credit card bill"],
  [/\bemi\b|loan|bajaj fin|home first|hdfc ltd|lic housing|nach.*(fin|loan)/i, "Loan EMI", "Loans & EMIs"],
  [/\brent\b|nobroker|housing\.com|landlord|pg rent|maintenance/i, "Rent", "Rent"],
  [/urban\s?company|urbanclap/i, "Urban Company", "Other spending"],
];

const INCOME_RULES: Rule[] = [
  [/salary|sal cr|payroll|\bsal\b/i, "Salary", "Salary"],
  [/int\.?\s?pd|interest|int cr|cr int|sb int/i, "Interest", "Interest"],
  [/refund|reversal|rev\b|cashback|reward/i, "Refund", "Refunds & cashback"],
];

/** Patterns for charges the bank itself takes, with a plain-English label. */
export const FEE_RULES: [RegExp, string][] = [
  [/sms|alert/i, "SMS alert charges"],
  [/annual|ann\.?\s?fee|amc|dc fee|debit card.*(fee|chg|charge)|card (issuance|renewal)/i, "Card annual fee"],
  [/min(imum)?\.?\s?bal|non[\s-]?maint|\bamb\b|\bmab\b|\bqab\b/i, "Minimum balance penalty"],
  [/atm|atw|nfs|cash wdl chg|txn (chg|charge)/i, "ATM charges"],
  [/bounce|return|ret chg|ecs|nach|insuff|dishonou?r|inward rtn/i, "Payment bounce charges"],
  [/forex|markup|cross[\s-]?currency|\bdcc\b|international/i, "Forex markup"],
  [/late|penal|overdue/i, "Late payment penalty"],
  [/stamp|cheque book|chq book|statement|duplicate/i, "Service charges"],
];
const FEE_HINT = /\b(chg|chgs|chrg|charges?|fee|fees|penalty|penal|gst|igst|cgst|sgst)\b/i;

const PERSONAL_HANDLES = /@(ok(axis|sbi|hdfcbank|icici)|ybl|ibl|axl|paytm|apl|upi|yapl|naviaxis|superyes|kotak|sbi|icici|hdfcbank|axisbank|idfcbank|fbl|jupiteraxis|fam)/i;
const BUSINESS_WORDS = /(pvt|ltd|limited|llp|enterprises|traders|stores?|mart|foods|services|solutions|technologies|retail|payments|merchant|shop|restaurant|cafe|pharma|medical|hotel|agenc|india|stall|bakery|bakers|\btea\b|chai|juice|corner|parking|canteen|mess|xerox|prints?|kirana|sweets|bhavan|tiffin|fruits|vegetables|provision|supermarket|point|centre|center|salon|tailor|laundry|garage|motors|electricals|hardware|stationery|book|bazaar|dhaba|biryani|kitchen)/i;

export type Recognised = { key: string; name: string; category: Category; family?: string; fee?: string };

const STOP = new Set(["upi", "dr", "cr", "p2m", "p2a", "neft", "imps", "rtgs", "ach", "nach", "pos", "ecom", "payment", "pay", "paid", "sent", "to", "from", "transfer", "trf", "via", "ref", "na", "null", "txn", "debit", "credit", "card", "visa", "mastercard", "rupay", "phone", "ph", "mob", "bank", "inb", "mb", "ib", "collect", "request", "the", "for", "by", "of", "india", "upi payment", "payment from ph", "paytm", "phonepe", "google pay", "gpay", "bhim", "ltd", "pvt", "limited"]);
const titleCase = (s: string) => s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());

/** Best guess at the counterparty name inside a narration. */
export function counterparty(desc: string): { name: string; handle?: string } {
  const handle = desc.match(/([a-z0-9._-]+@[a-z]+)/i)?.[1];
  const tokens = desc
    .split(/[/|:\\]|(?<=\S)-(?=\S)|\s-\s|\s{2,}/)
    .map((t) => t.trim())
    .filter((t) => t && !t.includes("@"))
    .filter((t) => !/^\d[\d\s]*$/.test(t) && !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(t) && !/^[A-Z]{4}$/.test(t) && !/^x+\d+$/i.test(t))
    .filter((t) => !STOP.has(t.toLowerCase()) && /[a-z]{3}/i.test(t));
  const name = tokens.find((t) => !/^(to|by|from)\b/i.test(t)) ?? (handle ? handle.split("@")[0]! : desc.slice(0, 24));
  return { name: titleCase(name.replace(/\b(upi|neft|imps)\b/gi, "").replace(/\s+/g, " ").trim()).slice(0, 40), handle };
}

export function recognise(desc: string, amount: number): Recognised {
  const debit = amount < 0;
  if (debit && FEE_HINT.test(desc) && !/emi|loan|insurance|premium|rent/i.test(desc) && Math.abs(amount) < 5000) {
    const fee = FEE_RULES.find(([re]) => re.test(desc))?.[1] ?? (/gst/i.test(desc) ? "GST on bank charges" : "Other bank charges");
    return { key: `fee:${fee}`, name: fee, category: "Bank charges", fee };
  }
  if (debit && /\b(atm|atw|nwd|cash wdl|cash withdrawal|cwdr)\b/i.test(desc)) return { key: "cash", name: "ATM cash", category: "Cash withdrawal" };
  if (!debit) {
    const inc = INCOME_RULES.find(([re]) => re.test(desc));
    if (inc) return { key: `in:${inc[1]}`, name: inc[1], category: inc[2] };
  }
  const rule = RULES.find(([re]) => re.test(desc));
  if (rule) return { key: rule[1].toLowerCase(), name: rule[1], category: debit ? rule[2] : "Refunds & cashback", ...(rule[3] ? { family: rule[3] } : {}) };
  const cp = counterparty(desc);
  const key = cp.name.toLowerCase().replace(/[^a-z0-9]/g, "") || "unknown";
  const looksPersonal =
    /p2a/i.test(desc) ||
    (cp.handle && (/^\d{10}/.test(cp.handle) || PERSONAL_HANDLES.test(cp.handle)) && !BUSINESS_WORDS.test(desc)) ||
    (/\b(neft|imps)\b/i.test(desc) && !BUSINESS_WORDS.test(desc));
  if (!debit) return { key: `in:${key}`, name: cp.name, category: looksPersonal ? "Received from people" : "Other income" };
  return { key, name: cp.name, category: looksPersonal ? "Sent to people" : "Other spending" };
}
