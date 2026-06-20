import type {
  ChainCoverageRow,
  ChainMetric,
  DexMarket,
  MarketScopeMetrics,
  NetworkScope,
  OutcomeTarget,
  ProtocolHealthComponent,
  ProtocolHealthGrade,
  ProtocolHealthScore,
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
  const numbers = values.filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value),
  );
  return numbers.length === 0 ? null : numbers.reduce((sum, value) => sum + value, 0);
}

export function ratioPct(
  numerator: number | null | undefined,
  denominator: number | null | undefined,
): number | null {
  if (
    typeof numerator !== "number" ||
    typeof denominator !== "number" ||
    !Number.isFinite(numerator) ||
    !Number.isFinite(denominator) ||
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
    typeof item.value === "number" &&
    typeof item.weight === "number" &&
    Number.isFinite(item.value) &&
    Number.isFinite(item.weight) &&
    item.weight > 0,
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
    return "Live DEX usage is material enough to support operator analysis of liquidity and fee outcomes.";
  }

  if (market.fees30dUsd === null) {
    return "Volume is available, but protocol-level fee attribution is not exposed for this DEX in the current public feed.";
  }

  if ((market.feeToVolume30dPct ?? 0) < 0.02) {
    return "Volume exists, but fee capture is light relative to traded volume. This needs fee-efficiency review.";
  }

  return "Mixed live signal. Keep this market in the operator watchlist until volume and fee trends strengthen.";
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

export function buildProtocolHealthScore(input: {
  marketCount: number;
  networkCount: number;
  volume24hUsd: number;
  volume30dUsd: number;
  fees30dUsd: number | null;
  feeToVolume30dPct: number | null;
  weightedChange7dPct: number | null;
  strongMarkets: number;
  watchMarkets: number;
  atRiskMarkets: number;
  feeDataMarkets: number;
  trendDataMarkets: number;
}): ProtocolHealthScore {
  const components: ProtocolHealthComponent[] = [
    {
      id: "activity",
      label: "DEX activity",
      score: scoreActivity(input.volume30dUsd),
      weight: 30,
      note: activityNote(input.volume30dUsd),
    },
    {
      id: "fees",
      label: "Fee capture",
      score: scoreFeeCapture(input.fees30dUsd, input.feeToVolume30dPct),
      weight: 20,
      note: feeNote(input.fees30dUsd, input.feeToVolume30dPct),
    },
    {
      id: "trend",
      label: "Short-term trend",
      score: scoreTrend(input.weightedChange7dPct),
      weight: 15,
      note: trendNote(input.weightedChange7dPct),
    },
    {
      id: "coverage",
      label: "Superchain coverage",
      score: scoreCoverage(input.networkCount, input.marketCount),
      weight: 15,
      note: coverageNote(input.networkCount, input.marketCount),
    },
    {
      id: "risk",
      label: "Market quality",
      score: scoreMarketQuality(input.marketCount, input.strongMarkets, input.atRiskMarkets),
      weight: 10,
      note: qualityNote(input.marketCount, input.strongMarkets, input.atRiskMarkets),
    },
    {
      id: "confidence",
      label: "Data confidence",
      score: scoreDataConfidence(
        input.marketCount,
        input.feeDataMarkets,
        input.trendDataMarkets,
      ),
      weight: 10,
      note: confidenceNote(input.marketCount, input.feeDataMarkets, input.trendDataMarkets),
    },
  ];
  const total = Math.round(
    components.reduce((sum, component) => sum + component.score * component.weight, 0) / 100,
  );
  const confidence =
    components.find((component) => component.id === "confidence")?.score ?? 0;

  return {
    total,
    grade: gradeProtocol(total),
    confidence,
    components,
    strengths: buildProtocolStrengths(input, components),
    risks: buildProtocolRisks(input, components),
    recommendation: buildProtocolRecommendation(total, confidence, input.atRiskMarkets),
  };
}

function scoreActivity(volume30dUsd: number) {
  if (volume30dUsd >= 1_000_000_000) return 100;
  if (volume30dUsd >= 100_000_000) return 85;
  if (volume30dUsd >= 10_000_000) return 65;
  if (volume30dUsd >= 1_000_000) return 45;
  if (volume30dUsd >= 250_000) return 25;
  return 10;
}

function scoreFeeCapture(fees30dUsd: number | null, feeToVolume30dPct: number | null) {
  if (fees30dUsd === null) {
    return 35;
  }

  const feeScale =
    fees30dUsd >= 1_000_000
      ? 90
      : fees30dUsd >= 100_000
        ? 75
        : fees30dUsd >= 10_000
          ? 55
          : fees30dUsd >= 1_000
            ? 35
            : 15;
  const efficiency =
    feeToVolume30dPct === null
      ? 35
      : feeToVolume30dPct >= 0.12
        ? 100
        : feeToVolume30dPct >= 0.06
          ? 80
          : feeToVolume30dPct >= 0.03
            ? 60
            : feeToVolume30dPct >= 0.01
              ? 35
              : 15;

  return Math.round(feeScale * 0.7 + efficiency * 0.3);
}

function scoreTrend(weightedChange7dPct: number | null) {
  if (weightedChange7dPct === null) return 50;
  if (weightedChange7dPct >= 30) return 100;
  if (weightedChange7dPct >= 10) return 85;
  if (weightedChange7dPct >= 0) return 70;
  if (weightedChange7dPct >= -10) return 55;
  if (weightedChange7dPct >= -25) return 35;
  return 15;
}

function scoreCoverage(networkCount: number, marketCount: number) {
  const networkScore =
    networkCount >= 4 ? 100 : networkCount === 3 ? 80 : networkCount === 2 ? 60 : 35;
  const marketScore = marketCount >= 8 ? 100 : marketCount >= 5 ? 80 : marketCount >= 3 ? 60 : 35;

  return Math.round(networkScore * 0.65 + marketScore * 0.35);
}

function scoreMarketQuality(marketCount: number, strongMarkets: number, atRiskMarkets: number) {
  if (marketCount === 0) return 0;

  const strongRatio = strongMarkets / marketCount;
  const riskRatio = atRiskMarkets / marketCount;
  return clampScore(Math.round(55 + strongRatio * 45 - riskRatio * 65));
}

function scoreDataConfidence(marketCount: number, feeDataMarkets: number, trendDataMarkets: number) {
  if (marketCount === 0) return 0;

  const feeCoverage = feeDataMarkets / marketCount;
  const trendCoverage = trendDataMarkets / marketCount;
  return clampScore(Math.round(30 + feeCoverage * 40 + trendCoverage * 30));
}

function gradeProtocol(total: number): ProtocolHealthGrade {
  if (total >= 80) return "A";
  if (total >= 65) return "B";
  if (total >= 45) return "C";
  return "D";
}

function activityNote(volume30dUsd: number) {
  if (volume30dUsd >= 1_000_000_000) return "Institutional-scale 30d Superchain DEX activity.";
  if (volume30dUsd >= 100_000_000) return "Strong 30d DEX activity across matched markets.";
  if (volume30dUsd >= 10_000_000) return "Meaningful activity, enough for a focused protocol report.";
  if (volume30dUsd >= 1_000_000) return "Visible activity, but report scope should stay narrow.";
  return "Activity is thin for a paid report.";
}

function feeNote(fees30dUsd: number | null, feeToVolume30dPct: number | null) {
  if (fees30dUsd === null) return "Protocol-level fee attribution is unavailable in the public feed.";
  if (fees30dUsd >= 1_000_000) return "Fee generation is strong enough for an impact narrative.";
  if ((feeToVolume30dPct ?? 0) < 0.02) return "Fee capture is weak relative to traded volume.";
  return "Fee output is visible but should be compared against volume and incentives.";
}

function trendNote(weightedChange7dPct: number | null) {
  if (weightedChange7dPct === null) return "7d trend coverage is incomplete.";
  if (weightedChange7dPct >= 10) return "Weighted 7d trend is improving.";
  if (weightedChange7dPct >= -10) return "Weighted 7d trend is broadly stable.";
  return "Weighted 7d trend is deteriorating and needs explanation.";
}

function coverageNote(networkCount: number, marketCount: number) {
  if (networkCount >= 3) return "Protocol has broad Superchain presence.";
  if (marketCount >= 3) return "Protocol has several matched markets but limited chain spread.";
  return "Protocol coverage is narrow.";
}

function qualityNote(marketCount: number, strongMarkets: number, atRiskMarkets: number) {
  if (marketCount === 0) return "No matched markets.";
  if (atRiskMarkets > strongMarkets) return "At-risk markets outnumber strong markets.";
  if (strongMarkets > 0) return "Matched markets include strong live activity.";
  return "Matched markets are mostly watchlist quality.";
}

function confidenceNote(marketCount: number, feeDataMarkets: number, trendDataMarkets: number) {
  if (marketCount === 0) return "No data coverage.";
  if (feeDataMarkets === marketCount && trendDataMarkets === marketCount) {
    return "Fee and trend data are available across all matched markets.";
  }

  return "Some fee or trend fields are unavailable from public endpoints.";
}

function buildProtocolStrengths(
  input: {
    volume30dUsd: number;
    fees30dUsd: number | null;
    networkCount: number;
    strongMarkets: number;
  },
  components: ProtocolHealthComponent[],
) {
  const strengths: string[] = [];

  if (input.volume30dUsd >= 100_000_000) {
    strengths.push("Large 30d DEX activity base");
  }

  if ((input.fees30dUsd ?? 0) >= 100_000) {
    strengths.push("Visible 30d fee generation");
  }

  if (input.networkCount >= 3) {
    strengths.push("Multi-network Superchain footprint");
  }

  if (input.strongMarkets > 0) {
    strengths.push("Has markets classified as Strong");
  }

  return strengths.length > 0
    ? strengths
    : components
        .filter((component) => component.score >= 65)
        .map((component) => component.label);
}

function buildProtocolRisks(
  input: {
    fees30dUsd: number | null;
    weightedChange7dPct: number | null;
    atRiskMarkets: number;
    feeDataMarkets: number;
    marketCount: number;
  },
  components: ProtocolHealthComponent[],
) {
  const risks: string[] = [];

  if (input.fees30dUsd === null || input.feeDataMarkets < input.marketCount) {
    risks.push("Incomplete protocol-level fee data");
  }

  if ((input.weightedChange7dPct ?? 0) < -20) {
    risks.push("Deteriorating weighted 7d trend");
  }

  if (input.atRiskMarkets > 0) {
    risks.push("Contains at-risk markets");
  }

  for (const component of components) {
    if (component.score < 35 && !risks.includes(`${component.label} weakness`)) {
      risks.push(`${component.label} weakness`);
    }
  }

  return risks.length > 0 ? risks : ["No critical scanner risk flagged"];
}

function buildProtocolRecommendation(total: number, confidence: number, atRiskMarkets: number) {
  if (total >= 75 && confidence >= 65) {
    return "Prepare a public mini-report and use it for direct protocol outreach.";
  }

  if (total >= 60) {
    return "Prepare a narrow diagnostic report, then monitor before selling a full package.";
  }

  if (atRiskMarkets > 0) {
    return "Use this as a watchlist target, not a paid report target yet.";
  }

  return "Keep in automated monitoring until activity, fees, or data confidence improve.";
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, value));
}
