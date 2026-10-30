# The Assist

A Washington Mystics athlete research application built from **The Assist — Technical Implementation Guide.md**, with private, per-account records and a publicly shareable sign-in link.

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
4. When AI is enabled, saving a brief automatically submits live research. Keep the research screen open while it refreshes official sources and builds a cited shortlist. A new research run refreshes sources again; earlier completed snapshots remain unchanged. Evidence matching remains a separate manual mode.
5. Open requirement details and original sources. Select up to four athletes for comparison.
6. Keep candidates, request more information, or pass. Save notes independently of the decision.
7. Check each assessment before marking the research reviewed. Download the selected-athlete summary as Markdown.
8. Record manual and assisted measurement sessions against the same run snapshot in **Pilot insights**.

## Dataset and honest uncertainty

The initial library contains 12 entries from the [official Washington Mystics roster](https://mystics.wnba.com/roster), checked October 29, 2026. Every AI submission fetches the roster again and only includes players currently listed there; developmental entries are excluded. Previously saved or manually entered off-roster athletes cannot enter the AI shortlist. Library records are retained for historical runs. Listing does not imply athlete endorsement.

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

## Live AI recommendations

The application uses Anthropic's official SDK, live web-search source discovery, direct public-page retrieval, and structured recommendations. It first refreshes the roster and accessible official player/news pages, then proposes up to five athletes ordered by campaign relevance. Fewer or no recommendations are valid when evidence is insufficient. Independent **Evidence matching** mode remains usable without an AI account.

AI mode requires server-side configuration:

```dotenv
ANTHROPIC_API_KEY=<your-provider-key>
AI_MODEL=claude-sonnet-4-6
AI_ENABLED=true
```

For local development, use an ignored `.dev.vars` file. For hosting, configure these through Sites environment-variable tools. Never put keys in source code, Git, client components, or the hosting manifest. The method selector appears only when all three settings are present. The key must be authorized for the selected model and billing.

The full campaign brief and fetched public athlete text are sent to Anthropic with the owner's authorization. Campaign budget, dates and audience are planning context, not established athlete facts. Recommendation reasons are AI interpretations and must be reviewed against cited sources. Fees, availability, demographic composition, engagement and current exclusivity are not inferred. Historical activities/partnerships are not represented as current obligations.

Only HTTPS sources on `mystics.wnba.com`, `www.wnba.com`, and `wnba.com` are retrieved. Redirects are revalidated; login walls and failed article responses are not bypassed. Robots rules for the disclosed `TheAssistResearch` user agent are honored. Under RFC 9309, a 4xx robots response means unavailable rules; 429 and server/network failures fail closed. Each source quote must exactly occur on the retrieved page, whose text must identify the athlete, and the quote must include their surname. Invalid excerpts and recommendations are discarded with coverage notes, never silently accepted. These checks establish traceability, not perfect semantic accuracy.

Live research uses at most four web searches and 20 profile/news URLs per run. Atomic database limits cap creation at five AI runs per account/hour, 100 site-wide/day and ten recent active runs. These are usage guardrails, not a dollar-denominated spend cap; configure billing limits in the provider account. The optional `scripts/check-live-research.ts` performs an explicitly billable integration check using the local key file without logging it. It is not part of automated tests or the browser bundle.

## Architecture

- React and TypeScript, with Next.js-compatible routes through Vinext.
- Sites hosting and platform-owned ChatGPT authentication; site audience remains publicly shareable, but API records require sign-in and ownership checks.
- Cloudflare D1 / SQLite with Drizzle-managed schema migrations.
- Authenticated server routes, workspace ownership checks on every private record, same-origin mutation checks, and no browser database credentials.
- Durable research run records with leases, bounded recovery, immutable input snapshots, and idempotency keys.

This deployment adapts the guide's proposed Supabase/PostgreSQL/Vercel infrastructure to the hosting already available. Each authenticated account has an isolated owner-managed workspace. It does not implement shared organization records, member invitations or manager/viewer roles.

Live research executes in two bounded, lease-protected stages: source refresh, then recommendation generation. If interrupted, opening the run resumes queued/expired work. Keep the research page open until completion. This is not an always-on background worker; closed-browser scheduled processing is not included. Each completed run retains its frozen excerpts, source URLs and collection timestamp, but full scraped articles are removed from the final snapshot.

## Verification

```bash
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Start the local app and apply its database migration before browser tests. Playwright uses the installed Chrome channel. Test data is local and is not shipped to the hosted database. See [verification and operations](docs/OPERATIONS.md) for limitations and release procedures.
