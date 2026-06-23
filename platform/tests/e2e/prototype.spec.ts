import { test, expect } from "@playwright/test";
import { pathToFileURL } from "node:url";
import path from "node:path";

// The prototype lives in the workspace root, one level above platform/.
const PROTOTYPE = pathToFileURL(
  path.resolve(__dirname, "../../../compliance-intelligence.html"),
).href;

test.beforeEach(async ({ page }) => {
  await page.goto(PROTOTYPE);
});

test("loads the executive overview by default", async ({ page }) => {
  await expect(page.locator("h1")).toContainText("Global compliance overview");
  // sidebar identity reflects the HS&E Director
  await expect(page.locator(".sidebar")).toContainText("Tony Hammond");
  await expect(page.locator(".sidebar")).not.toContainText("Paul Perera");
});

test("navigates to all primary sections", async ({ page }) => {
  for (const [hash, heading] of [
    ["#baseline", "Regulatory Baseline"],
    ["#change", "Regulatory Change Control"],
    ["#forecaster", "Regulatory Forecaster"],
    ["#sites", "Sites"],
    ["#actions", "Actions & Tasks"],
    ["#evidence", "Evidence Repository"],
    ["#watchlists", "Watchlists"],
    ["#alerts", "Alerts & Notifications"],
    ["#admin", "Administration"],
    ["#audit", "Audit Log"],
  ] as const) {
    await page.goto(`${PROTOTYPE}${hash}`);
    await expect(page.locator("#view h1")).toContainText(heading);
  }
});

test("change control shows the side-by-side diff with add/amend/remove highlighting", async ({ page }) => {
  await page.goto(`${PROTOTYPE}#change/CHG-2038`);
  await expect(page.locator(".split .pane")).toHaveCount(2);
  // highlight classes are present in the legal text
  await expect(page.locator(".split .ins").first()).toBeVisible();
  await expect(page.locator(".split .amd").first()).toBeVisible();
  await expect(page.locator(".split .del").first()).toBeVisible();
  // AI analysis is labelled as draft / requires review
  await expect(page.locator(".aibox")).toContainText("Requires expert review");
});

test("baseline table renders rows and filters by saved view", async ({ page }) => {
  await page.goto(`${PROTOTYPE}#baseline`);
  const rowCount = await page.locator("#blbody tr").count();
  expect(rowCount).toBeGreaterThan(20);
  // apply the high-risk saved view; row count should shrink
  await page.getByRole("button", { name: "High-risk obligations" }).click();
  const filtered = await page.locator("#blbody tr").count();
  expect(filtered).toBeLessThan(rowCount);
});

test("site workspace opens a compliance matrix for a high-risk site", async ({ page }) => {
  await page.goto(`${PROTOTYPE}#sites/changzhou`);
  await expect(page.locator("#view h1")).toContainText("Changzhou");
  await expect(page.locator("#view")).toContainText("Compliance matrix");
});

test("alerts screen renders the email alert preview", async ({ page }) => {
  await page.goto(`${PROTOTYPE}#alerts`);
  await expect(page.locator(".email")).toContainText("Action required");
  await expect(page.locator(".email")).toContainText("Ahrensburg");
});
