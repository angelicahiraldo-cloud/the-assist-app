import { test, expect } from "@playwright/test";
import { initialCatalog } from "../../lib/catalog";
import { fixture } from "../fixtures";
import { evaluate } from "../../lib/research";
import type { Run, Snapshot } from "../../lib/types";

// UI contract test uses intercepted AI results; actual provider calls are tested separately.
test("saving a campaign auto-submits live research and displays cited AI recommendations", async ({
  page,
}) => {
  const catalog = initialCatalog("browser-fixture");
  const snapshot: Snapshot = {
    ...catalog,
    brief: fixture().brief,
    asOf: new Date().toISOString(),
    engine: "anthropic:test:live-v2",
  };
  let run: Run = {
    id: "ui-live-run",
    campaignId: "",
    version: 1,
    inputHash: "test",
    state: "queued",
    createdAt: snapshot.asOf,
    reviewedAt: null,
    error: null,
    snapshot,
    result: [],
    decisions: [],
    changedEvidence: [],
    currentVersion: 1,
  };
  let submitted = false;
  await page.route("**/api/state", async (route) => {
    const response = await route.fetch();
    if (response.status() !== 200) return route.fulfill({ response });
    const body = await response.json();
    body.aiAvailable = true;
    await route.fulfill({ response, json: body });
  });
  await page.route("**/api/campaigns/*/runs", async (route) => {
    expect(route.request().postDataJSON().mode).toBe("ai");
    submitted = true;
    run.campaignId = route
      .request()
      .url()
      .split("/campaigns/")[1]
      .split("/")[0];
    const versions = await (
      await page.request.get(`/api/campaigns/${run.campaignId}`)
    ).json();
    run.snapshot.brief = JSON.parse(versions[0].payload);
    await route.fulfill({ json: run });
  });
  await page.route("**/api/runs/ui-live-run/process", async (route) => {
    const result = evaluate(snapshot);
    result[0].recommendation = {
      rank: 1,
      rationale: "Synthetic cited campaign-fit explanation for this UI test.",
      evidenceIds: [
        snapshot.evidence.find((e) => e.athleteId === result[0].athleteId)!.id,
      ],
      caveats: "Fees and availability remain unknown.",
    };
    run = {
      ...run,
      state: "awaiting_review",
      result,
      snapshot: {
        ...snapshot,
        research: {
          refreshedAt: snapshot.asOf,
          sources: [
            {
              id: "test-source",
              url: "https://mystics.wnba.com/roster",
              title: "Official roster",
              text: "",
            },
          ],
          warnings: [],
        },
      },
    };
    await route.fulfill({ json: run });
  });
  await page.goto("/signin-with-chatgpt?return_to=/");
  await page.getByRole("button", { name: "New campaign", exact: true }).click();
  await page
    .getByLabel("Campaign name", { exact: true })
    .fill(`Live UI ${Date.now()}`);
  await page
    .getByLabel("Product or collection", { exact: true })
    .fill("Training apparel");
  await page
    .getByLabel("Campaign objective", { exact: true })
    .fill("Introduce basketball apparel through community stories.");
  await page.getByRole("button", { name: "Save campaign brief" }).click();
  await expect(
    page.getByText(
      "Refreshing the Mystics roster and public athlete sources…",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByText("AI RECOMMENDATION #1 · REVIEW REQUIRED"),
  ).toBeVisible({ timeout: 15000 });
  expect(submitted).toBe(true);
  const card = page.locator(".research-card").first();
  await expect(card).toContainText("Synthetic cited campaign-fit explanation");
  await expect(card).toContainText("Fees and availability remain unknown");
  await card
    .getByRole("button", { name: /2026 Washington Mystics roster/ })
    .click();
  await expect(
    page.getByRole("link", { name: "Open original source" }),
  ).toHaveAttribute("href", "https://mystics.wnba.com/roster");
  await page.screenshot({
    path: "test-results/ai-recommendation.png",
    fullPage: true,
  });
});
