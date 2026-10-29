import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";
import { AppError, Studio } from "../../../lib/service";
import { ZodError } from "zod";
export const dynamic = "force-dynamic";
async function handle(request: Request) {
  const requestId = crypto.randomUUID(),
    method = request.method;
  try {
    const user = await getChatGPTUser();
    if (!user) throw new AppError(401, "Sign in to open your research studio.");
    if (method !== "GET") {
      const origin = request.headers.get("origin");
      if (!origin || origin !== new URL(request.url).origin)
        throw new AppError(403, "This request must come from your studio.");
      if (!request.headers.get("content-type")?.includes("application/json"))
        throw new AppError(400, "Use a JSON request.");
    }
    if (!env.DB)
      throw new AppError(503, "The research database is unavailable.");
    const studio = new Studio(
        env.DB,
        user.userId,
        env.AI_ENABLED === "true" && env.ANTHROPIC_API_KEY && env.AI_MODEL
          ? { apiKey: env.ANTHROPIC_API_KEY, model: env.AI_MODEL }
          : undefined,
      ),
      url = new URL(request.url),
      p = url.pathname.slice(5).split("/").map(decodeURIComponent);
    let body: unknown = {};
    if (method !== "GET") {
      const text = await request.text();
      if (text.length > 50000)
        throw new AppError(413, "This request is too large.");
      try {
        body = JSON.parse(text);
      } catch {
        throw new AppError(400, "Invalid JSON.");
      }
    }
    let result: unknown;
    if (method === "POST" && p[0] === "initialize")
      result = await studio.initialize();
    else if (method === "GET" && p[0] === "state")
      result = {
        ...(await studio.state()),
        user: { name: user.displayName, email: user.email },
      };
    else if (p[0] === "campaigns" && method === "POST" && p.length === 1)
      result = await studio.createCampaign(body);
    else if (p[0] === "campaigns" && method === "POST" && p[2] === "versions")
      result = await studio.saveVersion(p[1], body);
    else if (p[0] === "campaigns" && method === "POST" && p[2] === "runs")
      result = await studio.createRun(p[1], body);
    else if (p[0] === "campaigns" && method === "GET" && p[1]) {
      await studio.one("campaigns", p[1]);
      result = await studio.rows(
        "SELECT version,payload,created_at FROM campaign_versions WHERE campaign_id=? AND owner=? ORDER BY version DESC",
        p[1],
        user.userId,
      );
    } else if (p[0] === "runs" && method === "GET" && p[2] === "summary")
      return new Response(await studio.summary(p[1]), {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": "attachment; filename=the-assist-shortlist.md",
          "Cache-Control": "no-store",
        },
      });
    else if (p[0] === "runs" && method === "GET")
      result = await studio.getRun(p[1]);
    else if (p[0] === "runs" && method === "POST" && p[2] === "process") {
      await studio.process(p[1]);
      result = await studio.getRun(p[1]);
    } else if (p[0] === "runs" && method === "PUT" && p[2] === "decision")
      result = await studio.decision(p[1], body);
    else if (p[0] === "runs" && method === "POST" && p[2] === "review")
      result = await studio.reviewRun(p[1], body);
    else if (p[0] === "athletes" && method === "POST")
      result = await studio.createAthlete(body);
    else if (p[0] === "evidence" && method === "POST" && p.length === 1)
      result = await studio.addEvidence(body);
    else if (p[0] === "evidence" && method === "POST" && p[2] === "review")
      result = await studio.reviewEvidence(p[1], body);
    else if (p[0] === "corrections" && method === "POST" && p.length === 1)
      result = await studio.correction(body);
    else if (
      p[0] === "corrections" &&
      method === "POST" &&
      p[2] === "resolve"
    ) {
      await studio.one("corrections", p[1]);
      await studio
        .statement(
          "UPDATE corrections SET status='resolved' WHERE id=? AND owner=?",
          p[1],
          user.userId,
        )
        .run();
      result = { ok: true };
    } else if (p[0] === "evaluations" && method === "POST")
      result = await studio.evaluation(body);
    else throw new AppError(404, "This endpoint was not found.");
    return Response.json(result, {
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const status =
      error instanceof AppError
        ? error.status
        : error instanceof ZodError
          ? 400
          : 500;
    const message =
      error instanceof AppError
        ? error.message
        : error instanceof ZodError
          ? error.issues
              .map((i) => `${i.path.join(".")}: ${i.message}`)
              .join("; ")
          : "We couldn’t complete this request. Please try again.";
    if (status === 500) console.error("Request failed", requestId, error);
    return Response.json(
      { error: { message, requestId } },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
export const GET = handle;
export const POST = handle;
export const PUT = handle;
