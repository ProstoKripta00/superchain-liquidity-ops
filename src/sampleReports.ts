import { buildProtocolMiniReport } from "./reportGenerator";
import type { DexMarket, ProtocolScan } from "./types";

export type SampleReportId =
  | "uniswap-diagnostic"
  | "velodrome-monitoring"
  | "aerodrome-incentive-evidence";

export type SampleReportStatus = "Live generated" | "Template fallback";

export type SampleReportMetric = {
  label: string;
  value: string;
};

export type SampleReport = {
  id: SampleReportId;
  protocolId: string;
  protocolName: string;
  title: string;
  serviceType: string;
  audience: string;
  status: SampleReportStatus;
  fileName: string;
  generatedAt: string;
  summary: string;
  metrics: SampleReportMetric[];
  sampleUse: string;
  markdown: string;
};

type SampleReportDefinition = {
  id: SampleReportId;
  protocolId: string;
  protocolName: string;
  title: string;
  serviceType: string;
  audience: string;
  fallbackSegment: string;
  fallbackSummary: string;
  sampleUse: string;
};

const sampleDefinitions: SampleReportDefinition[] = [
  {
    id: "uniswap-diagnostic",
    protocolId: "uniswap",
    protocolName: "Uniswap",
    title: "Uniswap Superchain Liquidity Diagnostic",
    serviceType: "Protocol Diagnostic Sprint",
    audience: "DEX growth, BD, and liquidity teams",
    fallbackSegment: "Core Superchain liquidity venue",
    fallbackSummary:
      "A public diagnostic format for reviewing Superchain market activity, fee visibility, weak spots, and next actions for a major DEX venue.",
    sampleUse:
      "Send this as a delivery sample before offering a paid diagnostic sprint.",
  },
  {
    id: "velodrome-monitoring",
    protocolId: "velodrome",
    protocolName: "Velodrome",
    title: "Velodrome Liquidity Monitoring Sample",
    serviceType: "Liquidity Monitoring Retainer",
    audience: "OP-aligned protocol and incentives operators",
    fallbackSegment: "OP-aligned liquidity hub",
    fallbackSummary:
      "A recurring monitoring sample for tracking Superchain liquidity outcomes, watch markets, source status, and weekly operating actions.",
    sampleUse:
      "Use this to sell weekly monitoring after showing that the scanner can produce repeatable evidence.",
  },
  {
    id: "aerodrome-incentive-evidence",
    protocolId: "aerodrome",
    protocolName: "Aerodrome",
    title: "Aerodrome DAO / Incentive Evidence Pack Sample",
    serviceType: "DAO / Incentive Evidence Pack",
    audience: "Ecosystem teams, growth leads, and protocol contributors",
    fallbackSegment: "Base liquidity hub",
    fallbackSummary:
      "An incentive evidence sample that packages activity, fee visibility, market quality, source limits, and decision-ready next steps.",
    sampleUse:
      "Attach this sample when pitching DAO reporting, incentive review, or post-program evidence work.",
  },
];

const compactUsd = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 1,
  notation: "compact",
  style: "currency",
});

const pct = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});

export function buildSampleReports({
  markets,
  protocolScans,
}: {
  markets: DexMarket[];
  protocolScans: ProtocolScan[];
}): SampleReport[] {
  return sampleDefinitions.map((definition) =>
    buildSampleReport(definition, markets, protocolScans),
  );
}

export function buildSampleReportsJson(reports: SampleReport[]) {
  return JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      type: "public-sample-reports",
      description:
        "Client-ready public sample reports generated from the Superchain Liquidity Ops scanner when live protocol data is available.",
      reports: reports.map((report) => ({
        id: report.id,
        title: report.title,
        protocolId: report.protocolId,
        protocolName: report.protocolName,
        serviceType: report.serviceType,
        audience: report.audience,
        status: report.status,
        fileName: report.fileName,
        generatedAt: report.generatedAt,
        summary: report.summary,
        metrics: report.metrics,
        sampleUse: report.sampleUse,
      })),
    },
    null,
    2,
  );
}

function buildSampleReport(
  definition: SampleReportDefinition,
  markets: DexMarket[],
  protocolScans: ProtocolScan[],
): SampleReport {
  const scan = findProtocolScan(definition, protocolScans);
  const reportMarkets = scan
    ? markets.filter((market) => scan.marketIds.includes(market.id))
    : [];
  const generatedAt = new Date().toISOString();

  if (!scan) {
    return buildFallbackSampleReport(definition, generatedAt);
  }

  const miniReport = buildProtocolMiniReport(scan, reportMarkets);
  const metrics = buildLiveMetrics(scan);
  const embeddedMiniReport = miniReport.markdown.trim().replace(/^# /, "## ");
  const markdown = [
    `# ${definition.title}`,
    "",
    `Generated: ${miniReport.generatedAt}`,
    `Data refresh: ${scan.updatedAt}`,
    "",
    "## Sample Delivery Context",
    "",
    `Service type: ${definition.serviceType}`,
    `Audience: ${definition.audience}`,
    `Sample status: Live generated from current public scanner data`,
    "",
    "## How This Sample Is Used",
    "",
    definition.sampleUse,
    "",
    "## Client Delivery Boundary",
    "",
    "- This sample is a delivery example, not a security audit.",
    "- Paid delivery can add custom protocol scope, deeper pool analysis, and recurring update cadence.",
    "- The report is generated from public endpoints and keeps missing values visible.",
    "",
    "## Generated Protocol Report",
    "",
    embeddedMiniReport,
    "",
  ].join("\n");

  return {
    id: definition.id,
    protocolId: definition.protocolId,
    protocolName: scan.name,
    title: definition.title,
    serviceType: definition.serviceType,
    audience: definition.audience,
    status: "Live generated",
    fileName: `${definition.id}.md`,
    generatedAt: miniReport.generatedAt,
    summary: miniReport.summary,
    metrics,
    sampleUse: definition.sampleUse,
    markdown,
  };
}

function buildFallbackSampleReport(
  definition: SampleReportDefinition,
  generatedAt: string,
): SampleReport {
  const markdown = [
    `# ${definition.title}`,
    "",
    `Generated: ${generatedAt}`,
    "Sample status: Template fallback because live scanner data is not available for this protocol in the current snapshot.",
    "",
    "## Executive Summary",
    "",
    definition.fallbackSummary,
    "",
    "## Protocol Snapshot",
    "",
    "| Field | Value |",
    "| --- | --- |",
    `| Protocol | ${definition.protocolName} |`,
    `| Segment | ${definition.fallbackSegment} |`,
    "| Scanner status | Waiting for live match |",
    "| Health score | Unavailable |",
    "| Data confidence | Unavailable |",
    "",
    "## Sample Delivery Context",
    "",
    `Service type: ${definition.serviceType}`,
    `Audience: ${definition.audience}`,
    `Sample status: Template fallback`,
    "",
    "## How This Sample Is Used",
    "",
    definition.sampleUse,
    "",
    "## Client Delivery Boundary",
    "",
    "- This sample is a delivery format, not a security audit.",
    "- Paid delivery starts when current protocol data is available and scoped.",
    "- Missing values remain visible instead of being replaced with manual numbers.",
    "",
  ].join("\n");

  return {
    id: definition.id,
    protocolId: definition.protocolId,
    protocolName: definition.protocolName,
    title: definition.title,
    serviceType: definition.serviceType,
    audience: definition.audience,
    status: "Template fallback",
    fileName: `${definition.id}.md`,
    generatedAt,
    summary: definition.fallbackSummary,
    metrics: [
      { label: "Status", value: "Template" },
      { label: "Markets", value: "Unavailable" },
      { label: "30d volume", value: "Unavailable" },
      { label: "30d fees", value: "Unavailable" },
    ],
    sampleUse: definition.sampleUse,
    markdown,
  };
}

function buildLiveMetrics(scan: ProtocolScan): SampleReportMetric[] {
  return [
    { label: "Health score", value: `${scan.score}/100` },
    { label: "Grade", value: scan.healthScore.grade },
    { label: "30d volume", value: formatOptionalUsd(scan.volume30dUsd) },
    { label: "30d fees", value: formatOptionalUsd(scan.fees30dUsd) },
    { label: "7d trend", value: formatOptionalPct(scan.weightedChange7dPct) },
    { label: "Markets", value: String(scan.marketCount) },
  ];
}

function findProtocolScan(
  definition: SampleReportDefinition,
  protocolScans: ProtocolScan[],
) {
  const protocolId = definition.protocolId.toLowerCase();
  const protocolName = definition.protocolName.toLowerCase();

  return protocolScans.find((scan) => {
    const scanId = scan.id.toLowerCase();
    const scanName = scan.name.toLowerCase();

    return scanId === protocolId || scanName.includes(protocolName);
  });
}

function formatOptionalUsd(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? compactUsd.format(value)
    : "Unavailable";
}

function formatOptionalPct(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? `${pct.format(value)}%`
    : "Unavailable";
}
