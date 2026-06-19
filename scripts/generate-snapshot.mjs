import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFILLAMA_BASE_URL = "https://api.llama.fi";
const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const SUPERCHAIN_SOURCES = [
  { network: "OP Mainnet", chainId: 10, llamaChain: "OP Mainnet" },
  { network: "Base", chainId: 8453, llamaChain: "Base" },
  { network: "Unichain", chainId: 130, llamaChain: "Unichain" },
  { network: "Mode", chainId: 34443, llamaChain: "Mode" },
  { network: "Zora", chainId: 7777777, llamaChain: "Zora" },
];

const TRACKED_PROTOCOLS = [
  {
    id: "uniswap",
    name: "Uniswap",
    slugs: ["uniswap-v2", "uniswap-v3", "uniswap-v4"],
    segment: "Core Superchain liquidity venue",
  },
  {
    id: "aerodrome",
    name: "Aerodrome",
    slugs: ["aerodrome-v1", "aerodrome-slipstream"],
    segment: "Base liquidity hub",
  },
  {
    id: "velodrome",
    name: "Velodrome",
    slugs: ["velodrome-v1", "velodrome-v2", "velodrome-v3"],
    segment: "OP-aligned liquidity hub",
  },
  {
    id: "curve",
    name: "Curve",
    slugs: ["curve-dex"],
    segment: "Stable liquidity venue",
  },
  {
    id: "pancakeswap",
    name: "PancakeSwap",
    slugs: ["pancakeswap-amm", "pancakeswap-amm-v3", "pancakeswap-infinity"],
    segment: "Cross-chain DEX",
  },
  {
    id: "sushiswap",
    name: "SushiSwap",
    slugs: ["sushiswap", "sushiswap-v3", "sushi-trident"],
    segment: "Cross-chain DEX",
  },
  {
    id: "balancer",
    name: "Balancer",
    slugs: ["balancer-v2", "balancer-v3"],
    segment: "Managed liquidity venue",
  },
  {
    id: "kim-exchange",
    name: "KIM Exchange",
    slugs: ["kim-exchange-v1", "kim-exchange-v2", "kim-exchange-v3"],
    segment: "Mode-native DEX",
  },
];

const args = new Set(process.argv.slice(2));
const shouldUploadSupabase = args.has("--supabase");

const generatedAt = new Date().toISOString();
const runSlug = generatedAt
  .replace(/[-:]/g, "")
  .replace(/\.\d{3}Z$/, "Z")
  .replace("T", "-");
const datePath = generatedAt.slice(0, 10).replaceAll("-", "/");
const archiveDir = path.join(ROOT_DIR, "snapshots", datePath, runSlug);
const publicLatestDir = path.join(ROOT_DIR, "public", "snapshots", "latest");

try {
  const snapshot = await loadLiquiditySnapshot();
  const artifacts = buildArtifacts(snapshot);

  await writeArtifacts(archiveDir, artifacts);
  await writeArtifacts(publicLatestDir, artifacts);

  if (shouldUploadSupabase) {
    await uploadSnapshotRun(snapshot, artifacts.manifest);
  }

  console.log(
    [
      `snapshot=${runSlug}`,
      `markets=${snapshot.markets.length}`,
      `protocols=${snapshot.protocolScans.length}`,
      `sources=${snapshot.sources.length}`,
      `degraded=${String(snapshot.degraded)}`,
      `archive=${path.relative(ROOT_DIR, archiveDir)}`,
      `latest=${path.relative(ROOT_DIR, publicLatestDir)}`,
    ].join(" "),
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}

async function getJson(url) {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "superchain-liquidity-ops-snapshot/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for ${url}`);
  }

  return response.json();
}

async function loadLiquiditySnapshot() {
  const chainTvlByName = await fetchChainTvlByName().catch(() => null);
  const bundleResults = await Promise.allSettled(
    SUPERCHAIN_SOURCES.map((source) =>
      fetchNetworkBundle(source, chainTvlByName?.get(source.llamaChain) ?? null),
    ),
  );
  const markets = bundleResults.flatMap((result) =>
    result.status === "fulfilled" ? result.value.markets : [],
  );
  const chains = bundleResults.flatMap((result) =>
    result.status === "fulfilled" ? [result.value.chain] : [],
  );
  const statuses = bundleResults.flatMap((result, index) => {
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
        result.reason instanceof Error ? result.reason.message : "Failed to load chain bundle",
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
        ? "Chain TVL unavailable; DEX volume and fees still loaded"
        : "Chain TVL loaded",
    ),
    ...statuses,
  ];

  if (markets.length === 0 && chains.length === 0) {
    throw new Error("No Superchain DEX or chain metrics could be loaded.");
  }

  const protocolScans = scanProtocols(markets);

  return {
    generatedAt,
    markets,
    chains,
    sources,
    protocolScans,
    degraded: sources.some((source) => source.state !== "ok"),
  };
}

async function fetchChainTvlByName() {
  const chains = await getJson(llamaChainsUrl());

  return new Map(
    chains
      .filter((chain) => typeof chain.name === "string")
      .map((chain) => [chain.name, toNullableNumber(chain.tvl)]),
  );
}

async function fetchNetworkBundle(source, chainTvlUsd) {
  const dexsUrl = llamaOverviewUrl("dexs", source.llamaChain);
  const feesUrl = llamaOverviewUrl("fees", source.llamaChain);
  const [dexsOverview, feesOverview] = await Promise.all([getJson(dexsUrl), getJson(feesUrl)]);
  const markets = buildMarkets(source, dexsOverview, feesOverview);
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
  };

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
      ),
      sourceStatus(
        `llama-fees-${source.llamaChain}`,
        `DefiLlama fees ${source.network}`,
        feesUrl,
        chain.fees30dUsd === null ? "degraded" : "ok",
        chain.fees30dUsd === null ? "Chain fee totals unavailable" : "Chain fee totals loaded",
      ),
    ],
  };
}

function buildMarkets(source, dexsOverview, feesOverview) {
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
      const fees30dUsd = toNullableNumber(feeProtocol?.total30d);
      const change7dPct = toNullableNumber(protocol.change_7d);
      const feeToVolume30dPct = ratioPct(fees30dUsd, volume30dUsd);
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
        fees24hUsd: toNullableNumber(feeProtocol?.total24h),
        fees7dUsd: toNullableNumber(feeProtocol?.total7d),
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
        updatedAt: generatedAt,
      };
    })
    .filter((market) => market.volume24hUsd > 0 || (market.volume30dUsd ?? 0) > 0)
    .sort((left, right) => (right.volume30dUsd ?? 0) - (left.volume30dUsd ?? 0))
    .slice(0, source.network === "OP Mainnet" ? 10 : 7);
}

function scanProtocols(markets) {
  return TRACKED_PROTOCOLS.map((profile) => buildProtocolScan(profile, markets))
    .filter(Boolean)
    .sort((left, right) => right.score - left.score);
}

function buildProtocolScan(profile, markets) {
  const matchedMarkets = markets.filter((market) => profile.slugs.includes(market.slug));

  if (matchedMarkets.length === 0) {
    return null;
  }

  const volume30dUsd = sumNullable(matchedMarkets.map((market) => market.volume30dUsd)) ?? 0;
  const fees30dUsd = sumNullable(matchedMarkets.map((market) => market.fees30dUsd));
  const weightedChange7dPct = weightedAverage(
    matchedMarkets.map((market) => ({
      value: market.change7dPct,
      weight: market.volume30dUsd ?? 0,
    })),
  );
  const networks = [...new Set(matchedMarkets.map((market) => market.network))].sort();
  const strongMarkets = matchedMarkets.filter((market) => market.health === "Strong").length;
  const watchMarkets = matchedMarkets.filter((market) => market.health === "Watch").length;
  const atRiskMarkets = matchedMarkets.filter((market) => market.health === "At risk").length;
  const feeDataMarkets = matchedMarkets.filter((market) => typeof market.fees30dUsd === "number").length;
  const trendDataMarkets = matchedMarkets.filter((market) => typeof market.change7dPct === "number").length;
  const score = Math.round(
    scoreActivity(volume30dUsd) * 0.3 +
      scoreFeeCapture(fees30dUsd, ratioPct(fees30dUsd, volume30dUsd)) * 0.2 +
      scoreTrend(weightedChange7dPct) * 0.15 +
      Math.min(100, networks.length * 25 + matchedMarkets.length * 6) * 0.15 +
      scoreMarketQuality(matchedMarkets.length, strongMarkets, atRiskMarkets) * 0.1 +
      Math.min(100, 35 + feeDataMarkets * 12 + trendDataMarkets * 8) * 0.1,
  );
  const confidence = Math.min(100, 35 + feeDataMarkets * 12 + trendDataMarkets * 8);

  return {
    id: profile.id,
    name: profile.name,
    segment: profile.segment,
    networks,
    marketCount: matchedMarkets.length,
    volume30dUsd,
    fees30dUsd,
    feeToVolume30dPct: ratioPct(fees30dUsd, volume30dUsd),
    weightedChange7dPct,
    strongMarkets,
    watchMarkets,
    atRiskMarkets,
    score,
    confidence,
    status: score >= 70 && confidence >= 55 ? "Ready for report" : score >= 45 ? "Monitor" : "Low signal",
    sourceUrls: [...new Set(matchedMarkets.map((market) => market.sourceUrl))],
    updatedAt: generatedAt,
  };
}

function buildArtifacts(snapshot) {
  const totalVolume30dUsd = snapshot.markets.reduce((sum, market) => sum + (market.volume30dUsd ?? 0), 0);
  const totalFees30dUsd = sumNullable(snapshot.markets.map((market) => market.fees30dUsd));
  const sourceIssueCount = snapshot.sources.filter((source) => source.state !== "ok").length;
  const manifest = {
    generatedAt,
    product: "Superchain Liquidity Ops",
    snapshotVersion: 1,
    degraded: snapshot.degraded,
    counts: {
      markets: snapshot.markets.length,
      chains: snapshot.chains.length,
      protocols: snapshot.protocolScans.length,
      sources: snapshot.sources.length,
      sourceIssues: sourceIssueCount,
    },
    metrics: {
      totalVolume30dUsd,
      totalFees30dUsd,
      readyProtocols: snapshot.protocolScans.filter((scan) => scan.status === "Ready for report").length,
      watchMarkets: snapshot.markets.filter((market) => market.health !== "Strong").length,
    },
    files: {
      manifest: "manifest.json",
      marketImpact: "market-impact.csv",
      protocolScores: "protocol-scores.json",
      sourceAudit: "source-audit.json",
      scopeSummary: "scope-summary.json",
    },
    notes: [
      "Generated from public DefiLlama endpoints.",
      "Unavailable values are preserved as null.",
      "This snapshot is analytics infrastructure, not an investment recommendation.",
    ],
  };
  const scopeSummary = {
    generatedAt,
    chains: snapshot.chains,
    topMarkets: snapshot.markets.slice(0, 12),
    topProtocols: snapshot.protocolScans.slice(0, 8),
    metrics: manifest.metrics,
  };

  return {
    manifest,
    files: new Map([
      ["manifest.json", JSON.stringify(manifest, null, 2)],
      ["scope-summary.json", JSON.stringify(scopeSummary, null, 2)],
      ["market-impact.csv", buildMarketCsv(snapshot.markets)],
      ["protocol-scores.json", JSON.stringify(snapshot.protocolScans, null, 2)],
      ["source-audit.json", JSON.stringify(snapshot.sources, null, 2)],
    ]),
  };
}

async function writeArtifacts(directory, artifacts) {
  await mkdir(directory, { recursive: true });

  for (const [fileName, content] of artifacts.files) {
    await writeFile(path.join(directory, fileName), `${content}\n`, "utf8");
  }
}

async function uploadSnapshotRun(snapshot, manifest) {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.log("supabase=skipped missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase
    .from("snapshot_runs")
    .insert({
      generated_at: generatedAt,
      status: snapshot.degraded ? "degraded" : "ok",
      degraded: snapshot.degraded,
      market_count: snapshot.markets.length,
      protocol_count: snapshot.protocolScans.length,
      source_issue_count: snapshot.sources.filter((source) => source.state !== "ok").length,
      storage_path: `snapshots/${datePath}/${runSlug}`,
      manifest,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Supabase snapshot_runs insert failed: ${error.message}`);
  }

  const rows = snapshot.protocolScans.map((scan) => ({
    run_id: data.id,
    protocol_id: scan.id,
    protocol_name: scan.name,
    status: scan.status,
    score: scan.score,
    confidence: scan.confidence,
    network_scope: scan.networks,
    market_count: scan.marketCount,
    volume_30d_usd: scan.volume30dUsd,
    fees_30d_usd: scan.fees30dUsd,
    payload: scan,
  }));

  if (rows.length > 0) {
    const { error: scoreError } = await supabase.from("snapshot_protocol_scores").insert(rows);

    if (scoreError) {
      throw new Error(`Supabase snapshot_protocol_scores insert failed: ${scoreError.message}`);
    }
  }

  console.log(`supabase=uploaded run=${data.id}`);
}

function buildMarketCsv(markets) {
  const header = [
    "network",
    "dex",
    "slug",
    "volume24hUsd",
    "volume7dUsd",
    "volume30dUsd",
    "fees30dUsd",
    "change7dPct",
    "feeToVolume30dPct",
    "health",
    "outcomeTarget",
    "sourceUrl",
    "updatedAt",
  ];
  const rows = markets.map((market) =>
    [
      market.network,
      market.dex,
      market.slug,
      market.volume24hUsd,
      market.volume7dUsd,
      market.volume30dUsd,
      market.fees30dUsd,
      market.change7dPct,
      market.feeToVolume30dPct,
      market.health,
      market.outcomeTarget,
      market.sourceUrl,
      market.updatedAt,
    ]
      .map(csvCell)
      .join(","),
  );

  return [header.join(","), ...rows].join("\n");
}

function buildFeeMap(feesOverview) {
  return new Map(
    (feesOverview.protocols ?? [])
      .map((protocol) => [protocolKey(protocol), protocol])
      .filter(([key]) => key.length > 0),
  );
}

function protocolKey(protocol) {
  return (protocol.slug ?? protocol.module ?? protocol.displayName ?? protocol.name ?? "")
    .toLowerCase()
    .trim();
}

function sourceStatus(id, name, url, state, message) {
  return { id, name, url, state, message, updatedAt: generatedAt };
}

function llamaOverviewUrl(kind, llamaChain) {
  return `${DEFILLAMA_BASE_URL}/overview/${kind}/${encodeURIComponent(
    llamaChain,
  )}?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true`;
}

function llamaChainsUrl() {
  return `${DEFILLAMA_BASE_URL}/v2/chains`;
}

function llamaProtocolUrl(slug) {
  return `https://defillama.com/protocol/${slug}`;
}

function toNullableNumber(value) {
  const numberValue = typeof value === "string" || typeof value === "number" ? Number(value) : null;
  return numberValue !== null && Number.isFinite(numberValue) ? numberValue : null;
}

function toNumber(value) {
  return toNullableNumber(value) ?? 0;
}

function sumNullable(values) {
  const numbers = values.filter((value) => typeof value === "number");
  return numbers.length === 0 ? null : numbers.reduce((sum, value) => sum + value, 0);
}

function ratioPct(numerator, denominator) {
  if (typeof numerator !== "number" || typeof denominator !== "number" || denominator === 0) {
    return null;
  }

  return (numerator / denominator) * 100;
}

function weightedAverage(values) {
  const valid = values.filter(
    (item) => typeof item.value === "number" && typeof item.weight === "number" && item.weight > 0,
  );
  const weightSum = valid.reduce((sum, item) => sum + item.weight, 0);

  if (weightSum === 0) {
    return null;
  }

  return valid.reduce((sum, item) => sum + item.value * item.weight, 0) / weightSum;
}

function classifyOutcomeTarget(market) {
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

function classifyMarketHealth(market) {
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

function scoreActivity(volume30dUsd) {
  if (volume30dUsd >= 100_000_000) return 100;
  if (volume30dUsd >= 25_000_000) return 85;
  if (volume30dUsd >= 5_000_000) return 70;
  if (volume30dUsd >= 1_000_000) return 55;
  if (volume30dUsd >= 250_000) return 40;
  return 20;
}

function scoreFeeCapture(fees30dUsd, feeToVolume30dPct) {
  if (typeof fees30dUsd !== "number") return 35;
  if ((feeToVolume30dPct ?? 0) >= 0.15) return 95;
  if ((feeToVolume30dPct ?? 0) >= 0.08) return 80;
  if ((feeToVolume30dPct ?? 0) >= 0.03) return 65;
  if (fees30dUsd >= 100_000) return 55;
  return 35;
}

function scoreTrend(weightedChange7dPct) {
  if (typeof weightedChange7dPct !== "number") return 45;
  if (weightedChange7dPct >= 20) return 95;
  if (weightedChange7dPct >= 5) return 80;
  if (weightedChange7dPct >= -10) return 65;
  if (weightedChange7dPct >= -25) return 45;
  return 25;
}

function scoreMarketQuality(marketCount, strongMarkets, atRiskMarkets) {
  if (marketCount === 0) return 0;
  return Math.max(15, Math.min(100, 45 + strongMarkets * 18 - atRiskMarkets * 20));
}

function csvCell(value) {
  if (value === null || typeof value === "undefined") {
    return "";
  }

  return `"${String(value).replace(/"/g, '""')}"`;
}
