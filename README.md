# Superchain Liquidity Ops

Independent OP / Superchain liquidity intelligence for teams that need source-backed DEX reports.

Superchain Liquidity Ops turns public OP and Superchain DEX data into practical reports for protocol teams, growth leads, ecosystem operators, and DAO contributors: volume, fees, weak markets, watchlists, source limits, and next actions.

## Live Site

- Public site: https://prostokripta00.github.io/superchain-liquidity-ops/
- Methodology: `METHODOLOGY.md`
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
- scheduled snapshots plan
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
http://127.0.0.1:5175/superchain-liquidity-ops/
```

Build:

```bash
npm run build
```

## Roadmap

1. Add real scheduled snapshots that commit static JSON/CSV artifacts.
2. Add official OP / Superchain priority-pair configuration.
3. Add deeper pool-level adapters through backend or scheduled static ingestion.
4. Add before/after campaign windows for incentive reporting.
5. Improve PDF export beyond browser print.
6. Publish more public case studies from live data.
7. Add alerting for declining activity, weak fee output, or source degradation.
8. Add optional shared backend storage for operator CRM/intake records.

## Status

Beta / live product proof.

The current version is suitable for demonstrating the report workflow, transparent public data handling, case-study model, pricing, and request flow. The next serious upgrade is recurring snapshots and deeper pool-level data.
