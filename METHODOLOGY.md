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

## Initial Live Data Scope

Current adapters cover:

- OP Mainnet
- Base
- Unichain
- Mode
- Zora
- live DEX market volume, protocol fee attribution when available, source URLs, chain TVL, chain DEX volume, chain fees, and basic health scoring

Later phases can add more Superchain networks, DEXs, alerting, APIs, and automated reviewer reports.
