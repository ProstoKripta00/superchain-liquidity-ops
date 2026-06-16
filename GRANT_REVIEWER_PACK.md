# Grant Reviewer Pack: Superchain Liquidity Ops

## Reviewer Summary

Superchain Liquidity Ops is an open-source analytics tool for reviewing Optimism / Superchain DEX outcomes.

It helps reviewers answer one practical question:

```text
Are Superchain liquidity programs increasing useful DEX activity, fee generation, and measurable market health?
```

The current public proof-of-work is live-data first. It loads Superchain DEX market volume, fee totals, chain TVL, source status, and CSV exports from public DefiLlama endpoints. It does not use local metric fixtures for displayed values.

## OP Grant Fit

The project is aligned with Optimism grant objectives around:

- DEX liquidity and TVL visibility
- DEX fees as a measurable output
- trading volume as a proxy for real demand
- tooling that tracks, monitors, or improves priority-pair performance
- open-source reviewer infrastructure

Relevant public OP references:

- Optimism Grants Season 9: https://www.opgrants.io/seasons/current/season-9/
- Season 9 Governance Fund Missions: https://gov.optimism.io/t/season-9-governance-fund-missions/10526

Note: Season 9 submissions closed on May 20, 2026. This pack is prepared for the next comparable Optimism / Superchain funding window, direct reviewer discussion, or retroactive impact review.

## Current Proof-of-Work

Live demo:

- https://prostokripta00.github.io/superchain-liquidity-ops/

Repository:

- https://github.com/ProstoKripta00/superchain-liquidity-ops

Current working capabilities:

- live DEX market rows for OP Mainnet, Base, Unichain, Mode, and Zora
- chain-level TVL, DEX volume, and fee totals
- protocol-level fee attribution when exposed by the public data feed
- source audit for every endpoint
- network and outcome filters
- market health labels: Strong, Watch, At risk
- reviewer CSV export with source URLs and timestamps
- methodology documentation

## Five-Minute Reviewer Flow

1. Open the hosted dashboard.
2. Confirm the live status panel shows public sources loaded.
3. Filter to `OP Mainnet` or `Base`.
4. Review the DEX market table for volume, 30d fees, and health labels.
5. Open the source audit section and verify endpoint status.
6. Export the CSV report and inspect source URLs, timestamps, market slugs, health labels, and outcome targets.
7. Compare the outputs against the stated OP outcome metrics: DEX activity, fee generation, and market health.

## Metrics Map

| Reviewer Question | Current Metric | Source | Current Status |
| --- | --- | --- | --- |
| Is Superchain DEX activity measurable? | 24h, 7d, 30d DEX volume | DefiLlama DEX overview | Live |
| Are DEXs generating fees? | 24h, 7d, 30d chain fees and protocol fees where available | DefiLlama fees overview | Live |
| Which markets need review? | Strong / Watch / At risk labels | Derived from live volume, trend, and fee availability | Live |
| Can evidence be exported? | CSV report | Browser export from live snapshot | Live |
| Are sources transparent? | Source audit cards and source URLs in CSV | Public endpoints | Live |
| Can priority pairs be reviewed directly? | Pair-level adapters and priority-pair config | Future backend/static ingestion | Grant-funded milestone |

## Current Data Sources

The public dashboard currently uses browser-compatible public endpoints:

- `https://api.llama.fi/v2/chains`
- `https://api.llama.fi/overview/dexs/{chain}`
- `https://api.llama.fi/overview/fees/{chain}`

Supported chains in the current scope:

- OP Mainnet
- Base
- Unichain
- Mode
- Zora

## Methodology

Current health scoring is intentionally simple and auditable:

- `Strong`: meaningful 24h volume, meaningful 30d volume, and no severe short-term decline
- `Watch`: mixed signals, incomplete fee attribution, or moderate activity
- `At risk`: very low volume, weak 30d activity, or sharp negative trend

The app marks unavailable metrics as unavailable. It does not fill gaps with manual numbers.

Detailed methodology:

- `METHODOLOGY.md`

## Grant-Funded Work

The next grant-funded phase turns the live dashboard into a more specific Optimism reviewer tool:

1. Priority-pair configuration
   - Add OP priority-pair config from the latest official grant sheets.
   - Map DEX markets to relevant liquidity-pair objectives.

2. Pool-level ingestion
   - Add backend or scheduled static ingestion for pool-level sources that are not reliable from browser-only GitHub Pages.
   - Track selected pools with 7d and 30d windows.

3. Reviewer reports
   - Generate repeatable before/after reports for TVL, volume, fees, fee-to-volume, and health labels.
   - Add JSON export for downstream analysis.

4. Documentation and validation
   - Document source limitations.
   - Add test fixtures for scoring logic.
   - Publish example reviewer reports.

## Budget Request

Total request:

```text
$15,000 equivalent in OP
```

Breakdown:

| Category | Amount |
| --- | ---: |
| Founder/developer implementation compensation | $10,500 |
| Backend/static ingestion and data adapters | $1,500 |
| Frontend reviewer workflow and reporting | $1,200 |
| Infrastructure, RPC, hosting, and data services | $900 |
| Testing, methodology, docs, and final reporting | $900 |

This budget funds implementation, maintenance during the grant period, documentation, and reviewer-ready reporting artifacts.

## Delivery Timeline

Estimated delivery:

```text
5-6 weeks
```

Milestones:

| Milestone | Deliverables | Budget |
| --- | --- | ---: |
| 1. Live proof-of-work and methodology | Hosted dashboard, source audit, export, methodology update | $2,000 |
| 2. Priority-pair and pool-level data MVP | Priority config, pool ingestion, 7d/30d windows, health scoring | $8,000 |
| 3. Reviewer reporting package | CSV/JSON reports, deployment docs, validation notes, final report | $5,000 |

## Risks And Limitations

- Browser-only public APIs can be limited by CORS or rate limits.
- Pool-level data needs backend or scheduled ingestion for reliable production use.
- Current protocol-level fee attribution depends on public DefiLlama coverage.
- Priority-pair mapping should be updated when Optimism publishes a new official list.

## Why This Should Be Funded

Optimism grant reviewers need faster ways to evaluate whether liquidity programs create measurable DEX outcomes. This project reduces manual review work by turning public Superchain DEX data into a transparent, exportable, open-source workflow.

The requested grant funds a practical reviewer tool, not a closed internal dashboard.
