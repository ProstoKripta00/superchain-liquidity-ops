import type { DexMarket, ProtocolScan } from "./types";

export type PublicCaseStudyId = "uniswap-superchain" | "aerodrome-base" | "velodrome-op";

export type PublicCaseStudy = {
  id: PublicCaseStudyId;
  title: string;
  protocolName: string;
  networkFocus: string;
  status: "Live generated" | "Template fallback";
  generatedAt: string;
  summary: string;
  decisionQuestion: string;
  findings: string[];
  limitations: string[];
  metrics: Array<{
    label: string;
    value: string;
  }>;
  markdown: string;
  fileName: string;
};

type CaseStudyDefinition = {
  id: PublicCaseStudyId;
  protocolName: string;
  networkFocus: string;
  decisionQuestion: string;
  fallbackSummary: string;
};

type BuildPublicCaseStudiesInput = {
  markets: DexMarket[];
  protocolScans: ProtocolScan[];
};

const usd = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 2,
  style: "currency",
  currency: "USD",
});

const pct = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});

const CASE_STUDY_DEFINITIONS: CaseStudyDefinition[] = [
  {
    id: "uniswap-superchain",
    protocolName: "Uniswap",
    networkFocus: "OP Mainnet / Base / Unichain",
    decisionQuestion:
      "Does Uniswap have enough Superchain activity to support an incentive-impact evidence pack?",
    fallbackSummary:
      "Template for measuring whether Uniswap Superchain markets produce enough volume, fees, and source confidence for operator evidence.",
  },
  {
    id: "aerodrome-base",
    protocolName: "Aerodrome",
    networkFocus: "Base",
    decisionQuestion:
      "Is Base DEX activity translating into measurable fee output and sustainable market health?",
    fallbackSummary:
      "Template for a Base-focused DEX incentive review using volume, fee capture, and watchlist market signals.",
  },
  {
    id: "velodrome-op",
    protocolName: "Velodrome",
    networkFocus: "OP Mainnet",
    decisionQuestion:
      "Can OP Mainnet liquidity programs show clear before/after impact evidence for DAO or incentive updates?",
    fallbackSummary:
      "Template for an OP Mainnet liquidity-program evidence review with public data limitations disclosed.",
  },
];

export function buildPublicCaseStudies({
  markets,
  protocolScans,
}: BuildPublicCaseStudiesInput): PublicCaseStudy[] {
  const generatedAt = new Date().toISOString();

  return CASE_STUDY_DEFINITIONS.map((definition) => {
    const scan = protocolScans.find((item) =>
      item.name.toLowerCase().includes(definition.protocolName.toLowerCase()),
    );
    const matchedMarkets = scan
      ? markets.filter((market) => scan.marketIds.includes(market.id))
      : [];
    const topMarkets = [...matchedMarkets]
      .sort((left, right) => (right.volume30dUsd ?? 0) - (left.volume30dUsd ?? 0))
      .slice(0, 5);
    const status = scan ? "Live generated" : "Template fallback";
    const summary = scan
      ? `${scan.name} scores ${scan.score}/100 with grade ${scan.healthScore.grade} across ${scan.marketCount} matched Superchain markets. The case study focuses on whether volume, fees, trend, and source confidence are strong enough for incentive-impact evidence.`
      : definition.fallbackSummary;
    const findings = scan ? buildFindings(scan) : buildFallbackFindings(definition);
    const limitations = scan
      ? buildLimitations(scan, matchedMarkets)
      : [
          "Live protocol scan is not available in the current browser snapshot.",
          "Final evidence pack must refresh public data before delivery.",
          "Unavailable values should remain unavailable instead of being manually filled.",
        ];
    const metrics = scan
      ? [
          { label: "Health score", value: `${scan.score}/100` },
          { label: "Grade", value: scan.healthScore.grade },
          { label: "Data confidence", value: `${scan.healthScore.confidence}/100` },
          { label: "30d volume", value: usd.format(scan.volume30dUsd) },
          { label: "30d fees", value: formatOptionalUsd(scan.fees30dUsd) },
          { label: "7d trend", value: formatOptionalPct(scan.weightedChange7dPct) },
        ]
      : [
          { label: "Health score", value: "Unavailable" },
          { label: "Grade", value: "Template" },
          { label: "Data confidence", value: "Unavailable" },
          { label: "30d volume", value: "Refresh live data" },
          { label: "30d fees", value: "Refresh live data" },
          { label: "7d trend", value: "Refresh live data" },
        ];
    const title = `${definition.protocolName} Superchain Impact Case Study`;
    const markdown = buildMarkdown({
      definition,
      findings,
      generatedAt,
      limitations,
      metrics,
      scan,
      status,
      summary,
      topMarkets,
      title,
    });

    return {
      id: definition.id,
      title,
      protocolName: definition.protocolName,
      networkFocus: definition.networkFocus,
      status,
      generatedAt,
      summary,
      decisionQuestion: definition.decisionQuestion,
      findings,
      limitations,
      metrics,
      markdown,
      fileName: `${slugify(definition.protocolName)}-superchain-impact-case-study.md`,
    };
  });
}

export function buildPublicCaseStudiesJson(caseStudies: PublicCaseStudy[]) {
  return JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      product: "Superchain Liquidity Ops",
      purpose: "Public case studies for Superchain liquidity and incentive impact evidence.",
      caseStudies: caseStudies.map(({ markdown: _markdown, ...caseStudy }) => caseStudy),
    },
    null,
    2,
  );
}

function buildFindings(scan: ProtocolScan) {
  const findings = [
    `${scan.name} has ${usd.format(scan.volume30dUsd)} in matched 30d DEX volume across ${scan.marketCount} markets.`,
    `The scanner classifies the protocol as "${scan.status}" with ${scan.healthScore.confidence}/100 data confidence.`,
  ];

  if (scan.fees30dUsd === null) {
    findings.push("Protocol-level 30d fee attribution is unavailable in the public feed and should be disclosed.");
  } else {
    findings.push(`Matched 30d fees are ${usd.format(scan.fees30dUsd)}, with fee/volume at ${formatOptionalPct(scan.feeToVolume30dPct)}.`);
  }

  if ((scan.weightedChange7dPct ?? 0) < 0) {
    findings.push("Weighted 7d trend is negative, so the evidence pack should explain whether this is temporary or incentive-related.");
  } else {
    findings.push("Weighted 7d trend is non-negative, which supports a stronger impact narrative if source freshness is healthy.");
  }

  if (scan.atRiskMarkets > 0) {
    findings.push(`${scan.atRiskMarkets} matched markets are At Risk and should be separated from stronger markets before any incentive update.`);
  }

  return findings;
}

function buildFallbackFindings(definition: CaseStudyDefinition) {
  return [
    `${definition.protocolName} should be evaluated with 30d volume, 30d fees, fee/volume, 7d trend, and source freshness.`,
    "The final case study should separate live facts from recommendations.",
    "The output should answer the decision question before asking for a deeper paid report or grant-funded automation.",
  ];
}

function buildLimitations(scan: ProtocolScan, markets: DexMarket[]) {
  const limitations = [
    "This is public-data evidence, not a security audit or investment recommendation.",
    "The current browser build uses public DefiLlama endpoints and does not ingest private protocol data.",
  ];

  if (scan.fees30dUsd === null || markets.some((market) => market.fees30dUsd === null)) {
    limitations.push("Some fee values are unavailable from the public feed and are not manually estimated.");
  }

  if (scan.healthScore.confidence < 70) {
    limitations.push("Data confidence is below 70/100, so operator language should stay conservative.");
  }

  return limitations;
}

function buildMarkdown({
  definition,
  findings,
  generatedAt,
  limitations,
  metrics,
  scan,
  status,
  summary,
  topMarkets,
  title,
}: {
  definition: CaseStudyDefinition;
  findings: string[];
  generatedAt: string;
  limitations: string[];
  metrics: PublicCaseStudy["metrics"];
  scan: ProtocolScan | undefined;
  status: PublicCaseStudy["status"];
  summary: string;
  topMarkets: DexMarket[];
  title: string;
}) {
  return [
    `# ${title}`,
    "",
    `Generated: ${generatedAt}`,
    `Status: ${status}`,
    `Network focus: ${definition.networkFocus}`,
    "",
    "## Decision Question",
    "",
    definition.decisionQuestion,
    "",
    "## Summary",
    "",
    summary,
    "",
    "## Metrics",
    "",
    "| Metric | Value |",
    "| --- | --- |",
    ...metrics.map((metric) => `| ${metric.label} | ${metric.value} |`),
    "",
    "## Findings",
    "",
    ...findings.map((finding) => `- ${finding}`),
    "",
    "## Top Matched Markets",
    "",
    topMarkets.length > 0
      ? "| Network | DEX | 30d volume | 30d fees | 7d trend | Health |"
      : "No live matched markets were available in the current snapshot.",
    topMarkets.length > 0 ? "| --- | --- | ---: | ---: | ---: | --- |" : "",
    ...topMarkets.map(
      (market) =>
        `| ${market.network} | ${market.dex} | ${formatOptionalUsd(market.volume30dUsd)} | ${formatOptionalUsd(
          market.fees30dUsd,
        )} | ${formatOptionalPct(market.change7dPct)} | ${market.health} |`,
    ),
    "",
    "## Evidence Recommendation",
    "",
    scan?.healthScore.recommendation ??
      "Refresh live data, confirm source coverage, then create the case study from current scanner output.",
    "",
    "## Limitations",
    "",
    ...limitations.map((limitation) => `- ${limitation}`),
    "",
  ].join("\n");
}

function formatOptionalUsd(value: number | null) {
  return value === null ? "Unavailable" : usd.format(value);
}

function formatOptionalPct(value: number | null) {
  return value === null ? "Unavailable" : `${pct.format(value)}%`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
