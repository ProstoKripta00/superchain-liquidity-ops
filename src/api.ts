import {
  SUPERCHAIN_SOURCES,
  llamaChainsUrl,
  llamaOverviewUrl,
  llamaProtocolUrl,
} from "./sources";
import type {
  ChainMetric,
  DexMarket,
  LiquiditySnapshot,
  OutcomeTarget,
  PoolHealth,
  SourceStatus,
  SuperchainSource,
} from "./types";

type LlamaChain = {
  name?: string;
  chainId?: number;
  tvl?: number;
};

type LlamaProtocol = {
  name?: string;
  displayName?: string;
  module?: string;
  category?: string;
  slug?: string;
  total24h?: number | null;
  total7d?: number | null;
  total30d?: number | null;
  change_1d?: number | null;
  change_7d?: number | null;
  change_1m?: number | null;
};

type LlamaOverview = {
  total24h?: number | null;
  total7d?: number | null;
  total30d?: number | null;
  protocols?: LlamaProtocol[];
};

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

function toNullableNumber(value: unknown): number | null {
  const numberValue =
    typeof value === "string" || typeof value === "number" ? Number(value) : null;
  return numberValue !== null && Number.isFinite(numberValue) ? numberValue : null;
}

function toNumber(value: unknown): number {
  return toNullableNumber(value) ?? 0;
}

function protocolKey(protocol: LlamaProtocol) {
  return (protocol.slug ?? protocol.module ?? protocol.displayName ?? protocol.name ?? "")
    .toLowerCase()
    .trim();
}

function sourceStatus(
  id: string,
  name: string,
  url: string,
  state: SourceStatus["state"],
  message: string,
  updatedAt: string,
): SourceStatus {
  return {
    id,
    name,
    url,
    state,
    message,
    updatedAt,
  };
}

function classifyOutcome(market: {
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

function classifyHealth(market: {
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

function buildMarketNote(market: {
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

function buildFeeMap(feesOverview: LlamaOverview) {
  const entries: Array<[string, LlamaProtocol]> = [];

  for (const protocol of feesOverview.protocols ?? []) {
    const key = protocolKey(protocol);
    if (key.length > 0) {
      entries.push([key, protocol]);
    }
  }

  return new Map<string, LlamaProtocol>(entries);
}

function buildMarkets(
  source: SuperchainSource,
  dexsOverview: LlamaOverview,
  feesOverview: LlamaOverview,
  updatedAt: string,
) {
  const feeMap = buildFeeMap(feesOverview);

  return (dexsOverview.protocols ?? [])
    .filter((protocol) => protocol.category === "Dexs")
    .map((protocol) => {
      const key = protocolKey(protocol);
      const feeProtocol = feeMap.get(key);
      const dex = protocol.displayName ?? protocol.name ?? protocol.module ?? "Unknown DEX";
      const slug = protocol.slug ?? protocol.module ?? dex.toLowerCase().replace(/\s+/g, "-");
      const volume24hUsd = toNumber(protocol.total24h);
      const volume7dUsd = toNullableNumber(protocol.total7d);
      const volume30dUsd = toNullableNumber(protocol.total30d);
      const fees24hUsd = toNullableNumber(feeProtocol?.total24h);
      const fees7dUsd = toNullableNumber(feeProtocol?.total7d);
      const fees30dUsd = toNullableNumber(feeProtocol?.total30d);
      const feeToVolume30dPct =
        fees30dUsd === null || volume30dUsd === null || volume30dUsd === 0
          ? null
          : (fees30dUsd / volume30dUsd) * 100;
      const change7dPct = toNullableNumber(protocol.change_7d);
      const health = classifyHealth({
        volume24hUsd,
        volume30dUsd,
        change7dPct,
        fees30dUsd,
      });

      return {
        id: `${source.chainId}-${slug}`,
        network: source.network,
        dex,
        slug,
        category: protocol.category ?? "Dexs",
        priority: source.network === "OP Mainnet" || source.network === "Base",
        volume24hUsd,
        volume7dUsd,
        volume30dUsd,
        fees24hUsd,
        fees7dUsd,
        fees30dUsd,
        change1dPct: toNullableNumber(protocol.change_1d),
        change7dPct,
        change30dPct: toNullableNumber(protocol.change_1m),
        feeToVolume30dPct,
        health,
        outcomeTarget: classifyOutcome({
          volume30dUsd,
          fees30dUsd,
          change7dPct,
          feeToVolume30dPct,
        }),
        sourceUrl: llamaProtocolUrl(slug),
        updatedAt,
        note: buildMarketNote({
          health,
          fees30dUsd,
          change7dPct,
          feeToVolume30dPct,
        }),
      } satisfies DexMarket;
    })
    .filter((market) => market.volume24hUsd > 0 || (market.volume30dUsd ?? 0) > 0)
    .sort((left, right) => (right.volume30dUsd ?? 0) - (left.volume30dUsd ?? 0))
    .slice(0, source.network === "OP Mainnet" ? 10 : 7);
}

async function fetchChainTvlByName() {
  const chains = await getJson<LlamaChain[]>(llamaChainsUrl());

  return new Map(
    chains
      .filter((chain) => typeof chain.name === "string")
      .map((chain) => [chain.name as string, toNullableNumber(chain.tvl)]),
  );
}

async function fetchNetworkBundle(
  source: SuperchainSource,
  chainTvlUsd: number | null,
  updatedAt: string,
) {
  const dexsUrl = llamaOverviewUrl("dexs", source.llamaChain);
  const feesUrl = llamaOverviewUrl("fees", source.llamaChain);
  const [dexsOverview, feesOverview] = await Promise.all([
    getJson<LlamaOverview>(dexsUrl),
    getJson<LlamaOverview>(feesUrl),
  ]);
  const markets = buildMarkets(source, dexsOverview, feesOverview, updatedAt);

  const chain = {
    network: source.network,
    chainId: source.chainId,
    tvlUsd: chainTvlUsd,
    dexVolume24hUsd: toNullableNumber(dexsOverview.total24h),
    dexVolume7dUsd: toNullableNumber(dexsOverview.total7d),
    dexVolume30dUsd: toNullableNumber(dexsOverview.total30d),
    fees24hUsd: toNullableNumber(feesOverview.total24h),
    fees7dUsd: toNullableNumber(feesOverview.total7d),
    fees30dUsd: toNullableNumber(feesOverview.total30d),
    sourceUrl: "https://defillama.com/chains",
  } satisfies ChainMetric;

  return {
    markets,
    chain,
    statuses: [
      sourceStatus(
        `llama-dexs-${source.llamaChain}`,
        `DefiLlama DEX volume ${source.network}`,
        dexsUrl,
        markets.length > 0 ? "ok" : "degraded",
        markets.length > 0
          ? `${markets.length} live DEX markets loaded`
          : "No DEX market rows returned for this chain",
        updatedAt,
      ),
      sourceStatus(
        `llama-fees-${source.llamaChain}`,
        `DefiLlama fees ${source.network}`,
        feesUrl,
        chain.fees30dUsd === null ? "degraded" : "ok",
        chain.fees30dUsd === null
          ? "Chain fee totals unavailable"
          : "Chain fee totals loaded",
        updatedAt,
      ),
    ],
  };
}

export async function loadLiquiditySnapshot(): Promise<LiquiditySnapshot> {
  const updatedAt = new Date().toISOString();
  const chainTvlByName = await fetchChainTvlByName().catch(() => null);
  const bundleResults = await Promise.allSettled(
    SUPERCHAIN_SOURCES.map((source) =>
      fetchNetworkBundle(
        source,
        chainTvlByName?.get(source.llamaChain) ?? null,
        updatedAt,
      ),
    ),
  );

  const markets = bundleResults.flatMap((result) =>
    result.status === "fulfilled" ? result.value.markets : [],
  );
  const chains = bundleResults.flatMap((result) =>
    result.status === "fulfilled" ? [result.value.chain] : [],
  );
  const bundleStatuses = bundleResults.flatMap((result, index) => {
    const source = SUPERCHAIN_SOURCES[index];
    if (result.status === "fulfilled") {
      return result.value.statuses;
    }

    return [
      sourceStatus(
        `llama-${source.llamaChain}`,
        `DefiLlama ${source.network}`,
        llamaOverviewUrl("dexs", source.llamaChain),
        "error",
        result.reason instanceof Error
          ? result.reason.message
          : "Failed to load live chain data",
        updatedAt,
      ),
    ];
  });

  const sources = [
    sourceStatus(
      "llama-chains",
      "DefiLlama chain TVL",
      llamaChainsUrl(),
      chainTvlByName === null ? "degraded" : "ok",
      chainTvlByName === null
        ? "Chain TVL unavailable; market volume and fees still loaded"
        : "Chain TVL loaded",
      updatedAt,
    ),
    ...bundleStatuses,
  ];
  const degraded = sources.some((source) => source.state !== "ok");

  if (markets.length === 0 && chains.length === 0) {
    throw new Error("No live DEX or chain metrics could be loaded.");
  }

  return {
    markets,
    chains,
    sources,
    updatedAt,
    degraded,
  };
}
