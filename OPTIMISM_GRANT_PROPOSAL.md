# Grant Proposal: Superchain Liquidity Ops

## Summary

Superchain Liquidity Ops is an open-source analytics and monitoring tool that helps protocols, LPs, and grant reviewers track Superchain DEX volume, fees, chain TVL, market health, and measurable outcomes.

The tool is designed to answer a practical grant question: are liquidity programs producing measurable Superchain DEX activity and fee generation?

## Problem

Optimism / Superchain grants and incentive programs need measurable impact. DEX TVL, DEX volume, and DEX fees are important metrics, but teams often track them manually across explorers, dashboards, public endpoints, subgraphs, and protocol-specific reports.

This makes it harder for protocols, LPs, and reviewers to understand:

- which markets are generating meaningful volume
- which markets generate fees
- where fee output is weak relative to activity
- where incentives may be underperforming
- whether evidence can be exported and reproduced

## Solution

Superchain Liquidity Ops provides an open-source dashboard and reporting layer for Superchain DEX markets.

Current proof-of-work:

- hosted public dashboard
- live DefiLlama data layer
- OP Mainnet, Base, Unichain, Mode, and Zora support
- chain TVL, DEX volume, and fee metrics
- market health and watchlist labels
- source audit cards
- CSV exports with source URLs and timestamps
- methodology and grant reviewer pack

Grant-funded scope:

- Optimism priority-pair configuration
- pool-level ingestion through backend or scheduled static adapters
- 7d and 30d trend windows for selected priority markets
- CSV/JSON reviewer reports
- testing, validation notes, and final grant report

## Why This Matters

The project directly supports measurable Superchain outcomes:

- better visibility into DEX activity
- clearer reporting on DEX fees
- faster detection of underperforming markets
- better liquidity allocation decisions
- more transparent grant and incentive review workflows

## Milestones

### Milestone 1: Live Proof-of-Work and Methodology

Budget: `$2,000 equivalent in OP`

Deliverables:

- hosted dashboard
- live source audit
- CSV export
- methodology update
- grant reviewer pack

### Milestone 2: Priority-Pair and Pool-Level Data MVP

Budget: `$8,000 equivalent in OP`

Deliverables:

- Optimism priority-pair configuration
- pool-level ingestion for selected priority markets
- 7d/30d TVL, volume, and fee tracking where sources allow it
- market detail panels and health scoring
- exportable CSV/JSON reports

### Milestone 3: Launch Package and Reporting

Budget: `$5,000 equivalent in OP`

Deliverables:

- final hosted public demo
- deployment docs
- source limitation notes
- testing and validation notes
- final grant report with example reviewer outputs

## Budget

Total requested: `$15,000 equivalent in OP`

Breakdown:

- Founder/developer implementation compensation: `$10,500`
- Backend/static ingestion and data adapters: `$1,500`
- Frontend reviewer workflow and reporting: `$1,200`
- Infrastructure, RPC, hosting, and data services: `$900`
- Testing, methodology, docs, and final reporting: `$900`

## Timeline

Estimated delivery: `5-6 weeks`

## Future Expansion

- additional Superchain networks
- more DEX adapters
- automated reviewer reports
- incentive-program impact pages
- public API for liquidity metrics
- pool alerts for TVL drops and fee underperformance
