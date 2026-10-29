import { initialCatalog } from "./catalog";
import { evaluate, validateAssessments } from "./research";
import type { Athlete, Run, Snapshot } from "./types";
import {
  briefSchema,
  evidenceSchema,
  athleteSchema,
  evaluationSchema,
  normalizeBrief,
} from "./schemas";
import { assessWithAI, type AIConfig } from "./ai";
import { z } from "zod";

export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
type Row = {
  id: string;
  owner: string;
  payload: string;
  athlete_id: string;
  version: number;
  created_at: string;
  campaign_id: string;
  state: string;
  idempotency_key: string;
  input_hash: string;
  snapshot: string;
  result: string | null;
  reviewed_at: string | null;
  error: string | null;
  status: string;
  decision: "keep" | "reject" | "request_info" | "unreviewed";
  note: string;
};
const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();
const json = JSON.stringify;
export class Studio {
  constructor(
    public db: D1Database,
    public owner: string,
    public ai?: AIConfig,
  ) {}
  statement(sql: string, ...args: unknown[]) {
    return this.db.prepare(sql).bind(...args);
  }
  async rows(sql: string, ...args: unknown[]): Promise<Row[]> {
    return (await this.statement(sql, ...args).all<Row>()).results;
  }
  async one(table: string, entity: string): Promise<Row> {
    const r = await this.statement(
      `SELECT * FROM ${table} WHERE id = ? AND owner = ?`,
      entity,
      this.owner,
    ).first<Row>();
    if (!r) throw new AppError(404, "This record is unavailable.");
    return r;
  }
  event(action: string, entity: string) {
    return this.statement(
      "INSERT INTO audit_events (id,owner,action,entity_id,created_at) VALUES (?,?,?,?,?)",
      id(),
      this.owner,
      action,
      entity,
      now(),
    );
  }
  async initialize() {
    const catalog = initialCatalog(this.owner);
    await this.db.batch([
      this.statement(
        "INSERT OR IGNORE INTO workspaces (id,name,created_at) VALUES (?,?,?)",
        this.owner,
        "My research studio",
        now(),
      ),
      ...catalog.athletes.map((a) =>
        this.statement(
          "INSERT OR IGNORE INTO athletes (id,owner,payload) VALUES (?,?,?)",
          a.id,
          this.owner,
          json(a),
        ),
      ),
      ...catalog.evidence.map((e) =>
        this.statement(
          "INSERT OR IGNORE INTO evidence (id,owner,athlete_id,status,payload) VALUES (?,?,?,?,?)",
          e.id,
          this.owner,
          e.athleteId,
          e.status,
          json(e),
        ),
      ),
    ]);
    return { ok: true };
  }
  async state() {
    const [as, es, cs, rs, ds, ev, co, au] = await Promise.all([
      this.rows("SELECT * FROM athletes WHERE owner = ?", this.owner),
      this.rows("SELECT * FROM evidence WHERE owner = ?", this.owner),
      this.rows(
        "SELECT * FROM campaigns WHERE owner = ? AND archived = 0 ORDER BY created_at DESC",
        this.owner,
      ),
      this.rows(
        "SELECT id,campaign_id,version,state,created_at,reviewed_at FROM research_runs WHERE owner = ? ORDER BY created_at DESC",
        this.owner,
      ),
      this.rows("SELECT * FROM decisions WHERE owner = ?", this.owner),
      this.rows(
        "SELECT * FROM evaluations WHERE owner = ? ORDER BY created_at DESC",
        this.owner,
      ),
      this.rows(
        "SELECT * FROM corrections WHERE owner = ? ORDER BY created_at DESC",
        this.owner,
      ),
      this.rows(
        "SELECT * FROM audit_events WHERE owner = ? ORDER BY created_at DESC LIMIT 12",
        this.owner,
      ),
    ]);
    return {
      athletes: as
        .map((a) => JSON.parse(a.payload))
        .sort((a: Athlete, b: Athlete) => a.name.localeCompare(b.name)),
      evidence: es.map((e) => ({ ...JSON.parse(e.payload), status: e.status })),
      campaigns: cs.map((c) => ({
        ...JSON.parse(c.payload),
        id: c.id,
        version: c.version,
        createdAt: c.created_at,
        latestRun: rs.find((r) => r.campaign_id === c.id),
      })),
      runs: rs,
      decisions: ds,
      evaluations: ev.map((e) => ({
        ...JSON.parse(e.payload),
        id: e.id,
        createdAt: e.created_at,
      })),
      corrections: co,
      audit: au,
      engine: "Evidence matching · rule-based",
      aiAvailable: Boolean(this.ai),
      workspace: "My research studio",
    };
  }
  async createCampaign(raw: unknown) {
    const brief = normalizeBrief(briefSchema.parse(raw)),
      cid = id(),
      date = now();
    await this.db.batch([
      this.statement(
        "INSERT INTO campaigns (id,owner,version,payload,created_at) VALUES (?,?,?,?,?)",
        cid,
        this.owner,
        1,
        json(brief),
        date,
      ),
      this.statement(
        "INSERT INTO campaign_versions (id,campaign_id,owner,version,payload,created_at) VALUES (?,?,?,?,?,?)",
        id(),
        cid,
        this.owner,
        1,
        json(brief),
        date,
      ),
      this.event("Campaign created", cid),
    ]);
    return { id: cid, version: 1 };
  }
  async saveVersion(cid: string, raw: unknown) {
    const input = z
      .object({ baseVersion: z.number().int().positive(), brief: briefSchema })
      .parse(raw);
    await this.one("campaigns", cid);
    const version = input.baseVersion + 1,
      data = json(normalizeBrief(input.brief));
    const result = await this.db.batch([
      this.statement(
        "INSERT INTO campaign_versions (id,campaign_id,owner,version,payload,created_at) SELECT ?,id,owner,?,?,? FROM campaigns WHERE id=? AND owner=? AND version=?",
        id(),
        version,
        data,
        now(),
        cid,
        this.owner,
        input.baseVersion,
      ),
      this.statement(
        "UPDATE campaigns SET payload=?,version=? WHERE id=? AND owner=? AND version=?",
        data,
        version,
        cid,
        this.owner,
        input.baseVersion,
      ),
    ]);
    if (!result[0].meta.changes)
      throw new AppError(
        409,
        "The brief changed in another window. Reload before saving.",
      );
    await this.event("Campaign revised", cid).run();
    return { id: cid, version };
  }
  async createRun(cid: string, raw: unknown) {
    const { key, mode } = z
        .object({
          key: z.string().uuid(),
          mode: z.enum(["rules", "ai"]).default("rules"),
        })
        .parse(raw),
      c = await this.one("campaigns", cid);
    if (mode === "ai" && !this.ai)
      throw new AppError(503, "AI is not configured. Use evidence matching.");
    const old = await this.statement(
      "SELECT * FROM research_runs WHERE owner=? AND idempotency_key=?",
      this.owner,
      key,
    ).first<Row>();
    if (old) {
      if (
        old.campaign_id !== cid ||
        old.version !== c.version ||
        JSON.parse(old.snapshot).engine.startsWith("anthropic:") !==
          (mode === "ai")
      )
        throw new AppError(
          409,
          "This request key belongs to another brief version.",
        );
      await this.process(old.id);
      return this.getRun(old.id);
    }
    const count = await this.statement(
      "SELECT count(*) as n FROM research_runs WHERE owner=? AND created_at>?",
      this.owner,
      new Date(Date.now() - 3600000).toISOString(),
    ).first<{ n: number }>();
    if ((count?.n || 0) >= 30)
      throw new AppError(
        429,
        "You have reached 30 research runs this hour. Try again later.",
      );
    const [as, es] = await Promise.all([
      this.rows("SELECT * FROM athletes WHERE owner=?", this.owner),
      this.rows(
        "SELECT * FROM evidence WHERE owner=? AND status='approved'",
        this.owner,
      ),
    ]);
    const snapshot: Snapshot = {
      brief: JSON.parse(c.payload),
      athletes: as.map((a) => JSON.parse(a.payload)),
      evidence: es.map((e) => ({ ...JSON.parse(e.payload), status: e.status })),
      asOf: now(),
      engine:
        mode === "ai" ? `anthropic:${this.ai!.model}:prompt-v1` : "rules-v1",
    };
    const input = json(snapshot),
      hash = Array.from(
        new Uint8Array(
          await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(input),
          ),
        ),
      )
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    const rid = id();
    await this.db.batch([
      this.statement(
        "INSERT OR IGNORE INTO research_runs (id,owner,campaign_id,version,idempotency_key,input_hash,snapshot,state,attempts,created_at) VALUES (?,?,?,?,?,?,?,'queued',0,?)",
        rid,
        this.owner,
        cid,
        c.version,
        key,
        hash,
        input,
        now(),
      ),
      this.event("Research requested", cid),
    ]);
    const actual = await this.statement(
      "SELECT id FROM research_runs WHERE owner=? AND idempotency_key=?",
      this.owner,
      key,
    ).first<{ id: string }>();
    await this.process(actual!.id);
    return this.getRun(actual!.id);
  }
  async process(rid: string) {
    await this.one("research_runs", rid);
    const token = id(),
      claimed = await this.statement(
        "UPDATE research_runs SET state='running',lease=?,lease_until=?,attempts=attempts+1,error=NULL WHERE id=? AND owner=? AND attempts<3 AND (state='queued' OR (state='running' AND lease_until<?)) RETURNING *",
        token,
        Date.now() + 60000,
        rid,
        this.owner,
        Date.now(),
      ).first<Row>();
    if (!claimed) {
      await this.statement(
        "UPDATE research_runs SET state='failed',error='Maximum recovery attempts reached.' WHERE id=? AND owner=? AND state='running' AND attempts>=3 AND lease_until<?",
        rid,
        this.owner,
        Date.now(),
      ).run();
      return;
    }
    try {
      const snapshot = JSON.parse(claimed.snapshot) as Snapshot;
      if (snapshot.engine.startsWith("anthropic:") && !this.ai)
        throw new Error("AI unavailable");
      const result = validateAssessments(
        snapshot.engine.startsWith("anthropic:")
          ? await assessWithAI(snapshot, this.ai!)
          : evaluate(snapshot),
        snapshot,
      );
      await this.statement(
        "UPDATE research_runs SET result=?,state='awaiting_review',lease=NULL,lease_until=NULL WHERE id=? AND owner=? AND lease=?",
        json(result),
        rid,
        this.owner,
        token,
      ).run();
    } catch {
      await this.statement(
        "UPDATE research_runs SET state='failed',error='Research validation failed. Review the evidence and retry.',lease=NULL,lease_until=NULL WHERE id=? AND owner=? AND lease=?",
        rid,
        this.owner,
        token,
      ).run();
    }
  }
  async getRun(rid: string): Promise<Run> {
    const r = await this.one("research_runs", rid),
      c = await this.one("campaigns", r.campaign_id),
      snapshot = JSON.parse(r.snapshot) as Snapshot;
    const [ds, es] = await Promise.all([
      this.rows(
        "SELECT * FROM decisions WHERE run_id=? AND owner=?",
        rid,
        this.owner,
      ),
      this.rows("SELECT id,status FROM evidence WHERE owner=?", this.owner),
    ]);
    const changedEvidence = snapshot.evidence
      .filter(
        (e) =>
          !es.some(
            (current) => current.id === e.id && current.status === "approved",
          ),
      )
      .map((e) => e.id);
    return {
      id: r.id,
      campaignId: r.campaign_id,
      version: r.version,
      inputHash: r.input_hash,
      state: r.state,
      createdAt: r.created_at,
      reviewedAt: r.reviewed_at,
      error: r.error,
      snapshot,
      result: r.result ? JSON.parse(r.result) : [],
      decisions: ds.map((d) => ({
        athleteId: d.athlete_id,
        decision: d.decision,
        note: d.note,
      })),
      changedEvidence,
      currentVersion: c.version,
    };
  }
  async decision(rid: string, raw: unknown) {
    const d = z
        .object({
          athleteId: z.string(),
          decision: z.enum(["keep", "reject", "request_info", "unreviewed"]),
          note: z.string().max(3000),
        })
        .parse(raw),
      run = await this.getRun(rid);
    if (!run.result.some((a) => a.athleteId === d.athleteId))
      throw new AppError(404, "Athlete is not in this research run.");
    await this.db.batch([
      this.statement(
        "INSERT INTO decisions (id,owner,run_id,athlete_id,decision,note,updated_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(run_id,athlete_id) DO UPDATE SET decision=excluded.decision,note=excluded.note,updated_at=excluded.updated_at",
        id(),
        this.owner,
        rid,
        d.athleteId,
        d.decision,
        d.note,
        now(),
      ),
      this.event("Athlete decision saved", rid),
    ]);
    return { ok: true };
  }
  async reviewRun(rid: string, raw: unknown) {
    const { athleteIds } = z
        .object({ athleteIds: z.array(z.string()) })
        .parse(raw),
      run = await this.getRun(rid);
    if (run.state !== "awaiting_review")
      throw new AppError(409, "This run is not awaiting review.");
    if (run.changedEvidence.length)
      throw new AppError(
        409,
        "Evidence has changed. Generate new research before marking it reviewed.",
      );
    if (
      athleteIds.length !== run.result.length ||
      new Set(athleteIds).size !== run.result.length ||
      run.result.some((a) => !athleteIds.includes(a.athleteId))
    )
      throw new AppError(
        400,
        "Review each athlete’s evidence before completing the run.",
      );
    await this.db.batch([
      this.statement(
        "UPDATE research_runs SET state='completed',reviewed_at=? WHERE id=? AND owner=? AND state='awaiting_review'",
        now(),
        rid,
        this.owner,
      ),
      this.event("Research review completed", rid),
    ]);
    return { ok: true };
  }
  async createAthlete(raw: unknown) {
    const a = athleteSchema.parse(raw),
      aid = id(),
      payload = {
        ...a,
        id: aid,
        initials: a.name
          .split(" ")
          .map((s) => s[0])
          .slice(0, 2)
          .join(""),
        color: "sage",
      };
    await this.db.batch([
      this.statement(
        "INSERT INTO athletes (id,owner,payload) VALUES (?,?,?)",
        aid,
        this.owner,
        json(payload),
      ),
      this.event("Athlete added", aid),
    ]);
    return payload;
  }
  async addEvidence(raw: unknown) {
    const e = evidenceSchema.parse(raw);
    await this.one("athletes", e.athleteId);
    if (e.supersedesId) {
      const old = await this.one("evidence", e.supersedesId);
      if (old.athlete_id !== e.athleteId)
        throw new AppError(400, "A correction must refer to the same athlete.");
    }
    const eid = id(),
      payload = { ...e, id: eid, status: "draft" };
    await this.db.batch([
      this.statement(
        "INSERT INTO evidence (id,owner,athlete_id,status,payload) VALUES (?,?,?,'draft',?)",
        eid,
        this.owner,
        e.athleteId,
        json(payload),
      ),
      this.event("Evidence submitted", eid),
    ]);
    return payload;
  }
  async reviewEvidence(eid: string, raw: unknown) {
    const { status } = z
        .object({ status: z.enum(["approved", "disputed", "withdrawn"]) })
        .parse(raw),
      row = await this.one("evidence", eid),
      e = JSON.parse(row.payload);
    const statements = [
      this.statement(
        "UPDATE evidence SET status=?,payload=? WHERE id=? AND owner=?",
        status,
        json({ ...e, status, verifiedAt: now() }),
        eid,
        this.owner,
      ),
      this.event(`Evidence ${status}`, eid),
    ];
    if (status === "approved" && e.supersedesId)
      statements.push(
        this.statement(
          "UPDATE evidence SET status='withdrawn' WHERE id=? AND owner=?",
          e.supersedesId,
          this.owner,
        ),
      );
    await this.db.batch(statements);
    return { ok: true };
  }
  async correction(raw: unknown) {
    const d = z
      .object({
        evidenceId: z.string(),
        note: z.string().trim().min(5).max(3000),
      })
      .parse(raw);
    await this.one("evidence", d.evidenceId);
    await this.db.batch([
      this.statement(
        "INSERT INTO corrections (id,owner,evidence_id,note,status,created_at) VALUES (?,?,?,?,'open',?)",
        id(),
        this.owner,
        d.evidenceId,
        d.note,
        now(),
      ),
      this.event("Correction requested", d.evidenceId),
    ]);
    return { ok: true };
  }
  async evaluation(raw: unknown) {
    const e = evaluationSchema.parse(raw),
      r = await this.getRun(e.runId);
    await this.db.batch([
      this.statement(
        "INSERT INTO evaluations (id,owner,run_id,payload,created_at) VALUES (?,?,?,?,?)",
        id(),
        this.owner,
        e.runId,
        json({
          ...e,
          datasetHash: r.inputHash,
          campaignVersion: r.version,
          engine: r.snapshot.engine,
        }),
        now(),
      ),
      this.event("Pilot measurement recorded", e.runId),
    ]);
    return { ok: true };
  }
  async summary(rid: string) {
    const r = await this.getRun(rid),
      lines = [
        `# ${r.snapshot.brief.name}`,
        `Version ${r.version} · ${r.state.replaceAll("_", " ")} · ${r.createdAt}`,
        "",
        `Research method: ${r.snapshot.engine.startsWith("anthropic:") ? "AI-assisted interpretation with deterministic commercial checks" : "documented evidence matching (not AI-generated)"}.`,
        `Dataset: ${r.inputHash}`,
        "",
        r.changedEvidence.length
          ? "WARNING: Some cited evidence has changed; regenerate this research."
          : "",
        "## Selected athletes",
      ];
    const kept = r.decisions.filter((d) => d.decision === "keep");
    if (!kept.length) lines.push("No athletes selected yet.");
    for (const d of kept) {
      const athlete = r.snapshot.athletes.find((a) => a.id === d.athleteId)!,
        a = r.result.find((a) => a.athleteId === d.athleteId)!;
      lines.push(
        "",
        `### ${athlete.name}`,
        d.note,
        "",
        ...a.requirements.flatMap((q) => {
          const req = r.snapshot.brief.requirements.find(
            (x) => x.id === q.requirementId,
          )!;
          return [
            `- ${req.label}: ${q.status.replaceAll("_", " ")}. ${q.explanation}`,
            ...q.evidenceIds.map((eid) => {
              const e = r.snapshot.evidence.find((x) => x.id === eid)!;
              return `  - Source: ${e.sourceTitle} — ${e.sourceUrl} (collected ${e.collectedAt})`;
            }),
            ...(q.confirmationQuestion
              ? [`  - Follow up: ${q.confirmationQuestion}`]
              : []),
          ];
        }),
      );
    }
    lines.push(
      "",
      "Final fees, availability, audience information, interest, and sponsorship restrictions require confirmation with representatives.",
    );
    return lines.join("\n");
  }
}
