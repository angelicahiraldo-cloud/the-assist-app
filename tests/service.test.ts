import test from "node:test";
import assert from "node:assert/strict";
import {
  DatabaseSync,
  type SQLInputValue,
  type SQLOutputValue,
} from "node:sqlite";
import { readFileSync } from "node:fs";
import { Studio } from "../lib/service";
import { fixture } from "./fixtures";
function database(): D1Database {
  type Prepared = {
    bind: (...args: SQLInputValue[]) => Prepared;
    first: () => Promise<Record<string, SQLOutputValue> | null>;
    all: () => Promise<{ results: Record<string, SQLOutputValue>[] }>;
    run: () => Promise<{ meta: { changes: number } }>;
    _sql: string;
    _args: SQLInputValue[];
  };
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(
    readFileSync(
      new URL("../drizzle/0000_familiar_morlun.sql", import.meta.url),
      "utf8",
    ),
  );
  function prepared(sql: string, args: SQLInputValue[] = []): Prepared {
    return {
      bind: (...v: SQLInputValue[]): ReturnType<typeof prepared> =>
        prepared(sql, v),
      first: async () => sqlite.prepare(sql).get(...args) ?? null,
      all: async () => ({ results: sqlite.prepare(sql).all(...args) }),
      run: async () => ({
        meta: { changes: Number(sqlite.prepare(sql).run(...args).changes) },
      }),
      _sql: sql,
      _args: args,
    };
  }
  return {
    prepare: prepared,
    batch: async (statements: ReturnType<typeof prepared>[]) => {
      sqlite.exec("BEGIN");
      try {
        const results = statements.map((s) => ({
          meta: {
            changes: Number(sqlite.prepare(s._sql).run(...s._args).changes),
          },
        }));
        sqlite.exec("COMMIT");
        return results;
      } catch (e) {
        sqlite.exec("ROLLBACK");
        throw e;
      }
    },
  } as unknown as D1Database;
}
test("live research queues without spending and enforces atomic per-account limits", async () => {
  const a = new Studio(database(), "live-user", {
    apiKey: "not-a-real-key",
    model: "test",
  });
  await a.initialize();
  const c = await a.createCampaign(fixture().brief);
  const key = crypto.randomUUID();
  const first = await a.createRun(c.id, { key, mode: "ai" });
  assert.equal(first.state, "queued");
  assert.match(first.snapshot.engine, /live-v2/);
  assert.equal((await a.createRun(c.id, { key, mode: "ai" })).id, first.id);
  for (let i = 0; i < 4; i++)
    await a.createRun(c.id, { key: crypto.randomUUID(), mode: "ai" });
  await assert.rejects(
    () => a.createRun(c.id, { key: crypto.randomUUID(), mode: "ai" }),
    { status: 429 },
  );
  assert.equal((await a.state()).runs.length, 5);
});
test("live research persistence is fenced by the owning lease and keeps source evidence", async () => {
  const a = new Studio(database(), "live-user", {
    apiKey: "not-a-real-key",
    model: "test",
  });
  await a.initialize();
  const c = await a.createCampaign(fixture().brief);
  const r = await a.createRun(c.id, { key: crypto.randomUUID(), mode: "ai" });
  const snapshot = {
    ...r.snapshot,
    asOf: "2026-11-01T12:00:00.000Z",
    research: {
      refreshedAt: "2026-11-01T12:00:00.000Z",
      sources: [],
      warnings: [],
    },
  };
  await a.persistLiveResearch(r.id, "stale-lease", snapshot);
  assert.equal((await a.getRun(r.id)).snapshot.research, undefined);
  await a
    .statement(
      "UPDATE research_runs SET lease='valid',state='running' WHERE id=?",
      r.id,
    )
    .run();
  await a.persistLiveResearch(r.id, "valid", snapshot);
  const stored = await a.getRun(r.id);
  assert.equal(stored.snapshot.research?.refreshedAt, snapshot.asOf);
  assert.equal(stored.state, "queued");
  assert.equal(stored.changedEvidence.length, 0);
});
test("workspace isolation applies to reads, writes, decisions, evidence and exports", async () => {
  const db = database(),
    alice = new Studio(db, "alice"),
    bob = new Studio(db, "bob");
  await alice.initialize();
  await bob.initialize();
  const c = await alice.createCampaign(fixture().brief);
  const r = await alice.createRun(c.id, { key: crypto.randomUUID() });
  await assert.rejects(() => bob.getRun(r.id), { status: 404 });
  await assert.rejects(
    () => bob.saveVersion(c.id, { baseVersion: 1, brief: fixture().brief }),
    { status: 404 },
  );
  await assert.rejects(() => bob.summary(r.id), { status: 404 });
  await assert.rejects(
    () =>
      bob.reviewEvidence(r.snapshot.evidence[0].id, { status: "withdrawn" }),
    { status: 404 },
  );
  assert.equal((await bob.state()).campaigns.length, 0);
});
test("duplicate initialization and research clicks are idempotent", async () => {
  const a = new Studio(database(), "alice");
  await a.initialize();
  await a.initialize();
  assert.equal((await a.state()).athletes.length, 12);
  const c = await a.createCampaign(fixture().brief),
    key = crypto.randomUUID();
  const first = await a.createRun(c.id, { key }),
    second = await a.createRun(c.id, { key });
  assert.equal(first.id, second.id);
  assert.equal((await a.state()).runs.length, 1);
});
test("brief edits preserve research snapshots and reject stale edits", async () => {
  const a = new Studio(database(), "alice");
  await a.initialize();
  const c = await a.createCampaign(fixture().brief),
    r = await a.createRun(c.id, { key: crypto.randomUUID() });
  await a.saveVersion(c.id, {
    baseVersion: 1,
    brief: { ...fixture().brief, name: "Revised" },
  });
  await assert.rejects(
    () => a.saveVersion(c.id, { baseVersion: 1, brief: fixture().brief }),
    { status: 409 },
  );
  const old = await a.getRun(r.id);
  assert.equal(old.snapshot.brief.name, "Synthetic test");
  assert.equal(old.version, 1);
  assert.equal(old.currentVersion, 2);
});
test("withdrawn evidence flags historical runs and blocks review", async () => {
  const a = new Studio(database(), "alice");
  await a.initialize();
  const c = await a.createCampaign(fixture().brief),
    r = await a.createRun(c.id, { key: crypto.randomUUID() });
  await a.reviewEvidence(r.snapshot.evidence[0].id, { status: "withdrawn" });
  const changed = await a.getRun(r.id);
  assert.equal(changed.changedEvidence.length, 1);
  await assert.rejects(
    () => a.reviewRun(r.id, { athleteIds: r.result.map((a) => a.athleteId) }),
    { status: 409 },
  );
  assert.match(await a.summary(r.id), /WARNING/);
});
test("decisions persist, summary contains sources, incomplete reviews fail", async () => {
  const a = new Studio(database(), "alice");
  await a.initialize();
  const c = await a.createCampaign({
      ...fixture().brief,
      requirements: [
        {
          id: "r1",
          kind: "basketball",
          label: "Basketball background",
          value: "professional basketball",
          importance: "must_have",
        },
      ],
    }),
    r = await a.createRun(c.id, { key: crypto.randomUUID() });
  await a.decision(r.id, {
    athleteId: r.result[0].athleteId,
    decision: "keep",
    note: "Confirm interest",
  });
  assert.match(await a.summary(r.id), /mystics.wnba.com/);
  await assert.rejects(() => a.reviewRun(r.id, { athleteIds: [] }), {
    status: 400,
  });
  await a.reviewRun(r.id, { athleteIds: r.result.map((a) => a.athleteId) });
  assert.equal((await a.getRun(r.id)).state, "completed");
});
test("expired jobs are recovered and active leases cannot be overwritten", async () => {
  const a = new Studio(database(), "alice");
  await a.initialize();
  const c = await a.createCampaign(fixture().brief),
    r = await a.createRun(c.id, { key: crypto.randomUUID() });
  await a
    .statement(
      "UPDATE research_runs SET state='running',lease='old',lease_until=?,attempts=1,result=NULL WHERE id=?",
      Date.now() - 1,
      r.id,
    )
    .run();
  await a.process(r.id);
  assert.equal((await a.getRun(r.id)).state, "awaiting_review");
  await a
    .statement(
      "UPDATE research_runs SET state='running',lease='active',lease_until=?,attempts=1,result=NULL WHERE id=?",
      Date.now() + 30000,
      r.id,
    )
    .run();
  await a.process(r.id);
  assert.equal((await a.getRun(r.id)).state, "running");
  const update = await a
    .statement(
      "UPDATE research_runs SET state='completed' WHERE id=? AND lease='old'",
      r.id,
    )
    .run();
  assert.equal(update.meta.changes, 0);
});
