# Liquidity Monitoring Retainer Sample

Generated: static sample
Product: Superchain Liquidity Ops
Service: Liquidity Monitoring Retainer
Audience: Protocol growth, liquidity, and incentives operators

## Purpose

This sample shows the weekly monitoring format for a protocol that needs repeatable visibility into Superchain market quality.

## Weekly Snapshot

| Area | Status | Action |
| --- | --- | --- |
| DEX volume | Stable | Keep tracking 7d and 30d movement |
| Fees | Watch | Check whether fee output is lagging volume |
| Liquidity depth | Needs scope | Add pool-level adapter before final delivery |
| Source health | Ready | Public endpoints available |

## Watchlist

1. Base volatile pair has high volume but weaker fee capture.
2. OP Mainnet stable pair has enough usage but needs liquidity depth review.
3. One market has incomplete source data and should stay out of paid conclusions.

## Operating Cadence

- Refresh data weekly.
- Export the market CSV.
- Update the source-audit notes.
- Send a short action memo to the client.
- Save follow-up state in the CRM.

## Delivery Boundary

Recurring monitoring is useful only when the client confirms the markets, chains, and decision owner. Missing values stay visible instead of being replaced manually.
