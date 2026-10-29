import type {
  Assessment,
  Evidence,
  Outcome,
  Requirement,
  Snapshot,
} from "./types";
const normalize = (s: string) => s.trim().toLowerCase();
export function usable(e: Evidence, asOf: string) {
  return (
    e.status === "approved" &&
    (!e.reviewDueAt || e.reviewDueAt >= asOf.slice(0, 10))
  );
}
function assessRequirement(
  r: Requirement,
  evidence: Evidence[],
  snapshot: Snapshot,
): Outcome {
  const unknown: Outcome = {
    requirementId: r.id,
    status: "unknown",
    explanation: "The approved research does not establish this requirement.",
    evidenceIds: [],
    confirmationQuestion: `Confirm: ${r.label.toLowerCase()}.`,
  };
  const es = evidence.filter(
    (e) => e.category === r.kind && usable(e, snapshot.asOf),
  );
  if (["budget", "availability", "restriction"].includes(r.kind)) {
    if (!snapshot.brief.startDate || !snapshot.brief.endDate)
      return {
        ...unknown,
        explanation:
          "Set campaign dates and obtain dated confirmation from the representative.",
      };
    const valid = es.filter(
      (e) =>
        e.validFrom &&
        e.validUntil &&
        e.validFrom <= snapshot.brief.startDate &&
        e.validUntil >= snapshot.brief.endDate &&
        (r.kind !== "restriction" ||
          e.value.startsWith(`${normalize(r.value)}:`)),
    );
    if (!valid.length)
      return {
        ...unknown,
        explanation:
          "No verified terms cover the full campaign period. Confirm with the athlete’s representative.",
      };
    if (r.kind === "budget") {
      const fees = valid
        .map((e) => {
          const [currency, amount] = e.value.split(":");
          return {
            e,
            currency,
            amount: /^\d+$/.test(amount || "") ? Number(amount) : NaN,
          };
        })
        .filter(
          (f) =>
            f.currency === snapshot.brief.currency &&
            Number.isFinite(f.amount) &&
            f.amount >= 0,
        );
      if (
        !fees.length ||
        snapshot.brief.budget === null ||
        new Set(fees.map((f) => f.amount)).size > 1
      )
        return unknown;
      const f = fees[0],
        fits = f.amount <= snapshot.brief.budget;
      return {
        requirementId: r.id,
        status: fits ? "supported" : "not_met",
        explanation: fits
          ? "A verified fee is within the stated campaign budget."
          : "The verified fee exceeds the campaign budget.",
        evidenceIds: [f.e.id],
        confirmationQuestion:
          "Reconfirm quoted scope and fees before contracting.",
      };
    }
    const outcomes = valid
      .map((e) =>
        r.kind === "availability"
          ? e.value === "available"
            ? true
            : e.value === "unavailable"
              ? false
              : null
          : e.value === `${normalize(r.value)}:clear`
            ? true
            : e.value === `${normalize(r.value)}:conflict`
              ? false
              : null,
      )
      .filter((v) => v !== null);
    if (!outcomes.length || new Set(outcomes).size > 1) return unknown;
    return {
      requirementId: r.id,
      status: outcomes[0] ? "supported" : "not_met",
      explanation: valid.find((e) =>
        [
          "available",
          "unavailable",
          `${normalize(r.value)}:clear`,
          `${normalize(r.value)}:conflict`,
        ].includes(e.value),
      )!.claim,
      evidenceIds: valid
        .filter((e) =>
          [
            "available",
            "unavailable",
            `${normalize(r.value)}:clear`,
            `${normalize(r.value)}:conflict`,
          ].includes(e.value),
        )
        .map((e) => e.id),
      confirmationQuestion: "Reconfirm these terms with the representative.",
    };
  }
  if (r.kind === "audience")
    return {
      ...unknown,
      explanation:
        "Audience fit requires a dated, authorized report and human interpretation. It is not inferred from identity.",
    };
  const matches = es.filter((e) => normalize(e.value) === normalize(r.value));
  if (!matches.length) return unknown;
  return {
    requirementId: r.id,
    status: "supported",
    explanation: matches[0].claim,
    evidenceIds: matches.map((e) => e.id),
    confirmationQuestion: ["platform", "content"].includes(r.kind)
      ? "Confirm willingness and capacity to deliver the requested content."
      : null,
  };
}
export function classify(
  requirements: Outcome[],
  snapshot: Snapshot,
): Assessment["classification"] {
  if (
    requirements.some(
      (o) =>
        o.status === "not_met" &&
        snapshot.brief.requirements.find((r) => r.id === o.requirementId)
          ?.importance === "must_have",
    )
  )
    return "documented_mismatch";
  return requirements.some(
    (o) =>
      o.status === "supported" &&
      !["budget", "availability", "restriction", "audience"].includes(
        snapshot.brief.requirements.find((r) => r.id === o.requirementId)!.kind,
      ),
  )
    ? "potential_fit"
    : "insufficient_evidence";
}
export function evaluate(snapshot: Snapshot): Assessment[] {
  return [...snapshot.athletes]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((a) => {
      const requirements = snapshot.brief.requirements.map((r) =>
        assessRequirement(
          r,
          snapshot.evidence.filter((e) => e.athleteId === a.id),
          snapshot,
        ),
      );
      return {
        athleteId: a.id,
        requirements,
        classification: classify(requirements, snapshot),
      };
    });
}
export function validateAssessments(result: Assessment[], snapshot: Snapshot) {
  if (
    result.length !== snapshot.athletes.length ||
    new Set(result.map((r) => r.athleteId)).size !== result.length
  )
    throw new Error("Invalid athlete coverage");
  for (const a of result) {
    if (!snapshot.athletes.some((p) => p.id === a.athleteId))
      throw new Error("Unknown athlete");
    if (
      a.requirements.length !== snapshot.brief.requirements.length ||
      new Set(a.requirements.map((r) => r.requirementId)).size !==
        a.requirements.length
    )
      throw new Error("Invalid requirement coverage");
    for (const r of a.requirements) {
      if (!snapshot.brief.requirements.some((q) => q.id === r.requirementId))
        throw new Error("Unknown requirement");
      if (r.status !== "unknown" && !r.evidenceIds.length)
        throw new Error("Uncited claim");
      for (const id of r.evidenceIds)
        if (
          !snapshot.evidence.some(
            (e) =>
              e.id === id &&
              e.athleteId === a.athleteId &&
              usable(e, snapshot.asOf),
          )
        )
          throw new Error("Invalid citation");
    }
  }
  return result;
}
