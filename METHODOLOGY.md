# Superchain Liquidity Ops Methodology

This document defines the measurement model for the live public dashboard.

## Current Data Sources

The app does not load a local metric dataset. Current public dashboard source:

- DefiLlama: DEX market volume, chain-level TVL, protocol/chain fee totals, and protocol source links for OP Mainnet, Base, Unichain, Mode, and Zora.

Pool-level adapters such as GeckoTerminal can be added through a backend or scheduled static ingestion job. They are not used as the browser-first public source because the public API is not reliable from GitHub Pages browser fetches.

Each exported market row includes the source URL and refresh timestamp.

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

## Reviewer Outputs

The MVP should produce grant-review artifacts:

- CSV export by market
- chain-level TVL and fee summaries
- watchlist of underperforming markets
- 7d/30d trend reports
- notes explaining why a market is marked Strong, Watch, or At Risk

## Initial Live Data Scope

Current adapters cover:

- OP Mainnet
- Base
- Unichain
- Mode
- Zora
- live DEX market volume, protocol fee attribution when available, source URLs, chain TVL, chain DEX volume, chain fees, and basic health scoring

Later phases can add more Superchain networks, DEXs, alerting, APIs, and automated reviewer reports.
