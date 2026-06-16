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

export type LiquidityPool = {
  id: string;
  network: SuperchainNetwork;
  dex: string;
  pair: string;
  priority: boolean;
  tvlUsd: number;
  tvlChange7dPct: number;
  volume30dUsd: number;
  fees30dUsd: number;
  feeAprPct: number;
  utilizationPct: number;
  liquidityDepthUsd: number;
  health: PoolHealth;
  outcomeTarget: OutcomeTarget;
  note: string;
};
