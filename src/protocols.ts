import type { ProtocolProfile } from "./types";

export const TRACKED_PROTOCOLS: ProtocolProfile[] = [
  {
    id: "uniswap",
    name: "Uniswap",
    logoUrl: "https://www.google.com/s2/favicons?domain=uniswap.org&sz=128",
    slugs: ["uniswap-v2", "uniswap-v3", "uniswap-v4"],
    segment: "Core Superchain liquidity venue",
    thesis:
      "High-volume Superchain DEX activity that can support LP, DAO and ecosystem reporting around priority liquidity outcomes.",
    websiteUrl: "https://uniswap.org",
  },
  {
    id: "aerodrome",
    name: "Aerodrome",
    logoUrl: "https://www.google.com/s2/favicons?domain=aerodrome.finance&sz=128",
    slugs: ["aerodrome-v1", "aerodrome-slipstream"],
    segment: "Base liquidity hub",
    thesis:
      "Large Base liquidity venue where volume, fee efficiency and pool-level watchlists can become a paid liquidity impact report.",
    websiteUrl: "https://aerodrome.finance",
  },
  {
    id: "velodrome",
    name: "Velodrome",
    logoUrl: "https://www.google.com/s2/favicons?domain=velodrome.finance&sz=128",
    slugs: ["velodrome-v1", "velodrome-v2", "velodrome-v3"],
    segment: "OP-aligned liquidity hub",
    thesis:
      "Native Superchain liquidity infrastructure that is useful for measuring incentives, liquidity growth and fee generation.",
    websiteUrl: "https://velodrome.finance",
  },
  {
    id: "curve",
    name: "Curve",
    logoUrl: "https://www.google.com/s2/favicons?domain=curve.fi&sz=128",
    slugs: ["curve-dex"],
    segment: "Stable liquidity venue",
    thesis:
      "Stable-pair liquidity activity where fee-to-volume and TVL efficiency can be packaged for treasury and growth teams.",
    websiteUrl: "https://curve.fi",
  },
  {
    id: "pancakeswap",
    name: "PancakeSwap",
    logoUrl: "https://www.google.com/s2/favicons?domain=pancakeswap.finance&sz=128",
    slugs: ["pancakeswap-amm", "pancakeswap-amm-v3", "pancakeswap-infinity"],
    segment: "Cross-chain DEX",
    thesis:
      "Cross-chain DEX activity on Base where Superchain-specific performance can be separated from broader protocol metrics.",
    websiteUrl: "https://pancakeswap.finance",
  },
  {
    id: "sushiswap",
    name: "SushiSwap",
    logoUrl: "https://www.google.com/s2/favicons?domain=sushi.com&sz=128",
    slugs: ["sushiswap", "sushiswap-v3", "sushi-trident"],
    segment: "Cross-chain DEX",
    thesis:
      "Multi-network DEX footprint that can be screened for underused Superchain markets and report opportunities.",
    websiteUrl: "https://www.sushi.com",
  },
  {
    id: "balancer",
    name: "Balancer",
    logoUrl: "https://www.google.com/s2/favicons?domain=balancer.fi&sz=128",
    slugs: ["balancer-v2", "balancer-v3"],
    segment: "Managed liquidity venue",
    thesis:
      "Pool-weighted liquidity venue where weak volume, fees or chain coverage can produce a clear monitoring report.",
    websiteUrl: "https://balancer.fi",
  },
  {
    id: "kim-exchange",
    name: "KIM Exchange",
    logoUrl: "https://www.google.com/s2/favicons?domain=kim.exchange&sz=128",
    slugs: ["kim-exchange-v1", "kim-exchange-v2", "kim-exchange-v3"],
    segment: "Mode-native DEX",
    thesis:
      "Smaller ecosystem DEX where a focused analytics report can help explain liquidity traction and next growth steps.",
    websiteUrl: "https://www.kim.exchange",
  },
];
