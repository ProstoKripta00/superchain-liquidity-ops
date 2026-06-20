import type {
  DexMarket,
  MarketScopeMetrics,
  NetworkScope,
  OutcomeTarget,
  ProtocolMiniReport,
  ProtocolScan,
  SourceStatus,
} from "./types";

export type ExportPackArtifactId =
  | "report-markdown"
  | "protocol-markets-csv"
  | "scope-markets-csv"
  | "protocol-summary-json";

export type ExportPackArtifact = {
  id: ExportPackArtifactId;
  name: string;
  fileName: string;
  mimeType: string;
  description: string;
  content: string;
  sizeLabel: string;
};

export type ExportPack = {
  protocolId: string;
  title: string;
  fileName: string;
  generatedAt: string;
  summary: string;
  handoffSummary: string;
  protocolMarketCount: number;
  scopeMarketCount: number;
  sourceCount: number;
  artifacts: ExportPackArtifact[];
  packJson: string;
};

type BuildExportPackInput = {
  network: NetworkScope;
  protocolMarkets: DexMarket[];
  report: ProtocolMiniReport;
  scan: ProtocolScan;
  scopedMarkets: DexMarket[];
  sources: SourceStatus[];
  target: "All" | OutcomeTarget;
  totals: MarketScopeMetrics;
};

const usd = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
  style: "currency",
  currency: "USD",
});

const marketCsvHeader = [
  "network",
  "dex",
  "slug",
  "category",
  "priority",
  "volume24hUsd",
  "volume7dUsd",
  "volume30dUsd",
  "fees24hUsd",
  "fees7dUsd",
  "fees30dUsd",
  "change1dPct",
  "change7dPct",
  "change30dPct",
  "feeToVolume30dPct",
  "health",
  "outcomeTarget",
  "sourceUrl",
  "updatedAt",
];

export function buildMarketsCsv(markets: DexMarket[]) {
  const rows = markets.map((market) =>
    [
      market.network,
      market.dex,
      market.slug,
      market.category,
      String(market.priority),
      String(market.volume24hUsd),
      nullableCell(market.volume7dUsd),
      nullableCell(market.volume30dUsd),
      nullableCell(market.fees24hUsd),
      nullableCell(market.fees7dUsd),
      nullableCell(market.fees30dUsd),
      nullableCell(market.change1dPct),
      nullableCell(market.change7dPct),
      nullableCell(market.change30dPct),
      nullableCell(market.feeToVolume30dPct),
      market.health,
      market.outcomeTarget,
      market.sourceUrl,
      market.updatedAt,
    ]
      .map(csvCell)
      .join(","),
  );

  return [marketCsvHeader.join(","), ...rows].join("\n");
}

export function buildExportPack({
  network,
  protocolMarkets,
  report,
  scan,
  scopedMarkets,
  sources,
  target,
  totals,
}: BuildExportPackInput): ExportPack {
  const generatedAt = new Date().toISOString();
  const slug = slugify(scan.name);
  const protocolCsv = buildMarketsCsv(protocolMarkets);
  const scopeCsv = buildMarketsCsv(scopedMarkets);
  const protocolSummary = {
    generatedAt,
    product: "Superchain Liquidity Ops",
    protocol: {
      id: scan.id,
      name: scan.name,
      segment: scan.segment,
      status: scan.status,
      score: scan.score,
      grade: scan.healthScore.grade,
      confidence: scan.healthScore.confidence,
      networks: scan.networks,
      matchedMarkets: scan.marketCount,
      sourceUrls: scan.sourceUrls,
    },
    metrics: {
      volume24hUsd: scan.volume24hUsd,
      volume30dUsd: scan.volume30dUsd,
      fees30dUsd: scan.fees30dUsd,
      feeToVolume30dPct: scan.feeToVolume30dPct,
      weightedChange7dPct: scan.weightedChange7dPct,
      strongMarkets: scan.strongMarkets,
      watchMarkets: scan.watchMarkets,
      atRiskMarkets: scan.atRiskMarkets,
    },
    healthScore: scan.healthScore,
    scope: {
      network,
      target,
      marketCount: scopedMarkets.length,
      volume24hUsd: totals.volume24h,
      volume30dUsd: totals.volume30d,
      fees30dUsd: totals.fees30d,
      feeToVolumePct: totals.feeToVolume,
      weightedChange7dPct: totals.weightedChange7d,
      watchCount: totals.watchCount,
    },
    recommendation: scan.healthScore.recommendation,
    opportunity: scan.opportunity,
    nextAction: scan.nextAction,
    sources: sources.map((source) => ({
      id: source.id,
      name: source.name,
      state: source.state,
      url: source.url,
      message: source.message,
      updatedAt: source.updatedAt,
    })),
  };
  const summaryJson = JSON.stringify(protocolSummary, null, 2);
  const artifacts: ExportPackArtifact[] = [
    {
      id: "report-markdown",
      name: "Protocol report",
      fileName: report.fileName,
      mimeType: "text/markdown;charset=utf-8",
      description: "Decision-ready Markdown mini-report for the selected protocol.",
      content: report.markdown,
      sizeLabel: formatBytes(report.markdown.length),
    },
    {
      id: "protocol-markets-csv",
      name: "Protocol markets CSV",
      fileName: `${slug}-superchain-markets.csv`,
      mimeType: "text/csv;charset=utf-8",
      description: "Matched Superchain market rows used by the selected protocol report.",
      content: protocolCsv,
      sizeLabel: formatBytes(protocolCsv.length),
    },
    {
      id: "scope-markets-csv",
      name: "Scope CSV",
      fileName: "superchain-scope-markets.csv",
      mimeType: "text/csv;charset=utf-8",
      description: "Current dashboard scope export using the active network and outcome filters.",
      content: scopeCsv,
      sizeLabel: formatBytes(scopeCsv.length),
    },
    {
      id: "protocol-summary-json",
      name: "Protocol summary JSON",
      fileName: `${slug}-protocol-summary.json`,
      mimeType: "application/json;charset=utf-8",
      description: "Structured protocol score, metrics, health components and source audit context.",
      content: summaryJson,
      sizeLabel: formatBytes(summaryJson.length),
    },
  ];
  const manifest = {
    packVersion: 1,
    product: "Superchain Liquidity Ops",
    generatedAt,
    protocol: scan.name,
    protocolId: scan.id,
    scope: {
      network,
      target,
    },
    artifacts: artifacts.map(({ content: _content, ...artifact }) => artifact),
    sourceCount: sources.length,
    notes: [
      "All metrics are generated from public browser-accessible sources.",
      "Unavailable values are preserved as null or empty CSV cells.",
      "This pack is not a security audit, investment rating, or financial recommendation.",
    ],
  };
  const packPayload = {
    manifest,
    files: Object.fromEntries(
      artifacts.map((artifact) => [artifact.fileName, artifact.content]),
    ),
  };
  const packJson = JSON.stringify(packPayload, null, 2);
  const title = `${scan.name} Export Pack`;

  return {
    protocolId: scan.id,
    title,
    fileName: `${slug}-superchain-export-pack.json`,
    generatedAt,
    summary: `${title} includes a Markdown report, matched protocol market CSV, current scope CSV and structured JSON summary for handoff.`,
    handoffSummary: buildHandoffSummary(scan, protocolMarkets, scopedMarkets, totals),
    protocolMarketCount: protocolMarkets.length,
    scopeMarketCount: scopedMarkets.length,
    sourceCount: sources.length,
    artifacts,
    packJson,
  };
}

function buildHandoffSummary(
  scan: ProtocolScan,
  protocolMarkets: DexMarket[],
  scopedMarkets: DexMarket[],
  totals: MarketScopeMetrics,
) {
  return [
    `Export Pack: ${scan.name}`,
    `Status: ${scan.status}, health score ${scan.score}/100, grade ${scan.healthScore.grade}`,
    `Protocol markets: ${protocolMarkets.length}`,
    `Scope markets: ${scopedMarkets.length}`,
    `30d protocol volume: ${formatOptionalUsd(scan.volume30dUsd)}`,
    `30d protocol fees: ${formatOptionalUsd(scan.fees30dUsd)}`,
    `Scope 30d volume: ${formatOptionalUsd(totals.volume30d)}`,
    `Scope 30d fees: ${formatOptionalUsd(totals.fees30d)}`,
    `Recommendation: ${scan.healthScore.recommendation}`,
    `Next action: ${scan.nextAction}`,
  ].join("\n");
}

function nullableCell(value: string | number | null) {
  return value === null ? "" : String(value);
}

function csvCell(value: string) {
  if (!/[",\n]/.test(value)) {
    return value;
  }

  return `"${value.replace(/"/g, '""')}"`;
}

function formatOptionalUsd(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? usd.format(value)
    : "Unavailable";
}

function formatBytes(length: number) {
  if (length < 1024) {
    return `${length} B`;
  }

  return `${(length / 1024).toFixed(1)} KB`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
