# Superchain Liquidity Ops

Independent OP / Superchain liquidity intelligence for teams that need source-backed DEX reports.

Superchain Liquidity Ops turns public OP and Superchain DEX data into practical reports for protocol teams, growth leads, ecosystem operators, and DAO contributors: volume, fees, weak markets, watchlists, source limits, and next actions.

## Live Site

- Public site: https://prostokripta00.github.io/superchain-liquidity-ops/
- Methodology: `METHODOLOGY.md`
- Production runbook: `PRODUCTION_RUNBOOK.md`
- Repository: https://github.com/ProstoKripta00/superchain-liquidity-ops

Independent tool. Not affiliated with or endorsed by Optimism Foundation.

## Main Offer

The public product is built around a narrow first sale:

```text
7-day Liquidity Impact Report for OP / Superchain markets.
```

The report answers:

- where a protocol has real DEX activity
- which markets are weak, stale, or underused
- whether volume is producing visible fee output
- which public data can be verified by a buyer or DAO
- what action is justified next

Pilot price: `$500`.

Standard pricing after initial proof:

- 7-day Liquidity Impact Report: `$750-$1,500`
- Monthly Monitoring: `$750-$1,500/mo`
- DAO / Incentive Evidence Pack: `$1,500-$3,000`

## Public Product

The public site exposes the buyer-facing workflow:

1. Live OP / Superchain Snapshot
2. What You Get
3. Protocol Scanner
4. Generated Reports
5. Sample Case Studies
6. Methodology
7. Pricing
8. Trust / Boundaries
9. Request Report
10. Sources

Public sections focus on proof, source transparency, and a clear request path. Internal sales tools are hidden by default.

## Client Workspace

The app now includes a client/operator workspace at:

```text
https://prostokripta00.github.io/superchain-liquidity-ops/#/app
```

Current workspace capabilities:

- client dashboard with active requests, report files, messages, and activity
- request creation for 7-day reports, monitoring, and DAO / incentive evidence packs
- request pipeline statuses: `New`, `Scoping`, `In progress`, `Review`, `Delivered`
- delivered report/file library with client-visible vs operator-only access labels
- operator queue for moving requests and registering report delivery files
- one-click generated report package: Markdown memo, PDF-ready HTML, CSV evidence template, JSON manifest
- payment status per request: `Unpaid`, `Invoice sent`, `Paid`, `Comped`
- invoice URL and payment method tracking
- payment gate: unpaid work can be drafted, but final client-visible delivery requires `Paid` or `Comped`
- client/account overview for protocol organizations
- admin console for creating organization/profile shells and production QA checks
- settings screen with Supabase backend readiness notes
- local demo storage for sales demos

Production backend target:

- Supabase Auth for users
- Supabase Postgres for organizations, profiles, requests, reports, files, messages, audit log
- Supabase Postgres snapshot history for scheduled worker runs and protocol scores
- Supabase Storage private bucket for PDF/HTML/CSV/JSON/Markdown report files
- Row Level Security so clients only see their own organization

Implemented backend connection:

- `src/supabaseClient.ts` creates the browser Supabase client when env keys exist.
- `src/supabaseWorkspace.ts` loads/saves workspace data through Supabase Postgres.
- Operator delivery can upload a selected file to the private `report-files` Storage bucket.
- Operator delivery can generate a Markdown/HTML/CSV/JSON report package and store it in private Storage.
- Report file links are generated as signed URLs.
- Admin console can create `organizations` and `profiles` rows for an existing Supabase Auth user UUID.
- Without env keys, the public GitHub Pages app stays in local demo mode.
- `npm run snapshot` generates daily public snapshot artifacts for GitHub Pages and optional Supabase metadata upload.

Supabase setup:

1. Create a Supabase project.
2. Run `SUPABASE_WORKSPACE_SCHEMA.sql` in the Supabase SQL editor.
3. Create/invite the first user in Supabase Auth.
4. Run the updated SQL again after policy changes. It is idempotent and keeps `Operator only` report files private from client accounts.
5. Insert the first `organizations` and `profiles` rows using the bootstrap example at the bottom of the SQL file, or use the bootstrap script below.
6. Add env vars locally or in the deployment environment:

```text
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
VITE_SUPABASE_REPORT_BUCKET=report-files
SUPABASE_SERVICE_ROLE_KEY=server-only-service-role-key
```

Local example:

```bash
cp .env.example .env.local
npm run dev
```

Seed a production demo workspace after env vars are available:

```bash
SUPABASE_URL=https://your-project-ref.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
ADMIN_EMAIL=owner@example.com \
CLIENT_EMAIL=demo.client@example.com \
CLIENT_PASSWORD='change-this-demo-password' \
npm run bootstrap:workspace
```

GitHub Pages note: Vite bakes `VITE_*` values into the static bundle at build time, so repository or workflow secrets must be available during the deploy build.

Client onboarding note: do not put a Supabase service-role key in the browser. Create or invite the Auth user in Supabase, copy the Auth user UUID, then use the Admin Console in `/app` to create the matching organization/profile rows.

Server worker note: `SUPABASE_SERVICE_ROLE_KEY` is only for GitHub Actions, VPS cron, or other trusted server workers. It must never be exposed as a `VITE_*` variable.

## Scheduled Snapshots

The project now includes a real snapshot worker:

```bash
npm run snapshot
```

It writes:

```text
public/snapshots/latest/manifest.json
public/snapshots/latest/market-impact.csv
public/snapshots/latest/protocol-scores.json
public/snapshots/latest/source-audit.json
public/snapshots/latest/scope-summary.json
snapshots/YYYY/MM/DD/<run-id>/*
```

The GitHub Actions workflow `.github/workflows/scheduled-snapshots.yml` runs daily, commits fresh artifacts, and lets the normal Pages workflow publish them. With `SUPABASE_SERVICE_ROLE_KEY`, the same worker also inserts metadata into `snapshot_runs` and `snapshot_protocol_scores`.

## Operator Tools

Operator tools are available with:

```text
?operator=1
```

They include:

- pricing and service package builder
- payment / terms block
- static sample file links
- intake form
- export pack builder
- automation runbook
- scheduled snapshots plan and public latest artifact links
- service layer
- lead target list
- outreach pipeline with browser-local CRM fields

These tools support manual commercialization. They are not required for a public buyer to understand the product.

## Current Proof Of Work

Live now:

- browser-accessible DefiLlama ingestion for `OP Mainnet`, `Base`, `Unichain`, `Mode`, and `Zora`
- chain-level TVL, DEX volume, and fee totals
- DEX market rows for 24h, 7d, and 30d volume
- protocol scanner for Uniswap, Aerodrome, Velodrome, Curve, PancakeSwap, SushiSwap, Balancer, and KIM Exchange
- protocol health score with grade, confidence, component weights, strengths, risks, and recommendation
- generated Markdown reports with copy, download, and browser print flow
- public case studies and sample reports
- request report flow with package, budget, scope, contact, and deliverable checklist
- source audit with public endpoint links and status
- scheduled snapshot worker with latest public JSON/CSV artifacts

Unavailable values are shown as unavailable. The app does not silently replace missing public data with manual numbers.

## Data Sources

The browser-first dashboard uses DefiLlama endpoints that work from GitHub Pages:

```text
https://api.llama.fi/v2/chains
https://api.llama.fi/overview/dexs/{chain}
https://api.llama.fi/overview/fees/{chain}
```

## Scoring Model

Protocol health score:

```text
health_score = sum(component_score * component_weight) / 100
```

Components:

| Component | Weight | Signal |
| --- | ---: | --- |
| DEX activity | 30% | 30d matched DEX volume |
| Fee capture | 20% | 30d fees and 30d fee-to-volume |
| Short-term trend | 15% | weighted 7d change |
| Superchain coverage | 15% | matched networks and market count |
| Market quality | 10% | Strong vs At Risk market mix |
| Data confidence | 10% | availability of fee and trend fields |

Core derived metrics:

```text
fee_to_volume_30d = 30d_fees / 30d_dex_volume
weighted_7d_trend = weighted_average(7d_change, 30d_volume)
data_confidence = 30 + fee_coverage * 40 + trend_coverage * 30
```

Grades:

- `A`: 80+
- `B`: 65-79
- `C`: 45-64
- `D`: below 45

## Commercial Path

The practical monetization path is manual reporting first, not a full SaaS subscription from day one.

First buyer path:

1. Send the public site and one sample case.
2. Offer a fixed 7-day report for one protocol, DEX, or network scope.
3. Deliver PDF/Markdown report, CSV evidence, source audit, weak-market review, and 3-5 next actions.
4. If the buyer needs recurring visibility, offer monthly monitoring.
5. If the buyer is preparing DAO, incentive, or ecosystem reporting, package a larger evidence pack.

## Architecture

```text
React + TypeScript + Vite
        |
        v
Live data adapters
        |
        +-- DefiLlama chains endpoint
        +-- DefiLlama DEX overview endpoint
        +-- DefiLlama fees endpoint
        |
        v
Data engine: normalization, nullable metrics, ratios, weighted trends, market health
        |
        v
Protocol scanner, reports, case studies, pricing, request flow, source audit
        |
        v
Public report sales page and optional operator workspace
```

Current stack:

- React
- TypeScript
- Vite
- Lucide icons
- GitHub Pages deployment

## Repository Map

```text
src/api.ts                   Live data loading, market scoring, scanner orchestration
src/dataEngine.ts            Metric normalization, ratios, aggregation, scoring rules
src/protocols.ts             Tracked protocol profiles and slug matchers
src/scanner.ts               Protocol readiness scoring and next-action logic
src/reportGenerator.ts       Markdown mini-report generation
src/caseStudies.ts           Public protocol case studies
src/sampleReports.ts         Public sample report generation
src/staticSamples.ts         Stable sample file metadata and GitHub Pages URLs
src/trustProof.ts            Verifiable proof stack and delivery boundaries
src/requestReport.ts         Request report package and buyer intake copy
src/exportPack.ts            Operator export pack manifest, CSV generation, JSON handoff
src/automation.ts            Operator automation runbook generator
src/scheduledSnapshots.ts    Operator snapshot schedule plan, YAML template, JSON export
scripts/generate-snapshot.mjs Node worker for public snapshot artifacts and optional Supabase upload
src/serviceLayer.ts          Operator service offers and package briefs
src/leadTargets.ts           Operator lead shortlist
src/outreachPipeline.ts      Operator outreach pipeline and local CRM fields
src/App.tsx                  Main UI
src/styles.css               Product UI
public/samples/              Static Markdown, CSV, JSON, and manifest sample files
public/snapshots/latest/     Latest generated public snapshot artifacts
snapshots/                   Archived dated snapshot runs
```

## Local Development

```bash
npm install
npm run dev
```

Open:

```text
http://127.0.0.1:5175/superchain-liquidity-ops/
```

Build:

```bash
npm run build
```

Generate current snapshot artifacts:

```bash
npm run snapshot
```

## Roadmap

1. Add official OP / Superchain priority-pair configuration.
2. Add deeper pool-level adapters through backend or scheduled static ingestion.
3. Add before/after campaign windows for incentive reporting.
4. Add true server-rendered PDF files if browser/PDF-ready HTML is not enough for buyers.
5. Publish more public case studies from live data.
6. Add alerting for declining activity, weak fee output, or source degradation.
7. Add optional shared backend storage for operator CRM/intake records.

## Status

Beta / production-ready pilot.

The current version is suitable for demonstrating the report workflow, transparent public data handling, case-study model, pricing, request flow, client portal, payment-gated delivery, and scheduled public snapshots. The next serious upgrade is deeper pool-level data and paid outreach execution.
