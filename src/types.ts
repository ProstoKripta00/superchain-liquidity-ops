export type SuperchainNetwork =
  | "OP Mainnet"
  | "Base"
  | "Unichain"
  | "Mode"
  | "Zora";

export type NetworkScope = "All" | SuperchainNetwork;

export type OutcomeTarget =
  | "Grow TVL"
  | "Improve fee efficiency"
  | "Rebalance liquidity"
  | "Monitor incentives";

export type PoolHealth = "Strong" | "Watch" | "At risk";

export type SourceState = "ok" | "degraded" | "error";

export type ProtocolScanStatus = "Ready for report" | "Monitor" | "Low signal";

export type ProtocolHealthGrade = "A" | "B" | "C" | "D";

export type ProtocolHealthComponentId =
  | "activity"
  | "fees"
  | "trend"
  | "coverage"
  | "risk"
  | "confidence";

export type ProtocolHealthComponent = {
  id: ProtocolHealthComponentId;
  label: string;
  score: number;
  weight: number;
  note: string;
};

export type ProtocolHealthScore = {
  total: number;
  grade: ProtocolHealthGrade;
  confidence: number;
  components: ProtocolHealthComponent[];
  strengths: string[];
  risks: string[];
  recommendation: string;
};

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

export type ProtocolProfile = {
  id: string;
  name: string;
  slugs: string[];
  segment: string;
  thesis: string;
};

export type ProtocolScan = {
  id: string;
  name: string;
  segment: string;
  thesis: string;
  slugs: string[];
  networks: SuperchainNetwork[];
  marketIds: string[];
  marketCount: number;
  volume24hUsd: number;
  volume30dUsd: number;
  fees30dUsd: number | null;
  feeToVolume30dPct: number | null;
  weightedChange7dPct: number | null;
  strongMarkets: number;
  watchMarkets: number;
  atRiskMarkets: number;
  score: number;
  healthScore: ProtocolHealthScore;
  status: ProtocolScanStatus;
  opportunity: string;
  nextAction: string;
  sourceUrls: string[];
  updatedAt: string;
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

export type MarketScopeMetrics = {
  volume24h: number;
  volume30d: number;
  fees30d: number | null;
  feeToVolume: number | null;
  weightedChange7d: number;
  watchCount: number;
};

export type ChainCoverageRow = ChainMetric & {
  width: number;
};

export type LiquiditySnapshot = {
  markets: DexMarket[];
  protocolScans: ProtocolScan[];
  chains: ChainMetric[];
  sources: SourceStatus[];
  updatedAt: string;
  degraded: boolean;
};
