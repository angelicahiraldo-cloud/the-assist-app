import { test, expect } from "@playwright/test";
test("sign in, create brief, research, compare, select, export, and persist", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("link", { name: "Sign in with ChatGPT" }).click();
  await expect(
    page.getByRole("heading", { name: "Good research. Better connections." }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/dashboard.png", fullPage: true });
  const initialState = await (await page.request.get("/api/state")).json();
  const athleteCount = initialState.athletes.length;
  await page.getByRole("button", { name: "New campaign", exact: true }).click();
  const campaign = `Browser campaign ${Date.now()}`;
  await page.getByLabel("Campaign name", { exact: true }).fill(campaign);
  await page
    .getByLabel("Product or collection", { exact: true })
    .fill("Test collection");
  await page
    .getByLabel("Campaign objective", { exact: true })
    .fill("Evaluate a women’s activewear partnership.");
  await page.getByRole("button", { name: "Save campaign brief" }).click();
  const card = page
    .locator(".campaign-card")
    .filter({ has: page.getByRole("heading", { name: campaign }) });
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Build research shortlist" }).click();
  await expect(
    page.getByRole("heading", { name: campaign, exact: true }),
  ).toBeVisible();
  await expect(page.locator(".research-card")).toHaveCount(athleteCount);
  const cards = page.locator(".research-card");
  await cards.nth(0).getByLabel("Compare", { exact: true }).check();
  await cards.nth(1).getByLabel("Compare", { exact: true }).check();
  await page.getByRole("button", { name: "Compare (2)", exact: true }).click();
  await expect(page.locator(".comparison-table")).toBeVisible();
  await page.screenshot({
    path: "test-results/comparison.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Research shortlist", exact: true })
    .click();
  await cards
    .first()
    .getByRole("button", { name: "Keep for follow-up", exact: true })
    .click();
  await expect(
    cards
      .first()
      .getByRole("button", { name: "Keep for follow-up", exact: true }),
  ).toHaveClass(/chosen/);
  await page
    .getByRole("button", { name: "Decision summary", exact: true })
    .click();
  await expect(page.locator(".summary-card")).toHaveCount(1);
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download Markdown" }).click();
  expect((await download).suggestedFilename()).toBe("the-assist-shortlist.md");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: campaign, exact: true }),
  ).toBeVisible();
  await expect(page.locator(".decision-btn.chosen")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Athlete library", exact: true })
    .click();
  await expect(page.locator(".athlete-card")).toHaveCount(athleteCount);
  await page.getByRole("button", { name: /Shakira Austin/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: /Listed on the 2026/ }).click();
  await expect(
    page.getByRole("link", { name: "Open original source" }),
  ).toHaveAttribute("href", "https://mystics.wnba.com/roster");
  expect(errors).toEqual([]);
});
test("mobile layout, navigation, and empty search", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/signin-with-chatgpt?return_to=/");
  await expect(
    page.getByRole("heading", { name: "Good research. Better connections." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("button", { name: "Athlete library", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Search name or position…" })
    .fill("nonexistent");
  await expect(
    page.getByRole("heading", { name: "No athletes found" }),
  ).toBeVisible();
});
test("anonymous API and cross-origin mutations are denied", async ({
  request,
  page,
}) => {
  const r = await request.get("/api/state");
  expect(r.status()).toBe(401);
  await page.goto("/signin-with-chatgpt?return_to=/");
  await expect(
    page.getByRole("heading", { name: "Good research. Better connections." }),
  ).toBeVisible();
  const denied = await page.request.post("/api/campaigns", {
    headers: {
      Origin: "https://untrusted.example",
      "Content-Type": "application/json",
    },
    data: {},
  });
  expect(denied.status()).toBe(403);
});

test("add athlete, curate evidence, approve, and request a correction", async ({
  page,
}) => {
  await page.goto("/signin-with-chatgpt?return_to=/");
  await expect(
    page.getByRole("heading", { name: "Good research. Better connections." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Athlete library", exact: true })
    .click();
  await page.getByRole("button", { name: "Add athlete", exact: true }).click();
  const name = `Synthetic QA athlete ${Date.now()}`;
  await page.getByLabel("Full name", { exact: true }).fill(name);
  await page.getByLabel("Position", { exact: true }).fill("Guard");
  await page
    .getByLabel("Roster source URL", { exact: true })
    .fill("https://example.org/synthetic-fixture");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add athlete", exact: true })
    .click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Research & sources", exact: true })
    .click();
  await page.getByRole("button", { name: "Add research", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Athlete", exact: true })
    .selectOption({ label: name });
  await page.getByLabel(/^Evidence value/).fill("fitness");
  const claim = `Synthetic fitness content for ${name}`;
  await page.getByLabel("Documented claim", { exact: true }).fill(claim);
  await page
    .getByLabel("Source title", { exact: true })
    .fill("Synthetic QA source");
  await page.getByLabel("Publisher", { exact: true }).fill("Test fixture");
  await page
    .getByLabel("Source URL", { exact: true })
    .fill("https://example.org/source");
  await page
    .getByLabel("Supporting excerpt or locator", { exact: true })
    .fill("This is synthetic evidence exclusively for browser testing.");
  await page.getByRole("button", { name: "Save draft source" }).click();
  const row = page
    .locator("tr")
    .filter({ has: page.getByRole("button", { name: claim, exact: true }) });
  await expect(row).toContainText("Draft");
  await row.getByRole("combobox").selectOption("approved");
  await expect(row).toContainText("Approved");
  await page.getByRole("button", { name: claim, exact: true }).click();
  await page
    .getByLabel("Something needs a second look?")
    .fill("Check this synthetic source again.");
  await page.getByRole("button", { name: "Request a correction" }).click();
  await expect(
    page.getByRole("button", { name: "Correction recorded" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await expect(
    page
      .locator(".correction")
      .filter({ hasText: "Check this synthetic source again." }),
  ).toBeVisible();
});

test("record a pilot session and export its data", async ({ page }) => {
  await page.goto("/signin-with-chatgpt?return_to=/");
  await expect(
    page.getByRole("heading", { name: "Good research. Better connections." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Pilot insights", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Record a session", exact: true })
    .click();
  const participant = `QA reviewer ${Date.now()}`;
  await page.getByLabel("Participant code", { exact: true }).fill(participant);
  await page.getByLabel("Total elapsed minutes", { exact: true }).fill("45");
  await page.getByLabel("Of which: review minutes", { exact: true }).fill("10");
  await page.getByLabel("Correct factual claims", { exact: true }).fill("10");
  await page.getByLabel("Total claims checked", { exact: true }).fill("10");
  await page
    .getByLabel("Claims with valid sources", { exact: true })
    .fill("10");
  await page.getByLabel("Total material claims", { exact: true }).fill("10");
  await page.getByLabel("Missed restrictions", { exact: true }).fill("0");
  await page.getByRole("button", { name: "Save measurement" }).click();
  await expect(page.getByText(participant, { exact: true })).toBeVisible();
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export results", exact: true })
    .click();
  expect((await downloaded).suggestedFilename()).toBe(
    "the-assist-pilot-results.json",
  );
});
