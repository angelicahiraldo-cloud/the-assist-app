// Explicit manual integration check. Reads the user's local key; never prints it.
import { readFileSync } from "node:fs";
import {
  refreshPublicResearch,
  recommendFromPublicResearch,
  ResearchError,
} from "../lib/live-research";
import { initialCatalog } from "../lib/catalog";
import { normalizeBrief } from "../lib/schemas";
const key = readFileSync(
  new URL("../../API Key.md", import.meta.url),
  "utf8",
).match(/sk-ant-[A-Za-z0-9_-]+/)?.[0];
if (!key) throw new Error("No Anthropic key found in the local key file.");
const config = { apiKey: key, model: "claude-sonnet-4-6" };
const catalog = initialCatalog("live-check");
try {
  const fresh = await refreshPublicResearch(
    {
      ...catalog,
      engine: `anthropic:${config.model}:live-v2`,
      asOf: new Date().toISOString(),
      brief: normalizeBrief({
        name: "Community basketball launch",
        objective:
          "Introduce a basketball training collection through youth coaching, community involvement and athlete-led movement stories.",
        product: "Basketball training apparel",
        targetAudience: "Adults interested in basketball and youth coaches",
        platforms: ["Instagram"],
        contentFormats: ["Short-form video"],
        startDate: "2026-12-01",
        endDate: "2026-12-31",
        budget: 1000000,
        currency: "USD",
        requirements: [
          {
            id: "community",
            kind: "activity",
            label: "Documented community basketball work",
            value: "community",
            importance: "preferred",
          },
        ],
      }),
    },
    "live-check",
    config,
  );
  console.log(
    JSON.stringify({
      phase: "collected",
      athletes: fresh.athletes.length,
      sources: fresh.research?.sources.length,
      warnings: fresh.research?.warnings,
    }),
  );
  const result = await recommendFromPublicResearch(fresh, config);
  console.log(
    JSON.stringify({
      phase: "verified",
      warnings: result.snapshot.research?.warnings,
      evidenceCount: result.snapshot.evidence.length,
      recommendations: result.result
        .filter((a) => a.recommendation)
        .map((a) => ({
          name: fresh.athletes.find((p) => p.id === a.athleteId)?.name,
          ...a.recommendation,
        })),
    }),
  );
} catch (error) {
  console.error(
    JSON.stringify({
      phase: "failed",
      type: error instanceof Error ? error.name : "Unknown",
      message:
        error instanceof ResearchError
          ? error.message
          : "Provider or source check failed; no secrets logged.",
      status:
        error && typeof error === "object" && "status" in error
          ? error.status
          : undefined,
    }),
  );
  process.exitCode = 1;
}
