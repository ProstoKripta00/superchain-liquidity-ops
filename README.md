# Superchain Liquidity Ops

Open-source liquidity intelligence for Optimism / Superchain DEX outcomes.

Superchain Liquidity Ops helps protocols, LPs, and grant reviewers inspect whether Superchain liquidity programs are producing measurable DEX activity, fee generation, and market health.

## Live Demo

- Public dashboard: https://prostokripta00.github.io/superchain-liquidity-ops/
- Submission-ready application: `OP_GRANT_SUBMISSION_READY.md`
- Reviewer pack: `GRANT_REVIEWER_PACK.md`
- Methodology: `METHODOLOGY.md`
- Application copy: `OPTIMISM_APPLICATION.md`

## Why This Exists

Optimism / Superchain grant reviews need repeatable evidence, not disconnected screenshots and manual spreadsheet work. DEX TVL, DEX fees, and trading volume are measurable outcomes, but reviewers usually need to check several public dashboards, protocol pages, and data feeds before they can compare performance.

This project turns that review workflow into a public dashboard and exportable evidence layer.

## Current Proof-Of-Work

The current app is live-data first. It does not display local metric fixtures.

What works today:

- live DEX market rows for `OP Mainnet`, `Base`, `Unichain`, `Mode`, and `Zora`
- shared data engine for numeric normalization, ratios, weighted trends, market health, outcome labels, and scope totals
- protocol scanner for monetizable report targets such as Uniswap, Aerodrome, Velodrome, Curve, PancakeSwap, SushiSwap, Balancer, and KIM Exchange
- protocol health score with grade, confidence, component breakdown, strengths, risks, and recommendation
- mini report generator for reviewer-ready Markdown reports per selected protocol
- chain-level TVL, DEX volume, and fee totals
- protocol-level fee attribution when the public feed exposes it
- source audit for every public endpoint
- network and outcome filters
- market health labels: `Strong`, `Watch`, `At risk`
- reviewer CSV export with source URLs and timestamps
- hosted public demo on GitHub Pages

## Reviewer Flow

1. Open the public dashboard.
2. Confirm the live status panel shows data sources loaded.
3. Open `Protocol scanner` and identify targets marked `Ready for report`.
4. Generate a mini-report for the selected protocol.
5. Copy the Markdown report or download the `.md` file.
6. Filter to `OP Mainnet` or `Base`.
7. Review DEX market rows for 24h volume, 30d volume, 30d fees, and health labels.
8. Open `Source audit` and verify the public endpoints.
9. Export the CSV report.
10. Compare the exported evidence against the target outcomes: DEX activity, fee generation, and market health.

## Data Sources

The browser-first public dashboard uses DefiLlama endpoints that work from GitHub Pages:

```text
https://api.llama.fi/v2/chains
https://api.llama.fi/overview/dexs/{chain}
https://api.llama.fi/overview/fees/{chain}
```

Unavailable values are shown as unavailable. The app does not silently substitute manual numbers.

## Metrics

| Area | Current Metric | Status |
| --- | --- | --- |
| DEX activity | 24h, 7d, 30d DEX volume | Live |
| Fees | Chain fees and protocol fees where available | Live |
| Chain coverage | TVL and DEX totals by Superchain network | Live |
| Market health | Strong / Watch / At risk labels | Live |
| Data engine | Shared normalization, aggregation, ratios, weighted trends | Live |
| Protocol scanner | Protocol-level report readiness score and next action | Live |
| Protocol health score | Activity, fee capture, trend, coverage, quality, confidence | Live |
| Mini report generator | Markdown report with summary, metrics, score, markets, risks, next actions | Live |
| Reviewer evidence | CSV export with source URLs and timestamps | Live |
| Priority pairs | Official OP pair mapping and pool-level ingestion | Planned |

## Grant Fit

The project is designed around Optimism / Superchain grant outcomes:

- DEX liquidity visibility
- DEX fees as measurable output
- trading volume as a demand signal
- tools that track or improve priority-market performance
- open-source reviewer infrastructure

Funding details, milestones, risks, and budget are documented in `GRANT_REVIEWER_PACK.md`.

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
Data engine: normalization, ratios, weighted trends, market scoring
        |
        v
Protocol scanner, protocol health score, mini reports, scope totals, chain coverage, source audit, CSV export
        |
        v
Dashboard state and reviewer workflow
```

Current stack:

- React
- TypeScript
- Vite
- Lucide icons
- GitHub Pages deployment

## Roadmap

1. Publish public mini-reports for three scanner-selected protocols.
2. Add official Optimism priority-pair configuration.
3. Add pool-level adapters through backend or scheduled static ingestion for sources that do not support reliable browser fetches.
4. Add 7d/30d before-after reviewer reports.
5. Add JSON exports and a small public API surface.
6. Add alerting for markets with declining liquidity, weak fee output, or source degradation.
7. Publish example final grant reports.

## Repository Map

```text
src/api.ts                   Live data loading, market scoring, scanner orchestration
src/dataEngine.ts            Shared metric normalization, aggregation and scoring rules
src/protocols.ts             Tracked protocol profiles and slug matchers
src/scanner.ts               Protocol readiness scoring and next-action logic
src/reportGenerator.ts       Markdown mini-report generation for selected protocols
src/sources.ts               Supported chains and public endpoint URLs
src/App.tsx                  Dashboard, protocol scanner, filters, reviewer pack UI, export flow
src/styles.css               OP-inspired product UI
GRANT_REVIEWER_PACK.md       Reviewer summary, evidence, milestones, budget
OP_GRANT_SUBMISSION_READY.md Copy-paste grant form answers and checklist
METHODOLOGY.md               Metrics, source limitations, health scoring
OPTIMISM_APPLICATION.md      Application-ready grant copy
OPTIMISM_GRANT_PROPOSAL.md   Full proposal draft
```

## Local Development

```bash
npm install
npm run dev
```

Open:

```text
http://127.0.0.1:5175
```

Build:

```bash
npm run build
```

## Status

Beta / live proof-of-work.

The current version is suitable for demonstrating the reviewer workflow, data-source transparency, and exportable evidence. The next grant-funded phase is priority-pair mapping and pool-level reporting.
