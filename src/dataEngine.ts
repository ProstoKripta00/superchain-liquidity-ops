import type {
  ChainCoverageRow,
  ChainMetric,
  DexMarket,
  MarketScopeMetrics,
  NetworkScope,
  OutcomeTarget,
  PoolHealth,
} from "./types";

export function toNullableNumber(value: unknown): number | null {
  const numberValue =
    typeof value === "string" || typeof value === "number" ? Number(value) : null;
  return numberValue !== null && Number.isFinite(numberValue) ? numberValue : null;
}

export function toNumber(value: unknown): number {
  return toNullableNumber(value) ?? 0;
}

export function sumNullable(values: Array<number | null | undefined>): number | null {
  const numbers = values.filter((value): value is number => typeof value === "number");
  return numbers.length === 0 ? null : numbers.reduce((sum, value) => sum + value, 0);
}

export function ratioPct(
  numerator: number | null | undefined,
  denominator: number | null | undefined,
): number | null {
  if (
    typeof numerator !== "number" ||
    typeof denominator !== "number" ||
    denominator === 0
  ) {
    return null;
  }

  return (numerator / denominator) * 100;
}

export function weightedAverage(
  values: Array<{ value: number | null | undefined; weight: number | null | undefined }>,
): number | null {
  const valid = values.filter((item): item is { value: number; weight: number } =>
    typeof item.value === "number" && typeof item.weight === "number" && item.weight > 0,
  );
  const weightSum = valid.reduce((sum, item) => sum + item.weight, 0);

  if (weightSum === 0) {
    return null;
  }

  return valid.reduce((sum, item) => sum + item.value * item.weight, 0) / weightSum;
}

export function classifyOutcomeTarget(market: {
  volume30dUsd: number | null;
  fees30dUsd: number | null;
  change7dPct: number | null;
  feeToVolume30dPct: number | null;
}): OutcomeTarget {
  if ((market.volume30dUsd ?? 0) < 250_000) {
    return "Grow TVL";
  }

  if ((market.change7dPct ?? 0) < -20) {
    return "Monitor incentives";
  }

  if (market.fees30dUsd !== null && (market.feeToVolume30dPct ?? 0) < 0.02) {
    return "Improve fee efficiency";
  }

  return "Rebalance liquidity";
}

export function classifyMarketHealth(market: {
  volume24hUsd: number;
  volume30dUsd: number | null;
  change7dPct: number | null;
  fees30dUsd: number | null;
}): PoolHealth {
  if (
    market.volume24hUsd < 1_000 ||
    (market.volume30dUsd ?? 0) < 50_000 ||
    (market.change7dPct ?? 0) < -50
  ) {
    return "At risk";
  }

  if (
    market.volume24hUsd >= 100_000 &&
    (market.volume30dUsd ?? 0) >= 1_000_000 &&
    (market.change7dPct ?? 0) >= -10
  ) {
    return "Strong";
  }

  return "Watch";
}

export function buildMarketNote(market: {
  health: PoolHealth;
  fees30dUsd: number | null;
  change7dPct: number | null;
  feeToVolume30dPct: number | null;
}) {
  if (market.health === "At risk") {
    return "Live volume is weak or falling sharply. This market should be reviewed before incentive expansion.";
  }

  if (market.health === "Strong") {
    return "Live DEX usage is material enough to support reviewer analysis of liquidity and fee outcomes.";
  }

  if (market.fees30dUsd === null) {
    return "Volume is available, but protocol-level fee attribution is not exposed for this DEX in the current public feed.";
  }

  if ((market.feeToVolume30dPct ?? 0) < 0.02) {
    return "Volume exists, but fee capture is light relative to traded volume. This needs fee-efficiency review.";
  }

  return "Mixed live signal. Keep this market in the reviewer watchlist until volume and fee trends strengthen.";
}

export function buildMarketScopeMetrics(
  markets: DexMarket[],
  chains: ChainMetric[],
  network: NetworkScope,
): MarketScopeMetrics {
  const volume24h = markets.reduce((sum, market) => sum + market.volume24hUsd, 0);
  const volume30d = sumNullable(markets.map((market) => market.volume30dUsd)) ?? 0;
  const marketFees30d = sumNullable(markets.map((market) => market.fees30dUsd));
  const chainScope = chains.filter((chain) => network === "All" || chain.network === network);
  const chainFees30d = sumNullable(chainScope.map((chain) => chain.fees30dUsd));
  const weightedChange7d = weightedAverage(
    markets.map((market) => ({
      value: market.change7dPct,
      weight: market.volume30dUsd,
    })),
  );

  return {
    volume24h,
    volume30d,
    fees30d: marketFees30d ?? chainFees30d,
    feeToVolume: ratioPct(marketFees30d, volume30d),
    weightedChange7d: weightedChange7d ?? 0,
    watchCount: markets.filter((market) => market.health !== "Strong").length,
  };
}

export function buildChainCoverageRows(
  chains: ChainMetric[],
  network: NetworkScope,
): ChainCoverageRow[] {
  const rows = chains.filter((chain) => network === "All" || chain.network === network);
  const maxTvl = Math.max(...rows.map((row) => row.tvlUsd ?? 0), 1);

  return rows.map((row) => ({
    ...row,
    width: Math.max(8, ((row.tvlUsd ?? 0) / maxTvl) * 100),
  }));
}
