import type { DexMarket, ProtocolMiniReport, ProtocolScan } from "./types";

const usd = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
  style: "currency",
  currency: "USD",
});

const pct = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
  signDisplay: "exceptZero",
});

export function buildProtocolMiniReport(
  scan: ProtocolScan,
  markets: DexMarket[],
): ProtocolMiniReport {
  const generatedAt = new Date().toISOString();
  const sortedMarkets = [...markets].sort(
    (left, right) => (right.volume30dUsd ?? 0) - (left.volume30dUsd ?? 0),
  );
  const title = `${scan.name} Superchain Mini Report`;
  const summary = buildExecutiveSummary(scan);
  const markdown = [
    `# ${title}`,
    "",
    `Generated: ${generatedAt}`,
    `Data refresh: ${scan.updatedAt}`,
    "",
    "## Executive Summary",
    "",
    summary,
    "",
    "## Protocol Snapshot",
    "",
    `| Field | Value |`,
    `| --- | --- |`,
    `| Protocol | ${scan.name} |`,
    `| Segment | ${scan.segment} |`,
    `| Scanner status | ${scan.status} |`,
    `| Health score | ${scan.score}/100 |`,
    `| Grade | ${scan.healthScore.grade} |`,
    `| Data confidence | ${scan.healthScore.confidence}/100 |`,
    `| Networks | ${scan.networks.join(", ")} |`,
    `| Matched markets | ${scan.marketCount} |`,
    `| 24h volume | ${formatUsd(scan.volume24hUsd)} |`,
    `| 30d volume | ${formatUsd(scan.volume30dUsd)} |`,
    `| 30d fees | ${formatOptionalUsd(scan.fees30dUsd)} |`,
    `| 30d fee / volume | ${formatOptionalPct(scan.feeToVolume30dPct)} |`,
    `| Weighted 7d trend | ${formatOptionalPct(scan.weightedChange7dPct)} |`,
    "",
    "## Health Score Breakdown",
    "",
    `| Component | Score | Weight | Note |`,
    `| --- | ---: | ---: | --- |`,
    ...scan.healthScore.components.map(
      (component) =>
        `| ${component.label} | ${component.score}/100 | ${component.weight}% | ${escapeTableCell(
          component.note,
        )} |`,
    ),
    "",
    "## Strengths",
    "",
    ...asBullets(scan.healthScore.strengths),
    "",
    "## Risks",
    "",
    ...asBullets(scan.healthScore.risks),
    "",
    "## Matched Superchain Markets",
    "",
    sortedMarkets.length > 0
      ? `| Network | Market | 30d volume | 30d fees | 7d trend | Health | Source |`
      : "No matched markets were available in the current live snapshot.",
    sortedMarkets.length > 0 ? `| --- | --- | ---: | ---: | ---: | --- | --- |` : "",
    ...sortedMarkets.map(
      (market) =>
        `| ${market.network} | ${market.dex} | ${formatOptionalUsd(
          market.volume30dUsd,
        )} | ${formatOptionalUsd(market.fees30dUsd)} | ${formatOptionalPct(
          market.change7dPct,
        )} | ${market.health} | ${market.sourceUrl} |`,
    ),
    "",
    "## Evidence Angle",
    "",
    scan.opportunity,
    "",
    "## Recommendation",
    "",
    scan.healthScore.recommendation,
    "",
    "## Next Actions",
    "",
    ...buildNextActions(scan),
    "",
    "## Methodology Notes",
    "",
    "- This mini-report uses public DefiLlama browser-accessible endpoints.",
    "- Missing fee or trend values are marked unavailable instead of being replaced with manual estimates.",
    "- This is not a security audit, investment rating, or financial recommendation.",
    "- The report is intended for protocol growth, incentive reporting, internal reviews, DAO updates, and ecosystem evidence when needed.",
    "",
  ]
    .filter((line) => line !== null)
    .join("\n");

  return {
    protocolId: scan.id,
    title,
    fileName: `${slugify(scan.name)}-superchain-mini-report.md`,
    markdown,
    summary,
    generatedAt,
  };
}

function buildExecutiveSummary(scan: ProtocolScan) {
  return `${scan.name} currently scores ${scan.score}/100 with grade ${
    scan.healthScore.grade
  } and ${scan.healthScore.confidence}/100 data confidence across ${scan.marketCount} matched Superchain markets. The scanner classifies the protocol as "${scan.status}". ${scan.healthScore.recommendation}`;
}

function buildNextActions(scan: ProtocolScan) {
  const actions = [scan.nextAction];

  if (scan.status === "Ready for report") {
    actions.push("Prepare a public one-page case study with CSV evidence and source limitations.");
    actions.push("Use the report as a liquidity-program update or protocol-growth evidence pack before proposing deeper work.");
  } else if (scan.status === "Monitor") {
    actions.push("Track the same protocol weekly until trend, fee attribution, or confidence improves.");
    actions.push("Use a small diagnostic snapshot instead of proposing a full evidence pack immediately.");
  } else {
    actions.push("Keep the protocol in automated monitoring and avoid manual research effort for now.");
  }

  return asBullets(actions);
}

function asBullets(items: string[]) {
  return items.length > 0 ? items.map((item) => `- ${item}`) : ["- None"];
}

function formatUsd(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? usd.format(value)
    : "Unavailable";
}

function formatOptionalUsd(value: number | null | undefined) {
  return formatUsd(value);
}

function formatOptionalPct(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? `${pct.format(value)}%`
    : "Unavailable";
}

function escapeTableCell(value: string) {
  return value.replace(/\|/g, "\\|");
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
