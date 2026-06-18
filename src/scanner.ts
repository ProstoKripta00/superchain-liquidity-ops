import { TRACKED_PROTOCOLS } from "./protocols";
import {
  buildProtocolHealthScore,
  ratioPct,
  sumNullable,
  weightedAverage,
} from "./dataEngine";
import type {
  DexMarket,
  ProtocolHealthScore,
  ProtocolProfile,
  ProtocolScan,
  ProtocolScanStatus,
  SuperchainNetwork,
} from "./types";

export function scanProtocols(markets: DexMarket[], updatedAt: string): ProtocolScan[] {
  return TRACKED_PROTOCOLS.map((profile) => buildProtocolScan(profile, markets, updatedAt))
    .filter((scan): scan is ProtocolScan => scan !== null)
    .sort((left, right) => right.score - left.score);
}

function buildProtocolScan(
  profile: ProtocolProfile,
  markets: DexMarket[],
  updatedAt: string,
): ProtocolScan | null {
  const matchedMarkets = markets.filter((market) => profile.slugs.includes(market.slug));

  if (matchedMarkets.length === 0) {
    return null;
  }

  const volume24hUsd = matchedMarkets.reduce((sum, market) => sum + market.volume24hUsd, 0);
  const volume30dUsd = sumNullable(matchedMarkets.map((market) => market.volume30dUsd)) ?? 0;
  const fees30dUsd = sumNullable(matchedMarkets.map((market) => market.fees30dUsd));
  const feeToVolume30dPct = ratioPct(fees30dUsd, volume30dUsd);
  const weightedChange7dPct = weightedAverage(
    matchedMarkets.map((market) => ({
      value: market.change7dPct,
      weight: market.volume30dUsd ?? 0,
    })),
  );
  const networks = uniqueNetworks(matchedMarkets);
  const strongMarkets = matchedMarkets.filter((market) => market.health === "Strong").length;
  const watchMarkets = matchedMarkets.filter((market) => market.health === "Watch").length;
  const atRiskMarkets = matchedMarkets.filter((market) => market.health === "At risk").length;
  const feeDataMarkets = matchedMarkets.filter(
    (market) => typeof market.fees30dUsd === "number",
  ).length;
  const trendDataMarkets = matchedMarkets.filter(
    (market) => typeof market.change7dPct === "number",
  ).length;
  const healthScore = buildProtocolHealthScore({
    marketCount: matchedMarkets.length,
    networkCount: networks.length,
    volume24hUsd,
    volume30dUsd,
    fees30dUsd,
    feeToVolume30dPct,
    weightedChange7dPct,
    strongMarkets,
    watchMarkets,
    atRiskMarkets,
    feeDataMarkets,
    trendDataMarkets,
  });
  const status = classifyProtocol(healthScore);

  return {
    id: profile.id,
    name: profile.name,
    segment: profile.segment,
    thesis: profile.thesis,
    slugs: profile.slugs,
    networks,
    marketIds: matchedMarkets.map((market) => market.id),
    marketCount: matchedMarkets.length,
    volume24hUsd,
    volume30dUsd,
    fees30dUsd,
    feeToVolume30dPct,
    weightedChange7dPct,
    strongMarkets,
    watchMarkets,
    atRiskMarkets,
    score: healthScore.total,
    healthScore,
    status,
    opportunity: buildOpportunity(status, profile, {
      volume30dUsd,
      fees30dUsd,
      networkCount: networks.length,
      atRiskMarkets,
    }),
    nextAction: buildNextAction(status, profile),
    sourceUrls: [...new Set(matchedMarkets.map((market) => market.sourceUrl))],
    updatedAt,
  };
}

function classifyProtocol(healthScore: ProtocolHealthScore): ProtocolScanStatus {
  if (healthScore.total >= 70 && healthScore.confidence >= 55) {
    return "Ready for report";
  }

  if (healthScore.total >= 45) {
    return "Monitor";
  }

  return "Low signal";
}

function buildOpportunity(
  status: ProtocolScanStatus,
  profile: ProtocolProfile,
  stats: {
    volume30dUsd: number;
    fees30dUsd: number | null;
    networkCount: number;
    atRiskMarkets: number;
  },
) {
  if (status === "Ready for report") {
    return `${profile.name} has enough live Superchain activity to package a paid liquidity-readiness or ecosystem performance report.`;
  }

  if (status === "Monitor") {
    return `${profile.name} has visible activity, but the scanner should track weak markets, fee attribution and trend changes before pitching a full report.`;
  }

  if (stats.atRiskMarkets > 0) {
    return `${profile.name} has weak Superchain market signals. A small diagnostic snapshot may work better than a full paid report.`;
  }

  return `${profile.name} is present, but live public metrics are still too thin for a strong monetizable report.`;
}

function buildNextAction(status: ProtocolScanStatus, profile: ProtocolProfile) {
  if (status === "Ready for report") {
    return `Prepare a public mini-report for ${profile.name}, then send outreach with the live evidence link.`;
  }

  if (status === "Monitor") {
    return `Add ${profile.name} to the weekly watchlist and wait for stronger trend or fee evidence before selling.`;
  }

  return `Keep ${profile.name} in the scanner, but do not spend manual research time until volume or fees improve.`;
}

function uniqueNetworks(markets: DexMarket[]): SuperchainNetwork[] {
  const networks = new Set<SuperchainNetwork>();

  for (const market of markets) {
    networks.add(market.network);
  }

  return [...networks].sort();
}
