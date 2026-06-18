# Superchain Liquidity Ops

Open-source impact reporting for Optimism / Superchain liquidity and incentive programs.

Superchain Liquidity Ops helps protocols and reviewers measure whether liquidity incentives produce real DEX volume, fee generation, healthier markets, and reproducible evidence.

## Live Demo

- Public site: https://prostokripta00.github.io/superchain-liquidity-ops/
- Reviewer pack: `GRANT_REVIEWER_PACK.md`
- Methodology: `METHODOLOGY.md`
- Submission draft: `OP_GRANT_SUBMISSION_READY.md`
- Application copy: `OPTIMISM_APPLICATION.md`

## Product Focus

This project is not trying to compete with DeFiLlama, Dune, Artemis, Token Terminal, Nansen, Flipside, or GeckoTerminal as a raw-data dashboard.

The narrower use case is:

```text
Grant / incentive impact evidence packs for Superchain protocols and reviewers.
```

The app packages public data into decision-ready evidence:

- what changed after a liquidity or incentive campaign
- which markets are weak or deteriorating
- where volume does not produce meaningful fee output
- what a protocol can show a DAO, foundation, or grant reviewer
- what next action is supported by the available public data

## Current Proof-Of-Work

The current app is live-data first. It does not display a local metric fixture dataset.

Live now:

- browser-accessible DefiLlama ingestion for `OP Mainnet`, `Base`, `Unichain`, `Mode`, and `Zora`
- network and outcome filters
- DEX market rows for 24h, 7d, and 30d volume
- chain-level TVL, DEX volume, and fee totals
- protocol scanner for Uniswap, Aerodrome, Velodrome, Curve, PancakeSwap, SushiSwap, Balancer, and KIM Exchange
- protocol health score with grade, confidence, component weights, strengths, risks, and recommendation
- methodology section with visible formulas and score weights
- mini report generator with Markdown download and print / save PDF workflow
- reports workspace with generated protocol reports
- public case studies for Uniswap, Aerodrome, and Velodrome using live scanner data when available
- public sample reports and static sample files
- trust / proof section with public repo, live demo, methodology, source audit, and delivery boundaries
- contact / request report form and client intake form
- export pack builder with Markdown, CSV, summary JSON, and handoff JSON
- automation runbook and scheduled snapshot plan
- live market table, chain coverage, source audit, and reviewer pack

Internal operator tools are hidden behind `Operator mode` in the UI:

- pricing and service package builder
- payment / terms block
- launch desk
- service layer
- lead target list
- outreach pipeline with local CRM fields

These tools exist for manual commercialization, but they are not the public grant argument.

## Reviewer Flow

1. Open the public site.
2. Confirm the live status panel shows source state and refresh time.
3. Open `Scanner` and review protocol health scores.
4. Open `Methodology` and check score weights, formulas, and limitations.
5. Open `Reports` and inspect a generated protocol report.
6. Export Markdown or use `Print / Save PDF`.
7. Open `Case studies` and review a concrete public protocol analysis.
8. Open `Sample reports` and static sample files for artifact examples.
9. Open `Trust proof` and verify links, boundaries, and source transparency.
10. Open `Export pack` and download report artifacts.
11. Open `Scheduled snapshots` to inspect the automation plan.
12. Open `Sources` and confirm every live number links back to a public endpoint.

## Data Sources

The browser-first public dashboard uses DefiLlama endpoints that work from GitHub Pages:

```text
https://api.llama.fi/v2/chains
https://api.llama.fi/overview/dexs/{chain}
https://api.llama.fi/overview/fees/{chain}
```

Unavailable values are shown as unavailable. The app does not silently substitute manual numbers.

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

## Grant Fit

The grant-facing framing is:

```text
Funding to build an automated open-source Superchain liquidity impact monitoring system with reproducible snapshots, methodology, PDF evidence packs, and public case studies.
```

Strong grant signals already present:

- open-source repository
- public live demo
- public data sources
- source audit
- export packs
- report generator
- methodology
- case studies
- no fake clients or testimonials
- explicit limitations and non-financial-advice boundary

## Commercial Path

The practical monetization path is manual or semi-automated evidence reports, not a full SaaS subscription from day one.

Realistic first offers:

- first diagnostic report: `$300-$750`
- after one strong public case: `$750-$1,500`
- monitoring retainer: after a client has a recurring reporting need
- grant evidence pack: `$1,500-$3,000` when it helps a team receive, defend, or report funding

Operator tools in the app support this workflow, but the public product remains focused on ecosystem evidence.

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
Protocol scanner, methodology, reports, case studies, export packs, snapshots, source audit
        |
        v
Public impact console and optional operator workspace
```

Current stack:

- React
- TypeScript
- Vite
- Lucide icons
- GitHub Pages deployment

## Roadmap

1. Add a real scheduled snapshot job that commits static JSON/CSV artifacts.
2. Add official Optimism priority-pair configuration.
3. Add pool-level adapters through backend or scheduled static ingestion where browser APIs are insufficient.
4. Add before/after campaign windows for incentive reporting.
5. Improve PDF export beyond browser print.
6. Publish two public case studies from live data.
7. Add alerting for declining activity, weak fee output, or source degradation.
8. Add optional shared backend storage for operator CRM/intake records.

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
src/exportPack.ts            Export pack manifest, CSV generation, JSON handoff package
src/automation.ts            Browser-side automation runbook generator
src/scheduledSnapshots.ts    Snapshot schedule plan, YAML template, JSON export
src/serviceLayer.ts          Operator service offers and package briefs
src/leadTargets.ts           Operator lead shortlist
src/outreachPipeline.ts      Operator outreach pipeline and local CRM fields
src/App.tsx                  Main UI
src/styles.css               Product UI
public/samples/              Static Markdown, CSV, JSON, and manifest sample files
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

The current version is suitable for demonstrating the reviewer workflow, transparent public data handling, report exports, and the case-study model. The next serious upgrade is real scheduled snapshots.
