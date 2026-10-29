import { z } from "zod";
import type { Brief, Requirement } from "./types";
export const kind = z.enum([
  "basketball",
  "platform",
  "content",
  "activity",
  "partnership",
  "audience",
  "budget",
  "availability",
  "restriction",
]);
const short = z.string().trim().max(300);
const date = z
  .string()
  .refine(
    (v) =>
      !v ||
      (/^\d{4}-\d{2}-\d{2}$/.test(v) &&
        !Number.isNaN(Date.parse(v)) &&
        new Date(v).toISOString().slice(0, 10) === v),
    "Use a valid date",
  );
export const requirementSchema = z.object({
  id: z.string().min(1).max(100),
  kind,
  label: short.min(1),
  value: short,
  importance: z.enum(["must_have", "preferred"]),
});
export const briefSchema = z
  .object({
    name: short.min(1),
    objective: z.string().trim().min(1).max(3000),
    product: short.min(1),
    targetAudience: z.string().max(1000),
    platforms: z.array(short).max(10),
    contentFormats: z.array(short).max(10),
    startDate: date,
    endDate: date,
    budget: z.number().int().nonnegative().max(10000000000).nullable(),
    currency: z.enum(["USD", "EUR", "GBP", "CAD", "AUD"]),
    requirements: z.array(requirementSchema).min(1).max(60),
  })
  .refine(
    (b) => !b.startDate || !b.endDate || b.startDate <= b.endDate,
    "End date must follow start date",
  )
  .refine(
    (b) =>
      new Set(b.requirements.map((r) => r.id)).size === b.requirements.length,
    "Requirement IDs must be unique",
  );

export function normalizeBrief(brief: Brief): Brief {
  const requirements = brief.requirements.filter(
    (r) => !r.id.startsWith("sys:"),
  );
  const add = (
    kind: Requirement["kind"],
    value: string,
    label: string,
    importance: Requirement["importance"] = "must_have",
  ) => {
    if (
      !requirements.some(
        (r) => r.kind === kind && r.value.toLowerCase() === value.toLowerCase(),
      )
    )
      requirements.push({
        id: `sys:${kind}:${value.toLowerCase()}`,
        kind,
        value,
        label,
        importance,
      });
  };
  for (const p of brief.platforms.filter(Boolean))
    add("platform", p, `${p} content experience`);
  for (const f of brief.contentFormats.filter(Boolean))
    add("content", f, `${f} experience`);
  if (brief.targetAudience)
    add(
      "audience",
      "target audience",
      "Target audience alignment",
      "preferred",
    );
  if (brief.budget !== null && !requirements.some((r) => r.kind === "budget"))
    add("budget", "campaign budget", "Within the campaign budget");
  if (
    brief.startDate &&
    brief.endDate &&
    !requirements.some((r) => r.kind === "availability")
  )
    add("availability", "available", "Available for the campaign dates");
  return {
    ...brief,
    platforms: brief.platforms.filter(Boolean),
    contentFormats: brief.contentFormats.filter(Boolean),
    requirements,
  };
}
const httpUrl = z
  .string()
  .url()
  .refine(
    (v) => ["http:", "https:"].includes(new URL(v).protocol),
    "Only http/https sources are allowed",
  );
export const evidenceSchema = z
  .object({
    athleteId: z.string().min(1),
    category: kind,
    value: short.min(1),
    claim: z.string().trim().min(5).max(2000),
    sourceUrl: httpUrl,
    sourceTitle: short.min(1),
    publisher: short.min(1),
    excerpt: z.string().trim().min(5).max(2000),
    collectedAt: date.refine(Boolean, "Collection date is required"),
    publishedAt: date,
    reviewDueAt: date,
    validFrom: date,
    validUntil: date,
    supersedesId: z.string().optional(),
  })
  .refine(
    (e) => !e.validFrom || !e.validUntil || e.validFrom <= e.validUntil,
    "Invalid validity period",
  );
export const athleteSchema = z.object({
  name: short.min(1),
  position: short.min(1),
  number: z.string().max(4),
  team: short.min(1),
  bio: z.string().max(1000),
  rosterDate: date.refine(Boolean),
  sourceUrl: httpUrl,
});
export const evaluationSchema = z
  .object({
    runId: z.string(),
    participant: short.min(1),
    method: z.enum(["manual", "assisted"]),
    minutes: z.number().positive().max(10000),
    reviewMinutes: z.number().min(0),
    correct: z.number().int().min(0),
    reviewed: z.number().int().min(0),
    supported: z.number().int().min(0),
    material: z.number().int().min(0),
    missed: z.number().int().min(0),
    useful: z.boolean(),
    notes: z.string().max(3000),
  })
  .refine(
    (e) =>
      e.correct <= e.reviewed &&
      e.supported <= e.material &&
      e.reviewMinutes <= e.minutes,
    "Counts or review time exceed totals",
  );
