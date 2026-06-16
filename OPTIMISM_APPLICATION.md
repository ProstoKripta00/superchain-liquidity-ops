# Optimism / Superchain Grant Application Copy

## Project Name

Superchain Liquidity Ops

## One-Line Description

Open-source analytics and monitoring for Superchain DEX volume, fees, chain TVL, market health, and reviewer-ready grant evidence.

## Brief Project Explanation

Superchain Liquidity Ops helps protocols, LPs, and grant reviewers understand whether liquidity programs are producing measurable Superchain DEX outcomes.

The current public proof-of-work is live-data first. It loads OP Mainnet, Base, Unichain, Mode, and Zora DEX market data from public DefiLlama endpoints, exposes source status, labels market health, and exports reviewer-ready CSV reports with source URLs and timestamps.

The grant-funded phase will add Optimism priority-pair configuration, reliable pool-level ingestion, 7d/30d before-after reporting, JSON exports, methodology validation, and final reviewer reports.

## Problem

Optimism / Superchain grants and incentive programs need measurable impact. DEX TVL, DEX fees, and trading volume are important outcomes, but reviewers often need to inspect several dashboards, protocol pages, public endpoints, and spreadsheets before they can compare performance.

This makes it harder to answer:

- which markets are producing useful DEX activity
- where fee generation is weak relative to volume
- which networks or DEXs need reviewer attention
- whether incentives are producing measurable outcomes
- whether evidence is exportable and reproducible

## Solution

We are building an open-source liquidity monitoring and reporting tool for Superchain DEX markets.

Current proof-of-work:

- hosted public dashboard
- live DefiLlama data layer
- OP Mainnet, Base, Unichain, Mode, and Zora coverage
- chain TVL, DEX volume, and fee totals
- market health labels
- source audit cards
- CSV export with source URLs and timestamps
- public methodology and reviewer pack

Grant-funded additions:

- Optimism priority-pair configuration
- pool-level adapters through backend or scheduled static ingestion
- 7d/30d historical windows for selected priority pools
- repeatable reviewer report templates
- JSON exports and validation notes

## Current Stage

Beta / early stage.

The current version is a working public proof-of-work with live data, source audit, filters, market health states, chain coverage, and CSV export. The next step is to make it a reviewer-grade Optimism tool with priority-pair mapping and pool-level reporting.

## Requested Grant

`$15,000 equivalent in OP`

## Budget Breakdown

- Founder/developer implementation compensation: `$10,500`
- Backend/static ingestion and data adapters: `$1,500`
- Frontend reviewer workflow and reporting: `$1,200`
- Infrastructure, RPC, hosting, and data services: `$900`
- Testing, methodology, docs, and final reporting: `$900`

## Timeline

5-6 weeks.

## Milestones

### Milestone 1: Live Proof-of-Work and Methodology

Budget: `$2,000 equivalent in OP`

Deliverables:

- hosted public dashboard
- live data source audit
- CSV export with source URLs and timestamps
- updated methodology
- grant reviewer pack

### Milestone 2: Priority-Pair and Pool-Level Data MVP

Budget: `$8,000 equivalent in OP`

Deliverables:

- Optimism priority-pair configuration
- pool-level ingestion for selected priority markets
- 7d/30d TVL, volume, and fee tracking where sources allow it
- market detail panels and health scoring
- CSV/JSON reviewer exports

### Milestone 3: Launch Package and Reporting

Budget: `$5,000 equivalent in OP`

Deliverables:

- final hosted public demo
- deployment documentation
- source limitation notes
- testing and validation notes
- final grant report with example reviewer outputs

## Why This Should Be Funded

This project directly supports measurable Superchain outcomes: clearer DEX volume and fee reporting, more transparent liquidity review workflows, better detection of underperforming markets, and reusable open-source reviewer tooling.

It gives reviewers and protocols a practical way to evaluate whether incentives are creating measurable DEX impact instead of relying on fragmented manual reporting.
