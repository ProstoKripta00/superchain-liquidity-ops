import { TRACKED_PROTOCOLS } from "./protocols";
import type {
  DexMarket,
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
  const feeToVolume30dPct =
    fees30dUsd === null || volume30dUsd === 0 ? null : (fees30dUsd / volume30dUsd) * 100;
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
  const score = scoreProtocol({
    volume30dUsd,
    fees30dUsd,
    weightedChange7dPct,
    networkCount: networks.length,
    strongMarkets,
    marketCount: matchedMarkets.length,
  });
  const status = classifyProtocol(score);

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
    score,
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

function scoreProtocol(input: {
  volume30dUsd: number;
  fees30dUsd: number | null;
  weightedChange7dPct: number | null;
  networkCount: number;
  strongMarkets: number;
  marketCount: number;
}) {
  const volumeScore =
    input.volume30dUsd >= 1_000_000_000
      ? 30
      : input.volume30dUsd >= 100_000_000
        ? 24
        : input.volume30dUsd >= 10_000_000
          ? 16
          : input.volume30dUsd >= 1_000_000
            ? 8
            : 2;
  const feeScore =
    input.fees30dUsd === null
      ? 4
      : input.fees30dUsd >= 1_000_000
        ? 20
        : input.fees30dUsd >= 100_000
          ? 14
          : input.fees30dUsd >= 10_000
            ? 8
            : 3;
  const coverageScore = Math.min(20, input.networkCount * 5);
  const trendScore =
    input.weightedChange7dPct === null
      ? 5
      : input.weightedChange7dPct >= 20
        ? 15
        : input.weightedChange7dPct >= 0
          ? 11
          : input.weightedChange7dPct >= -20
            ? 7
            : 2;
  const qualityScore =
    input.marketCount === 0 ? 0 : Math.round((input.strongMarkets / input.marketCount) * 15);

  return Math.min(100, volumeScore + feeScore + coverageScore + trendScore + qualityScore);
}

function classifyProtocol(score: number): ProtocolScanStatus {
  if (score >= 70) {
    return "Ready for report";
  }

  if (score >= 45) {
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
    return `${profile.name} has enough live Superchain activity to package a paid grant-readiness or ecosystem performance report.`;
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

function sumNullable(values: Array<number | null>) {
  const numbers = values.filter((value): value is number => typeof value === "number");
  return numbers.length === 0 ? null : numbers.reduce((sum, value) => sum + value, 0);
}

function weightedAverage(values: Array<{ value: number | null; weight: number }>) {
  const valid = values.filter((item): item is { value: number; weight: number } =>
    typeof item.value === "number" && item.weight > 0,
  );
  const weightSum = valid.reduce((sum, item) => sum + item.weight, 0);

  if (weightSum === 0) {
    return null;
  }

  return valid.reduce((sum, item) => sum + item.value * item.weight, 0) / weightSum;
}
