export type SuperchainNetwork =
  | "OP Mainnet"
  | "Base"
  | "Unichain"
  | "Mode"
  | "Zora";

export type OutcomeTarget =
  | "Grow TVL"
  | "Improve fee efficiency"
  | "Rebalance liquidity"
  | "Monitor incentives";

export type PoolHealth = "Strong" | "Watch" | "At risk";

export type SourceState = "ok" | "degraded" | "error";

export type SourceStatus = {
  id: string;
  name: string;
  url: string;
  state: SourceState;
  message: string;
  updatedAt: string;
};

export type SuperchainSource = {
  network: SuperchainNetwork;
  chainId: number;
  geckoNetwork: string;
  llamaChain: string;
};

export type DexMarket = {
  id: string;
  network: SuperchainNetwork;
  dex: string;
  slug: string;
  category: string;
  priority: boolean;
  volume24hUsd: number;
  volume7dUsd: number | null;
  volume30dUsd: number | null;
  fees24hUsd: number | null;
  fees7dUsd: number | null;
  fees30dUsd: number | null;
  change1dPct: number | null;
  change7dPct: number | null;
  change30dPct: number | null;
  feeToVolume30dPct: number | null;
  health: PoolHealth;
  outcomeTarget: OutcomeTarget;
  sourceUrl: string;
  updatedAt: string;
  note: string;
};

export type ChainMetric = {
  network: SuperchainNetwork;
  chainId: number;
  tvlUsd: number | null;
  dexVolume24hUsd: number | null;
  dexVolume7dUsd: number | null;
  dexVolume30dUsd: number | null;
  fees24hUsd: number | null;
  fees7dUsd: number | null;
  fees30dUsd: number | null;
  sourceUrl: string;
};

export type LiquiditySnapshot = {
  markets: DexMarket[];
  chains: ChainMetric[];
  sources: SourceStatus[];
  updatedAt: string;
  degraded: boolean;
};
