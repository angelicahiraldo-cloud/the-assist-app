import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
export const workspaces = sqliteTable("workspaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: text("created_at").notNull(),
});
export const athletes = sqliteTable(
  "athletes",
  {
    id: text("id").primaryKey(),
    owner: text("owner")
      .notNull()
      .references(() => workspaces.id),
    payload: text("payload").notNull(),
  },
  (t) => [index("athletes_owner").on(t.owner)],
);
export const evidence = sqliteTable(
  "evidence",
  {
    id: text("id").primaryKey(),
    owner: text("owner")
      .notNull()
      .references(() => workspaces.id),
    athleteId: text("athlete_id")
      .notNull()
      .references(() => athletes.id),
    status: text("status").notNull(),
    payload: text("payload").notNull(),
  },
  (t) => [index("evidence_owner").on(t.owner, t.athleteId)],
);
export const campaigns = sqliteTable(
  "campaigns",
  {
    id: text("id").primaryKey(),
    owner: text("owner")
      .notNull()
      .references(() => workspaces.id),
    version: integer("version").notNull(),
    payload: text("payload").notNull(),
    createdAt: text("created_at").notNull(),
    archived: integer("archived").notNull().default(0),
  },
  (t) => [index("campaigns_owner").on(t.owner)],
);
export const versions = sqliteTable(
  "campaign_versions",
  {
    id: text("id").primaryKey(),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => campaigns.id),
    owner: text("owner").notNull(),
    version: integer("version").notNull(),
    payload: text("payload").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [uniqueIndex("campaign_version_unique").on(t.campaignId, t.version)],
);
export const runs = sqliteTable(
  "research_runs",
  {
    id: text("id").primaryKey(),
    owner: text("owner")
      .notNull()
      .references(() => workspaces.id),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => campaigns.id),
    version: integer("version").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    inputHash: text("input_hash").notNull(),
    snapshot: text("snapshot").notNull(),
    result: text("result"),
    state: text("state").notNull(),
    lease: text("lease"),
    leaseUntil: integer("lease_until"),
    attempts: integer("attempts").notNull().default(0),
    createdAt: text("created_at").notNull(),
    reviewedAt: text("reviewed_at"),
    error: text("error"),
  },
  (t) => [
    uniqueIndex("run_idempotency").on(t.owner, t.idempotencyKey),
    index("runs_campaign").on(t.owner, t.campaignId),
  ],
);
export const decisions = sqliteTable(
  "decisions",
  {
    id: text("id").primaryKey(),
    owner: text("owner").notNull(),
    runId: text("run_id")
      .notNull()
      .references(() => runs.id),
    athleteId: text("athlete_id").notNull(),
    decision: text("decision").notNull(),
    note: text("note").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [uniqueIndex("decision_unique").on(t.runId, t.athleteId)],
);
export const corrections = sqliteTable("corrections", {
  id: text("id").primaryKey(),
  owner: text("owner").notNull(),
  evidenceId: text("evidence_id")
    .notNull()
    .references(() => evidence.id),
  note: text("note").notNull(),
  status: text("status").notNull(),
  createdAt: text("created_at").notNull(),
});
export const evaluations = sqliteTable("evaluations", {
  id: text("id").primaryKey(),
  owner: text("owner").notNull(),
  runId: text("run_id")
    .notNull()
    .references(() => runs.id),
  payload: text("payload").notNull(),
  createdAt: text("created_at").notNull(),
});
export const audit = sqliteTable("audit_events", {
  id: text("id").primaryKey(),
  owner: text("owner").notNull(),
  action: text("action").notNull(),
  entityId: text("entity_id").notNull(),
  createdAt: text("created_at").notNull(),
});
