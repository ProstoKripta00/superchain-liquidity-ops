# Grant Proposal: Superchain Liquidity Ops

## Summary

Superchain Liquidity Ops is an open-source analytics and monitoring tool that helps protocols, LPs, and grant reviewers track DEX TVL, fees, liquidity depth, and measurable outcomes across Superchain priority pairs.

The tool is designed to answer a practical grant question: are liquidity incentives actually increasing Superchain DEX TVL, fee generation, and capital efficiency?

## Problem

Optimism / Superchain grants and incentive programs need measurable impact. DEX TVL and DEX fees are important metrics, but teams often track them manually across explorers, dashboards, subgraphs, and protocol-specific reports.

This makes it harder for protocols, LPs, and reviewers to understand:

- which pools are growing TVL
- which pools generate meaningful fees
- where liquidity is deep but inefficient
- where incentives may be underperforming
- whether priority pairs are improving over time

## Solution

Superchain Liquidity Ops provides an open-source dashboard and reporting layer for Superchain DEX liquidity.

Core MVP:

- OP Mainnet and Base support
- tracked priority pairs
- TVL, volume, and fee metrics
- 7d and 30d trend windows
- pool health and watchlist labels
- fee efficiency analysis
- exportable reviewer reports
- public GitHub repository and hosted demo

## Why This Matters

The project directly supports measurable Superchain outcomes:

- better visibility into DEX TVL
- clearer reporting on DEX fees
- faster detection of underperforming pools
- better liquidity allocation decisions
- more transparent grant and incentive review workflows

## Milestones

### Milestone 1: Prototype and Methodology

Budget: `$2,000 equivalent in OP`

Deliverables:

- public dashboard prototype
- typed data model for pools, chains, and priority pairs
- initial methodology for TVL, fee efficiency, and pool health
- GitHub repository and grant documentation

### Milestone 2: Working Data MVP

Budget: `$8,000 equivalent in OP`

Deliverables:

- live data adapters for OP Mainnet and Base
- DEX pool ingestion for selected priority pairs
- 7d/30d TVL, volume, and fee tracking
- pool detail pages and health scoring
- exportable CSV/JSON reports

### Milestone 3: Launch Package and Reporting

Budget: `$5,000 equivalent in OP`

Deliverables:

- hosted public demo
- methodology documentation
- deployment docs
- testing and data validation
- final grant report with example reviewer outputs

## Budget

Total requested: `$15,000 equivalent in OP`

Breakdown:

- Founder/developer compensation: `$10,500`
- Backend/indexing development: `$1,500`
- Frontend analytics dashboard: `$1,200`
- Infrastructure, RPC, hosting, and data APIs: `$900`
- Testing, documentation, and reporting: `$900`

## Timeline

Estimated delivery: `5-6 weeks`

## Future Expansion

- additional Superchain networks
- more DEX adapters
- automated reviewer reports
- incentive-program impact pages
- public API for liquidity metrics
- pool alerts for TVL drops and fee underperformance
