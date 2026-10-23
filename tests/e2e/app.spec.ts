import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

function watch(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  return errors;
}
const verdict = (page: Page) => page.getByRole("heading", { level: 1 });
const alert = (page: Page) => page.locator("[role=alert]:not(#__next-route-announcer__)");

test("landing explains itself and has one clear action", async ({ page }) => {
  const errors = watch(page);
  await page.goto("/");
  await expect(verdict(page)).toHaveText(/Find where your money leaks/);
  await expect(page.getByRole("button", { name: /Drop your bank statement here/ })).toBeVisible();
  await expect(page.getByText("Read on this device. Never uploaded. No sign-up.")).toBeVisible();
  for (const who of ["Priya", "Arjun", "Kavya"]) await expect(page.getByRole("button", { name: new RegExp(who) })).toBeVisible();
  expect(errors).toEqual([]);
});

for (const [who, keep] of [["Priya", /₹5\d,\d00/], ["Arjun", /₹4\d,\d00/], ["Kavya", /₹2\d,\d00/]] as const) {
  test(`sample ${who}: shows progress, then a verdict with findings`, async ({ page }) => {
    const errors = watch(page);
    await page.goto("/");
    await page.getByRole("button", { name: new RegExp(who) }).click();
    await expect(page.getByRole("status")).toContainText("Running the checks");
    await expect(verdict(page)).toHaveText(keep, { timeout: 15_000 });
    await expect(page.locator("article")).not.toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

test("uploading a CSV and an Excel file through the file picker", async ({ page }) => {
  await page.goto("/");
  await page.locator('input[type=file]').setInputFiles("public/samples/priya-hdfc.csv");
  await expect(page.getByText(/203 transactions · \d+ days/)).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "New statement" }).click();
  await page.locator('input[type=file]').setInputFiles("public/samples/arjun-icici.xlsx");
  await expect(page.getByText(/171 transactions · \d+ days/)).toBeVisible({ timeout: 15_000 });
});

test("dropping a file anywhere on the page", async ({ page }) => {
  await page.goto("/");
  const buffer = readFileSync("public/samples/priya-hdfc.csv").toString("base64");
  const dt = await page.evaluateHandle((b64) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const d = new DataTransfer();
    d.items.add(new File([bytes], "dropped.csv", { type: "text/csv" }));
    return d;
  }, buffer);
  await page.dispatchEvent("body", "drop", { dataTransfer: dt });
  await expect(page.getByText("dropped.csv")).toBeVisible({ timeout: 15_000 });
  await expect(verdict(page)).toHaveText(/You could save/, { timeout: 15_000 });
});

test("password-protected PDF: asks, rejects a wrong password, opens with the right one", async ({ page }) => {
  await page.goto("/");
  await page.locator('input[type=file]').setInputFiles("tests/fixtures/kavya-locked.pdf");
  const pw = page.getByLabel("PDF password");
  await expect(pw).toBeVisible({ timeout: 15_000 });
  await pw.fill("nope");
  await page.getByRole("button", { name: "Open statement" }).click();
  await expect(alert(page)).toContainText("didn't work", { timeout: 15_000 });
  await page.getByLabel("PDF password").fill("KAVY0101");
  await page.getByRole("button", { name: "Open statement" }).click();
  await expect(page.getByText(/123 transactions · \d+ days/)).toBeVisible({ timeout: 15_000 });
});

test("a file that isn't a statement gets a clear, fixable message", async ({ page }) => {
  await page.goto("/");
  await page.locator('input[type=file]').setInputFiles("tests/fixtures/not-a-statement.csv");
  await expect(alert(page)).toContainText("Couldn't find the transaction table", { timeout: 15_000 });
  await page.getByRole("button", { name: "Dismiss" }).click();
  await expect(alert(page)).toHaveCount(0);
});

test.describe("the report", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Priya/ }).click();
    await expect(verdict(page)).toHaveText(/You could save/, { timeout: 15_000 });
  });

  test("findings list subscriptions, fees, double charge and delivery with savings", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /8 subscriptions quietly renewing/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Your bank charged you ₹625 in fees/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: /1 possible double charge/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: /a year on food delivery/ })).toBeVisible();
    await expect(page.getByText("Could save").first()).toBeVisible();
    await expect(page.locator("main")).not.toContainText(/could keep|would keep/i);
  });

  test("'See the payments' filters the evidence locker to exactly that finding", async ({ page }) => {
    await page.getByRole("button", { name: "See the 2 payments" }).click();
    await expect(page.getByText(/^2 transactions/)).toBeVisible();
    await expect(page.locator("section[aria-labelledby=locker-title] ul.divide-y > li")).toHaveCount(2);
    await page.getByRole("button", { name: "Clear filter" }).click();
    await expect(page.getByText(/^203 transactions/)).toBeVisible();
  });

  test("a category bar filters the locker", async ({ page }) => {
    await page.getByRole("button", { name: /^Food delivery: ₹/ }).click();
    await expect(page.getByText(/^51 transactions/)).toBeVisible();
  });

  test("search finds by merchant", async ({ page }) => {
    await page.getByPlaceholder("Search a merchant, UPI ID or category").fill("netflix");
    await expect(page.getByText(/^3 transactions/)).toBeVisible();
  });

  test("re-labelling a merchant updates the whole report", async ({ page }) => {
    await page.getByPlaceholder("Search a merchant, UPI ID or category").fill("audible");
    await page.getByLabel("Category for Audible").first().selectOption("Education");
    await expect(page.getByText(/Audible: 3 payments moved to Education/)).toBeVisible();
    await page.getByLabel("Category for Audible").first().selectOption("Insurance");
    await expect(page.getByRole("heading", { name: /7 subscriptions quietly renewing/ })).toBeVisible();
  });

  test("downloads a categorised CSV", async ({ page }) => {
    const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Categorised CSV" }).click()]);
    expect(dl.suggestedFilename()).toBe("priya-hdfc-categorised.csv");
    const text = readFileSync((await dl.path())!, "utf8");
    expect(text.split("\n")).toHaveLength(204);
    expect(text).toContain("Food delivery");
  });

  test("'New statement' goes back to the start", async ({ page }) => {
    await page.getByRole("button", { name: "New statement" }).click();
    await expect(verdict(page)).toHaveText(/Find where your money leaks/);
  });
});

test("header states the privacy promise; the source link lives in the footer", async ({ page, isMobile }) => {
  await page.goto("/");
  await expect(page.locator("header")).toContainText(isMobile ? "Never uploaded" : "Your file never leaves this device");
  await expect(page.locator("header a[href*='github.com']")).toHaveCount(0);
  await expect(page.locator("footer").getByRole("link", { name: /Source code on GitHub/ })).toHaveAttribute("href", "https://github.com/manicpsycho01/statement-autopsy");
});
