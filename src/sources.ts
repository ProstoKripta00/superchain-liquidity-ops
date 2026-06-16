import type { SuperchainSource } from "./types";

export const DEFILLAMA_BASE_URL = "https://api.llama.fi";

export const SUPERCHAIN_SOURCES: SuperchainSource[] = [
  {
    network: "OP Mainnet",
    chainId: 10,
    geckoNetwork: "optimism",
    llamaChain: "OP Mainnet",
  },
  {
    network: "Base",
    chainId: 8453,
    geckoNetwork: "base",
    llamaChain: "Base",
  },
  {
    network: "Unichain",
    chainId: 130,
    geckoNetwork: "unichain",
    llamaChain: "Unichain",
  },
  {
    network: "Mode",
    chainId: 34443,
    geckoNetwork: "mode",
    llamaChain: "Mode",
  },
  {
    network: "Zora",
    chainId: 7777777,
    geckoNetwork: "zora-network",
    llamaChain: "Zora",
  },
];

export const SUPERCHAIN_NETWORKS = SUPERCHAIN_SOURCES.map((source) => source.network);

export function llamaOverviewUrl(kind: "dexs" | "fees", llamaChain: string) {
  return `${DEFILLAMA_BASE_URL}/overview/${kind}/${encodeURIComponent(
    llamaChain,
  )}?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true`;
}

export function llamaChainsUrl() {
  return `${DEFILLAMA_BASE_URL}/v2/chains`;
}

export function llamaProtocolUrl(slug: string) {
  return `https://defillama.com/protocol/${slug}`;
}
