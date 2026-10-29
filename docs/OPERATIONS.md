# Verification and operations

## Supported release boundary

This is an owner-private application with persistent data and a complete manual/evidence-assisted workflow. The AI provider integration is implemented but needs a key, supported model, and live evaluation before enabling. Shared organization membership, an always-on worker, billing, automated outreach, and campaign execution are not part of this deployment.

## Automated verification

- TypeScript checks and ESLint for authored source.
- Research-rule tests: unknown commercial fields, stale/unapproved data, dated fees, currency mismatches, conflicting availability, same-category restrictions, and evidence coverage.
- AI validation tests: fabricated identifiers, citation mismatches, protected commercial requirements, duplicate connections, prohibited claims, and empty output.
- SQLite service tests using the actual SQL migration: isolated workspaces, campaign revisions, idempotent requests, stale-edit rejection, historical-source warnings, decisions/exports, complete review requirements, and lease recovery.
- Browser tests against the real local D1-backed app: sign-in, create campaign, generate research, compare athletes, retain a decision, download Markdown, reload/persistence, source inspection, mobile navigation, search, anonymous denial, and cross-origin rejection.

The SQLite adapter tests service behavior, not the hosted network boundary. Local browser tests exercise the Sites development identity. They do not assert that a particular user's production sign-in session has already been exercised. Successful Sites deployment confirms publication; owner sign-in is still required to open private records.

## Schema and data

The schema is in `db/schema.ts`; generated migrations and Drizzle metadata are in `drizzle/`. Never alter an applied migration. Append new migrations. Seed data lives in `lib/catalog.ts` and is inserted idempotently during the authenticated initialization action. The hosted database and local `.wrangler/state` database are distinct.

Private records carry the stable authenticated user ID as `owner`. All API queries obtain that ID from the platform's server-side identity, not from submitted JSON. Private database access is never exposed to the browser. D1 does not provide PostgreSQL row-level security; application authorization is mandatory and covered by cross-owner service tests.

Source changes do not mutate old research snapshots. Withdrawing or disputing a cited record adds a warning to prior runs and their exports. A corrected claim should be entered as a new evidence record; withdraw the older record after approving the correction. A correction request itself does not change a factual claim.

## Recovery

Research states are `queued`, `running`, `awaiting_review`, `completed`, and `failed`. Leases prevent duplicate processing. Expired work can be reclaimed up to three times; a stale lease cannot publish over a new worker. Processing is synchronous within a bounded request and resumes when a pending run is opened. This release does not promise unattended processing while all users are offline.

For a failed AI request, leave the evidence catalog and campaign intact. Select **Evidence matching** in the method selector and create a new run. Never show a failed AI result as if it were a successful AI result. The model timeout is shorter than its lease; provider retries are disabled to avoid multiplying charges unexpectedly.

## AI activation checklist

1. Select an authorized Anthropic account/model and configure server-side secrets.
2. Confirm what campaign information may be sent to that provider. Only the objective, product, subjective requirements, athlete identifiers, and approved excerpts are included.
3. Test a small sourced dataset and inspect each output against its citations. The syntactic checks do not prove semantic accuracy.
4. Confirm timeouts and provider errors result in failed runs, and that evidence matching remains available.
5. Set a provider-side spend cap before allowing repeated live requests. The app limits creation to approximately 30 runs per account per hour; concurrent requests can race that preflight limit, so it is not a billing guarantee.
6. Run the source PRD's manual-versus-assisted pilot before making accuracy or time-savings claims.

## Privacy, backup, and future sharing

The initial Site is private to its owner. Retain this boundary unless sharing is explicitly requested and membership/role controls are implemented. User IDs scope storage; email is only displayed. Do not log full prompts, private briefs, or secrets. The API logs only server errors with a request identifier, not deliberate payload dumps.

Use the hosting provider's supported D1 backup/export facilities before significant migrations. Verify a restore in a separate environment before relying on a backup policy. Automatic backup scheduling, a demonstrated production restore, a retention policy, and an account-deletion workflow have not been established by this build; decide them before onboarding external customers. Existing summary and evaluation downloads are not full database backups.

## Release

Run the checks in README. Build and publish using the Sites source workflow so the pushed commit matches the artifact. Sites applies hosted schema migrations before worker publication. Inspect the returned deployment state; only a successful terminal result establishes that the application is live. Never publish local test runtime data, environment files, or test screenshots.
