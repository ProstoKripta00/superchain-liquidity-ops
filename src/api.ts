import {
  buildMarketNote,
  classifyMarketHealth,
  classifyOutcomeTarget,
  ratioPct,
  toNullableNumber,
  toNumber,
} from "./dataEngine";
import {
  SUPERCHAIN_SOURCES,
  llamaChainsUrl,
  llamaOverviewUrl,
  llamaProtocolUrl,
} from "./sources";
import { scanProtocols } from "./scanner";
import type {
  ChainMetric,
  DexMarket,
  LiquiditySnapshot,
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
      const feeToVolume30dPct = ratioPct(fees30dUsd, volume30dUsd);
      const change7dPct = toNullableNumber(protocol.change_7d);
      const health = classifyMarketHealth({
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
        outcomeTarget: classifyOutcomeTarget({
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
  const protocolScans = scanProtocols(markets, updatedAt);

  if (markets.length === 0 && chains.length === 0) {
    throw new Error("No live DEX or chain metrics could be loaded.");
  }

  return {
    markets,
    protocolScans,
    chains,
    sources,
    updatedAt,
    degraded,
  };
}
