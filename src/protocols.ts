import type { ProtocolProfile } from "./types";

export const TRACKED_PROTOCOLS: ProtocolProfile[] = [
  {
    id: "uniswap",
    name: "Uniswap",
    slugs: ["uniswap-v2", "uniswap-v3", "uniswap-v4"],
    segment: "Core Superchain liquidity venue",
    thesis:
      "High-volume Superchain DEX activity that can support grant, LP and ecosystem reporting around priority liquidity outcomes.",
  },
  {
    id: "aerodrome",
    name: "Aerodrome",
    slugs: ["aerodrome-v1", "aerodrome-slipstream"],
    segment: "Base liquidity hub",
    thesis:
      "Large Base liquidity venue where volume, fee efficiency and pool-level watchlists can become a paid liquidity impact report.",
  },
  {
    id: "velodrome",
    name: "Velodrome",
    slugs: ["velodrome-v1", "velodrome-v2", "velodrome-v3"],
    segment: "OP-aligned liquidity hub",
    thesis:
      "Native Superchain liquidity infrastructure that is useful for measuring incentives, liquidity growth and fee generation.",
  },
  {
    id: "curve",
    name: "Curve",
    slugs: ["curve-dex"],
    segment: "Stable liquidity venue",
    thesis:
      "Stable-pair liquidity activity where fee-to-volume and TVL efficiency can be packaged for treasury and growth teams.",
  },
  {
    id: "pancakeswap",
    name: "PancakeSwap",
    slugs: ["pancakeswap-amm", "pancakeswap-amm-v3", "pancakeswap-infinity"],
    segment: "Cross-chain DEX",
    thesis:
      "Cross-chain DEX activity on Base where Superchain-specific performance can be separated from broader protocol metrics.",
  },
  {
    id: "sushiswap",
    name: "SushiSwap",
    slugs: ["sushiswap", "sushiswap-v3", "sushi-trident"],
    segment: "Cross-chain DEX",
    thesis:
      "Multi-network DEX footprint that can be screened for underused Superchain markets and report opportunities.",
  },
  {
    id: "balancer",
    name: "Balancer",
    slugs: ["balancer-v2", "balancer-v3"],
    segment: "Managed liquidity venue",
    thesis:
      "Pool-weighted liquidity venue where weak volume, fees or chain coverage can produce a clear monitoring report.",
  },
  {
    id: "kim-exchange",
    name: "KIM Exchange",
    slugs: ["kim-exchange-v1", "kim-exchange-v2", "kim-exchange-v3"],
    segment: "Mode-native DEX",
    thesis:
      "Smaller ecosystem DEX where a focused analytics report can help explain liquidity traction and next growth steps.",
  },
];
