# Superchain Liquidity Ops

Open-source liquidity monitoring for Optimism / Superchain DEX outcomes.

## Product

Superchain Liquidity Ops helps protocols, LPs, and grant reviewers track measurable DEX outcomes across Superchain priority pairs:

- live DEX market volume by chain and protocol
- 24-hour, 7-day, and 30-day DEX volume windows
- chain-level TVL, DEX volume, and fees
- protocol-level fee attribution when the public feed exposes it
- source status for every public endpoint
- market health and watchlists
- timestamped CSV reports for grant reviews

The public app is live-data first. It loads DEX volume, fee, and chain TVL data from DefiLlama public endpoints. If an endpoint is unavailable, the app surfaces the source error instead of silently substituting a local dataset.

## Reviewer Materials

- `GRANT_REVIEWER_PACK.md`: reviewer summary, OP grant fit, current evidence, budget, milestones, risks, and five-minute review flow.
- `METHODOLOGY.md`: measurement model, current data sources, health scoring, and data limitations.
- `OPTIMISM_APPLICATION.md`: application copy for Optimism / Superchain funding opportunities.

## Grant Fit

Target ecosystem: Optimism / Superchain

Target request: `$15,000 equivalent in OP`

Primary funded cost: founder/developer compensation for building the MVP into a working analytics and reporting tool.

Public product pages avoid budget language and focus on reviewer utility, measurable liquidity outcomes, and transparent data sources.

## Local Development

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5175`.

## MVP Roadmap

1. Add priority-pair configuration from the latest Optimism grants sheet.
2. Add pool-level adapters through a backend or static ingestion job for sources that do not support browser CORS.
3. Add reviewer report templates for grant impact analysis.
4. Add JSON exports and a public API endpoint.
5. Add alerting for pools with declining liquidity or weak fee output.
6. Publish deployment and methodology docs.
