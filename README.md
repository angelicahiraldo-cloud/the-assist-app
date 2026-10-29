# The Assist

A private athlete research application built from **The Assist — Technical Implementation Guide.md**.

The app supports campaign briefs and revisions, a source-backed athlete library, evidence approval and corrections, campaign-specific research, side-by-side comparisons, saved decisions and notes, Markdown shortlist exports, and pilot evaluation records. Records persist in the server database, not browser local storage.

## Running locally

Use Node.js 24 LTS and npm. The source and lockfile are included.

```bash
npm ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_familiar_morlun.sql
npm run dev -- --hostname 127.0.0.1
```

Apply the migration once per local database, not on every start. The development server prints its URL, normally `http://127.0.0.1:5173`. Use **Sign in with ChatGPT**; the Sites development integration provides a local test identity. This mock identity is not present in the production build. Production sign-in is handled by the private Sites gateway.

The portable Node runtime downloaded during the build is `/private/tmp/node-v24.22.0-darwin-arm64/bin`. That temporary path is not a permanent Node installation. If using it in this session, prepend it to `PATH`; install Node normally for ongoing development.

## Use the application

1. Sign in and create a campaign, or start from the example brief.
2. Set the product, objective, audience, formats, dates, budget, and essential/preferred requirements.
3. Open **Research & sources** to add evidence, inspect it, and approve it. Draft, disputed, withdrawn, and stale evidence cannot support a new match.
4. Build the research shortlist from the campaign card. A run retains its exact input snapshot.
5. Open requirement details and original sources. Select up to four athletes for comparison.
6. Keep candidates, request more information, or pass. Save notes independently of the decision.
7. Check each assessment before marking the research reviewed. Download the selected-athlete summary as Markdown.
8. Record manual and assisted measurement sessions against the same run snapshot in **Pilot insights**.

## Dataset and honest uncertainty

The initial library contains 12 entries from the [official Washington Mystics roster](https://mystics.wnba.com/roster), checked October 29, 2026. Developmental entries are excluded. This is a dated roster snapshot, not a continually refreshed feed. It does not imply athlete endorsement of this application.

Only roster facts are preloaded. No social metrics, audience demographics, sponsorship terms, prices, content experience, or availability are invented. The initial research will therefore contain meaningful unknowns until more sources are curated. Athlete initials are used instead of unlicensed photographs. No real athlete has fabricated demo attributes.

Evidence matching uses explicit categories and values. Examples:

| Category       | Evidence value                             | Meaning                                                                 |
| -------------- | ------------------------------------------ | ----------------------------------------------------------------------- |
| `content`      | `fitness`                                  | A source documents fitness content                                      |
| `platform`     | `Instagram`                                | A source documents platform activity                                    |
| `budget`       | `USD:250000`                               | A verified quote of $2,500; requires validity covering the campaign     |
| `availability` | `available` / `unavailable`                | Explicit dated representative confirmation                              |
| `restriction`  | `activewear:clear` / `activewear:conflict` | Dated confirmation for the campaign's `activewear` restriction category |

Different currencies are not converted automatically. Historical partnerships do not establish current exclusivity. Audience fit always requires human interpretation of an authorized report. Numerical fit scores are not used.

## Optional AI mode

The application runs fully in **Evidence matching** mode without an AI account. An optional Anthropic adapter is implemented using the official SDK and structured output, with source-ID checks, protected commercial outcomes, request timeouts, and mandatory human review.

AI mode requires server-side configuration:

```dotenv
ANTHROPIC_API_KEY=<your-provider-key>
AI_MODEL=<a-supported-structured-output-model-id>
AI_ENABLED=true
```

For local development, use an ignored `.dev.vars` file. For hosting, configure these through Sites environment-variable tools. Never put keys in source code, Git, client components, or the hosting manifest. The method selector appears only when all three settings are present. The key must be authorized for the selected model and billing.

AI only proposes source-backed connections for content, activities, and historical partnerships. Budget, availability, restrictions, platform facts, and audience remain controlled by deterministic checks or explicit unknowns. Inputs sent to the provider omit commercial details and target-audience information. Model results are labeled interpretations and must be reviewed against their sources.

**Live AI calls have not been verified because no provider credentials were supplied.** Provider-boundary checks are covered by deterministic tests. Consult the [official structured-output documentation](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) when choosing a model.

## Architecture

- React and TypeScript, with Next.js-compatible routes through Vinext.
- Sites private hosting and platform-owned ChatGPT authentication.
- Cloudflare D1 / SQLite with Drizzle-managed schema migrations.
- Authenticated server routes, workspace ownership checks on every private record, same-origin mutation checks, and no browser database credentials.
- Durable research run records with leases, bounded recovery, immutable input snapshots, and idempotency keys.

This deployment adapts the guide's proposed Supabase/PostgreSQL/Vercel infrastructure to the hosting already available. Each authenticated account has an isolated owner-managed workspace. The initial deployment is owner-private; it does not implement multi-member organization invitations or manager/viewer roles. Do not widen the Site audience assuming those role controls exist.

Research executes in a bounded server request. If processing is interrupted, opening the run resumes queued/expired work through the same lease-protected processor. This is not an always-on background worker; closed-browser scheduled processing is not included. No claimed value depends on a live AI call completing in the background.

## Verification

```bash
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Start the local app and apply its database migration before browser tests. Playwright uses the installed Chrome channel. Test data is local and is not shipped to the hosted database. See [verification and operations](docs/OPERATIONS.md) for limitations and release procedures.
