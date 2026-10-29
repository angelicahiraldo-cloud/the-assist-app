import test from "node:test";
import assert from "node:assert/strict";
import { mergeConnections } from "../lib/ai";
import { fixture } from "./fixtures";
import { evaluate } from "../lib/research";
import { normalizeBrief, briefSchema } from "../lib/schemas";
const prepare = () => {
  const s = fixture();
  s.evidence = [
    {
      id: "e1",
      athleteId: "athlete-a",
      category: "content" as const,
      value: "workout",
      claim: "Synthetic workout video",
      excerpt: "Synthetic test evidence",
      sourceUrl: "https://example.org",
      sourceTitle: "Synthetic source",
      publisher: "Test",
      collectedAt: "2026-10-29",
      publishedAt: "",
      reviewDueAt: "2027-01-01",
      validFrom: "2026-10-01",
      validUntil: "2027-01-01",
      status: "approved" as const,
    },
  ];
  return s;
};
const connection = {
  athleteId: "athlete-a",
  requirementId: "r1",
  evidenceIds: ["e1"],
  interpretation:
    "A documented workout video may be relevant to the fitness-content requirement.",
};
test("AI only augments grounded subjective connections and preserves commercial unknowns", () => {
  const s = prepare();
  const r = mergeConnections({ connections: [connection] }, s);
  assert.equal(r[0].requirements[0].status, "supported");
  assert.equal(r[0].requirements[1].status, "unknown");
  assert.match(r[0].requirements[0].explanation, /AI interpretation/);
});
test("AI fabricated IDs, duplicated connections and commercial overreach are rejected", () => {
  const s = prepare();
  for (const c of [
    { ...connection, athleteId: "fake" },
    { ...connection, evidenceIds: ["fake"] },
    { ...connection, requirementId: "r2" },
    { ...connection, interpretation: "The athlete is available for free." },
  ])
    assert.throws(() => mergeConnections({ connections: [c] }, s));
  assert.throws(() =>
    mergeConnections({ connections: [connection, connection] }, s),
  );
});
test("an empty model result cannot manufacture fit", () =>
  assert.equal(
    mergeConnections({ connections: [] }, prepare())[0].classification,
    "insufficient_evidence",
  ));
test("commercial restriction must match its category", () => {
  const s = prepare();
  s.brief.requirements = [
    {
      id: "restriction",
      kind: "restriction",
      label: "No activewear conflict",
      value: "activewear",
      importance: "must_have",
    },
  ];
  s.evidence = [
    { ...s.evidence[0], category: "restriction", value: "beverages:clear" },
  ];
  assert.equal(evaluate(s)[0].requirements[0].status, "unknown");
  s.evidence[0].value = "activewear:conflict";
  assert.equal(evaluate(s)[0].classification, "documented_mismatch");
});
test("malformed or empty fee amounts are not treated as zero", () => {
  const s = prepare();
  s.evidence = [{ ...s.evidence[0], category: "budget", value: "USD:" }];
  assert.equal(evaluate(s)[0].requirements[1].status, "unknown");
});
test("structured brief fields always become comparison requirements", () => {
  const b = fixture().brief;
  b.platforms = ["Instagram"];
  b.contentFormats = ["Short-form video"];
  b.targetAudience = "Adults interested in fitness";
  const out = normalizeBrief(b);
  assert.ok(
    out.requirements.some(
      (r) => r.kind === "platform" && r.value === "Instagram",
    ),
  );
  assert.ok(out.requirements.some((r) => r.kind === "audience"));
  assert.equal(
    normalizeBrief(out).requirements.length,
    out.requirements.length,
  );
});
test("impossible dates are rejected", () =>
  assert.equal(
    briefSchema.safeParse({ ...fixture().brief, startDate: "2026-02-31" })
      .success,
    false,
  ));
