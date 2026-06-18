# Superchain Liquidity Ops Methodology

This document defines the measurement model for the live public dashboard.

## Current Data Sources

The app does not load a local metric dataset. Current public dashboard source:

- DefiLlama: DEX market volume, chain-level TVL, protocol/chain fee totals, and protocol source links for OP Mainnet, Base, Unichain, Mode, and Zora.

Pool-level adapters such as GeckoTerminal can be added through a backend or scheduled static ingestion job. They are not used as the browser-first public source because the public API is not reliable from GitHub Pages browser fetches.

Each exported market row includes the source URL and refresh timestamp.

## Data Engine

The app now separates data processing from the React UI.

`src/dataEngine.ts` is responsible for:

- numeric normalization from public API payloads
- nullable metric handling
- sum aggregation without fake replacements
- fee-to-volume ratio calculation
- weighted 7d trend calculation
- market health labels
- outcome target labels
- protocol health score components
- network-scoped totals
- chain coverage rows

This matters because reports, protocol scanner output, CSV exports, and future automation should use the same calculation rules. The UI should not become the source of truth for analytics logic.

## Core Metrics

### TVL

For network rows, the app displays DefiLlama chain TVL.

Production sources may include:

- DEX subgraphs
- DefiLlama adapters
- indexed pool reserves
- onchain token balances plus USD oracle/pricing data

### Market Movement

Weighted DEX market movement over 1-day, 7-day, and 30-day public windows when exposed by DefiLlama.

Used to detect:

- growing markets
- declining DEX activity
- markets that need incentive review

### Volume

Market table: 24-hour, 7-day, and 30-day DEX volume from DefiLlama protocol rows.

Network coverage: 24h, 7d, and 30d DEX volume from DefiLlama.

Used to evaluate whether liquidity is actually being used.

### Fees

Network coverage uses DefiLlama fee totals. Market rows use protocol fee attribution when the fee feed exposes the same protocol.

If protocol-level fee attribution is unavailable, the UI marks the value as unavailable instead of inserting a manual assumption.

### Fee Efficiency

Fee efficiency compares fees generated against liquidity supplied:

```text
fee_efficiency = 30d_fees / TVL
```

This helps reviewers distinguish underused liquidity from markets that generate meaningful activity.

In the live app this concept is represented as 30d fee-to-volume:

```text
fee_to_volume_30d = 30d_fees / 30d_dex_volume
```

### Liquidity Depth

Approximate depth available around active price ranges.

Production implementation can refine pool depth by pool type:

- concentrated liquidity pools: active tick/range analysis
- stable pools: reserves and slippage simulation
- volatile pools: reserve depth and route simulation

## Market Health Labels

### Strong

Market has healthy volume, positive or stable trend, reasonable fee output, and no obvious activity issue.

### Watch

Market has mixed signals, such as meaningful volume with weaker fees, rising activity with low fee capture, or negative short-term movement.

### At Risk

Market has low volume, declining activity, weak fee output, or signs that incentives may not be producing measurable impact.

## Protocol Scanner

The protocol scanner groups live DEX market rows by tracked protocol slug. It is designed to answer a commercial question before manual research starts:

```text
Is this protocol active enough on the Superchain to justify a paid report or outreach?
```

Current tracked profiles include Uniswap, Aerodrome, Velodrome, Curve, PancakeSwap, SushiSwap, Balancer, and KIM Exchange.

## Protocol Health Score

The protocol scanner includes a protocol health score. It is not a security audit, investment rating, or promise that a protocol will pay. It is an operational signal for deciding whether a protocol is worth deeper testing, a mini-report, or outreach.

The score is expressed as:

- total score from `0` to `100`
- grade: `A`, `B`, `C`, or `D`
- data confidence from `0` to `100`
- component breakdown
- strengths
- risks
- recommendation

Components:

| Component | Weight | Signal |
| --- | ---: | --- |
| DEX activity | 30% | 30d matched DEX volume |
| Fee capture | 20% | 30d fees and 30d fee-to-volume |
| Short-term trend | 15% | weighted 7d change |
| Superchain coverage | 15% | matched networks and market count |
| Market quality | 10% | Strong vs At Risk market mix |
| Data confidence | 10% | availability of fee and trend fields |

Grades:

- `A`: 80+
- `B`: 65-79
- `C`: 45-64
- `D`: below 45

Scanner statuses:

- `Ready for report`: enough visible activity and data confidence to prepare a public mini-report and outreach.
- `Monitor`: visible activity, but weak trends, incomplete fee data, or mixed market quality.
- `Low signal`: not enough public activity to justify manual sales effort yet.

The score is intentionally conservative when public data is incomplete. Missing values are not replaced by manual assumptions.

## Reviewer Outputs

The MVP should produce grant-review artifacts:

- CSV export by market
- protocol scanner and health score summary for outreach and report preparation
- Markdown mini-report for a selected protocol
- reports workspace for selecting, previewing, copying, and downloading generated reports
- public sample reports for client-facing proof-of-work across diagnostic, monitoring, and grant-evidence services
- export pack containing Markdown, CSV, structured JSON, and a manifest-style JSON handoff package
- automation runbook with report, export-pack, watchlist, source-audit, and scope-refresh jobs
- service layer with client-ready package briefs, deliverables, acceptance criteria, and service JSON
- outreach pipeline with protocol leads, persistent local CRM fields, generated DM/email/follow-up pitches, CSV export and JSON export
- chain-level TVL and fee summaries
- watchlist of underperforming markets
- 7d/30d trend reports
- notes explaining why a market is marked Strong, Watch, or At Risk

## Mini Report Generator

The mini-report generator converts the selected protocol scan into a Markdown artifact. It includes:

- executive summary
- protocol snapshot
- health score breakdown
- strengths and risks
- matched Superchain market table
- outreach angle
- recommendation
- next actions
- methodology notes

The generated report is intended for outreach, public examples, grant updates, and protocol growth conversations. It uses the same live scanner output and matched market rows shown in the dashboard.

## Reports Workspace

The Reports workspace turns the highest-signal protocol scans into a working report queue on the dashboard.

Current selection rule:

- prefer protocols marked `Ready for report`
- fall back to the top scanner scores when fewer than three protocols are ready
- generate each report from the same live protocol scan and matched markets used by the selected mini-report workflow

Each report can be selected, previewed as Markdown, copied, or downloaded as an `.md` file. These reports are examples for outreach and reviewer inspection. They are not manually curated endorsements, and they regenerate when the live snapshot changes.

## Public Sample Reports

Public Sample Reports convert the scanner and mini-report output into client-facing proof-of-work examples.

Current sample types:

- Protocol Diagnostic Sprint sample
- Liquidity Monitoring Retainer sample
- Grant Evidence Pack sample

When a matching live protocol scan exists, each sample is generated from current scanner data and matched Superchain markets. When live data is unavailable, the sample remains visible as a template fallback and clearly marks unavailable values. This keeps the sales artifact honest while still showing the report structure.

Each sample includes:

- service type and intended audience
- summary and key scanner metrics
- commercial use case
- Markdown report output
- JSON bundle export for the full public sample library

These samples are designed for public portfolio, outbound sales, and grant/product-review conversations. They are not security audits, investment recommendations, or manually curated endorsements.

## Export Pack

The Export Pack packages the selected protocol report into a practical handoff bundle.

Current artifacts:

- Markdown report for human review and outreach
- protocol markets CSV containing only markets matched to the selected scanner target
- current scope CSV using the active network and outcome filters
- protocol summary JSON with score, health components, metrics, recommendation, and source audit context
- full JSON handoff pack containing the manifest and embedded artifact contents

The pack is generated in the browser from the same live snapshot as the dashboard. It is not a signed audit file or a permanent archive. The purpose is to make protocol outreach, reviewer updates, and later automation easier to hand off without manually copying several screens.

## Automation

The Automation workspace turns the current live dashboard state into a repeatable operating queue.

Current job types:

- scope refresh: confirms that the selected network and outcome filters have live markets
- report generation: queues the strongest scanner targets for mini-report output
- export pack: packages the selected protocol report into Markdown, CSV and JSON artifacts
- watchlist: flags markets that are not classified as Strong
- source audit: checks whether public data endpoints are OK, degraded, or blocking

Each automation run generates a Markdown runbook with status, scope, job counts, outputs, next-run instructions, and the reason for each job. Browser automation is intentionally conservative: a blocked source or missing selection stays visible instead of being hidden behind a successful-looking export.

## Service Layer

The Service Layer turns the evidence system into client packages. It does not invent results or guarantee sales. It packages the current scanner, report, export and automation state into offers that can be sent to a protocol, grants team, or ecosystem operator.

Current service offers:

- Protocol Diagnostic Sprint: a fixed-scope report using the selected protocol mini-report and matched market exports
- Liquidity Monitoring Retainer: weekly runbook, watchlist and source-health monitoring for the selected Superchain scope
- Grant Evidence Pack: reviewer-ready package for teams that need public evidence around liquidity, volume, fees and source limitations

Each offer includes:

- suggested quote range and timeline
- target audience
- problem statement and sales angle
- deliverables
- acceptance criteria
- included artifacts
- client brief export
- structured service JSON

The layer is intentionally scoped to services that can be delivered from the available product outputs. If an offer depends on a selected export pack or a clean source audit, it is marked `Needs review` or `Blocked` instead of being presented as ready.

## Outreach Pipeline

The Outreach Pipeline turns scanner output into a practical lead list. It is not an automated spam system. It produces a prioritized workspace for manual outreach, with status tracking and copy-ready pitch variants.

Current lead states:

- New
- Ready to contact
- Contacted
- Replied
- Won
- Lost

Current pitch variants:

- DM: short message for X, Discord, Telegram, or ecosystem chats
- Email: longer business-development pitch with subject line
- Follow-up: short second-touch message

Each lead includes:

- scanner score and health grade
- recommended service package
- suggested price range from the Service Layer
- source-backed value signal
- reason for outreach
- next step
- contact target guidance
- selected pitch variant
- CRM notes
- last contacted date
- next follow-up date
- public source links

The current CRM is persisted in browser `localStorage`. Exported CSV and JSON include the saved status, selected pitch, notes, last contacted date, and next follow-up date. Backend or shared multi-device CRM persistence remains a later storage step.

## Initial Live Data Scope

Current adapters cover:

- OP Mainnet
- Base
- Unichain
- Mode
- Zora
- live DEX market volume, protocol fee attribution when available, source URLs, chain TVL, chain DEX volume, chain fees, and basic health scoring

Later phases can add more Superchain networks, DEXs, alerting, APIs, and automated reviewer reports.
