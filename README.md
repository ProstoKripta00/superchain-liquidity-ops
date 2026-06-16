# Superchain Liquidity Ops

Open-source grant proof-of-work for an Optimism / Superchain liquidity monitoring tool.

## Product

Superchain Liquidity Ops helps protocols, LPs, and grant reviewers track measurable DEX outcomes across Superchain priority pairs:

- TVL by chain, DEX, and pair
- 30-day volume and fee generation
- fee efficiency
- liquidity depth
- 7-day TVL change
- pool health and watchlists
- CSV reports for grant reviews

The current version is a frontend MVP with a typed sample dataset. The grant milestone turns this into a live data product with DEX/subgraph/RPC adapters and an open-source reporting pipeline.

## Grant Fit

Target ecosystem: Optimism / Superchain

Target request: `$15,000 equivalent in OP`

Primary funded cost: founder/developer compensation for building the MVP into a working analytics and reporting tool.

## Local Development

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5175`.

## MVP Roadmap

1. Replace sample pools with live adapters for selected Superchain DEXs.
2. Add OP Mainnet and Base production data ingestion.
3. Add priority pair configuration and reviewer reports.
4. Add 7d/30d historical charts.
5. Add exportable CSV/JSON datasets.
6. Publish deployment and methodology docs.
