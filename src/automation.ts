import type { ExportPack } from "./exportPack";
import { formatUtcDateTime } from "./dateFormat";
import type {
  DexMarket,
  LiquiditySnapshot,
  MarketScopeMetrics,
  NetworkScope,
  OutcomeTarget,
  ProtocolScan,
  SourceStatus,
} from "./types";

export type AutomationJobType =
  | "report"
  | "export-pack"
  | "watchlist"
  | "source-audit"
  | "scope-refresh";

export type AutomationRunStatus = "Ready" | "Watch" | "Blocked";

export type AutomationJob = {
  id: string;
  type: AutomationJobType;
  title: string;
  owner: string;
  status: AutomationRunStatus;
  priority: number;
  reason: string;
  output: string;
  nextRun: string;
};

export type AutomationRun = {
  generatedAt: string;
  mode: "Browser automation";
  status: AutomationRunStatus;
  summary: string;
  scopeLabel: string;
  readyCount: number;
  watchCount: number;
  blockedCount: number;
  jobs: AutomationJob[];
  runbook: string;
};

type BuildAutomationRunInput = {
  filteredMarkets: DexMarket[];
  network: NetworkScope;
  protocolScans: ProtocolScan[];
  selectedExportPack: ExportPack | null;
  snapshot: LiquiditySnapshot | null;
  sources: SourceStatus[];
  target: "All" | OutcomeTarget;
  totals: MarketScopeMetrics;
};

export function buildAutomationRun({
  filteredMarkets,
  network,
  protocolScans,
  selectedExportPack,
  snapshot,
  sources,
  target,
  totals,
}: BuildAutomationRunInput): AutomationRun {
  const generatedAt = new Date().toISOString();
  const scopeLabel = `${network} / ${target}`;

  if (!snapshot) {
    const jobs: AutomationJob[] = [
      {
        id: "source-audit-waiting",
        type: "source-audit",
        title: "Wait for public data sources",
        owner: "Data Engine",
        status: "Blocked",
        priority: 1,
        reason: "The live snapshot has not loaded, so reports and export packs cannot be generated yet.",
        output: "No artifact",
        nextRun: "After refresh",
      },
    ];

    return finalizeRun({
      generatedAt,
      jobs,
      scopeLabel,
      summary: "Automation is waiting for the first live data snapshot.",
    });
  }

  const readyReports = protocolScans
    .filter((scan) => scan.status === "Ready for report")
    .sort((left, right) => right.score - left.score)
    .slice(0, 3);
  const reportCandidates =
    readyReports.length > 0
      ? readyReports
      : protocolScans.slice(0, 2).filter((scan) => scan.score >= 45);
  const watchMarkets = filteredMarkets
    .filter((market) => market.health !== "Strong")
    .sort((left, right) => (right.volume30dUsd ?? 0) - (left.volume30dUsd ?? 0));
  const sourceProblems = sources.filter((source) => source.state !== "ok");
  const sourceErrors = sourceProblems.filter((source) => source.state === "error");

  const jobs: AutomationJob[] = [
    {
      id: "scope-refresh",
      type: "scope-refresh",
      title: "Refresh current Superchain scope",
      owner: "Data Engine",
      status: filteredMarkets.length > 0 ? "Ready" : "Blocked",
      priority: 1,
      reason:
        filteredMarkets.length > 0
          ? `${filteredMarkets.length} live markets are available for the selected scope.`
          : "No live markets match the selected network and outcome filters.",
      output: "Updated market, chain and source state",
      nextRun: "On refresh",
    },
    ...reportCandidates.map<AutomationJob>((scan, index) => ({
      id: `report-${scan.id}`,
      type: "report",
      title: `Generate ${scan.name} mini report`,
      owner: "Reports",
      status: scan.status === "Ready for report" ? "Ready" : "Watch",
      priority: index + 2,
      reason:
        scan.status === "Ready for report"
          ? `${scan.name} has score ${scan.score}/100 and enough data confidence for outreach.`
          : `${scan.name} is the best available fallback target, but should stay in review.`,
      output: `${scan.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-superchain-report.md`,
      nextRun: "After each data refresh",
    })),
    {
      id: "export-pack",
      type: "export-pack",
      title: selectedExportPack
        ? `Build ${selectedExportPack.title}`
        : "Build selected protocol export pack",
      owner: "Export Pack",
      status: selectedExportPack ? "Ready" : "Blocked",
      priority: 5,
      reason: selectedExportPack
        ? "The selected report can be packaged into JSON, Markdown and CSV handoff artifacts."
        : "Select a generated report before creating a handoff package.",
      output: selectedExportPack?.fileName ?? "No export pack",
      nextRun: "Manual run",
    },
    {
      id: "watchlist",
      type: "watchlist",
      title: "Build underperforming market watchlist",
      owner: "Protocol Scanner",
      status: watchMarkets.length > 0 ? "Watch" : "Ready",
      priority: 6,
      reason:
        watchMarkets.length > 0
          ? `${watchMarkets.length} markets are marked Watch or At risk for follow-up.`
          : "No weak markets are visible in the current scope.",
      output: "watchlist section in runbook",
      nextRun: "After each data refresh",
    },
    {
      id: "source-audit",
      type: "source-audit",
      title: "Check public data source health",
      owner: "Source Audit",
      status: sourceErrors.length > 0 ? "Blocked" : sourceProblems.length > 0 ? "Watch" : "Ready",
      priority: 7,
      reason:
        sourceProblems.length > 0
          ? `${sourceProblems.length} source statuses need attention before publishing final claims.`
          : "All public data sources are currently reachable.",
      output: "source-audit.md",
      nextRun: "On refresh",
    },
  ];

  return finalizeRun({
    generatedAt,
    jobs,
    scopeLabel,
    summary: buildSummary(filteredMarkets, reportCandidates, watchMarkets, totals, sourceProblems),
  });
}

function finalizeRun({
  generatedAt,
  jobs,
  scopeLabel,
  summary,
}: {
  generatedAt: string;
  jobs: AutomationJob[];
  scopeLabel: string;
  summary: string;
}): AutomationRun {
  const readyCount = jobs.filter((job) => job.status === "Ready").length;
  const watchCount = jobs.filter((job) => job.status === "Watch").length;
  const blockedCount = jobs.filter((job) => job.status === "Blocked").length;
  const status: AutomationRunStatus =
    blockedCount > 0 ? "Blocked" : watchCount > 0 ? "Watch" : "Ready";

  const run: Omit<AutomationRun, "runbook"> = {
    generatedAt,
    mode: "Browser automation",
    status,
    summary,
    scopeLabel,
    readyCount,
    watchCount,
    blockedCount,
    jobs,
  };

  return {
    ...run,
    runbook: buildAutomationRunbook(run),
  };
}

function buildSummary(
  markets: DexMarket[],
  reportCandidates: ProtocolScan[],
  watchMarkets: DexMarket[],
  totals: MarketScopeMetrics,
  sourceProblems: SourceStatus[],
) {
  return [
    `${markets.length} scoped markets`,
    `${reportCandidates.length} report jobs`,
    `${watchMarkets.length} watchlist markets`,
    `${sourceProblems.length} source issues`,
    `${formatUsd(totals.volume30d)} 30d DEX volume`,
  ].join(" / ");
}

function buildAutomationRunbook(run: Omit<AutomationRun, "runbook">) {
  return [
    "# Superchain Liquidity Ops Automation Runbook",
    "",
    `Generated: ${formatUtcDateTime(run.generatedAt)}`,
    `Mode: ${run.mode}`,
    `Scope: ${run.scopeLabel}`,
    `Status: ${run.status}`,
    "",
    "## Summary",
    "",
    run.summary,
    "",
    "## Job Counts",
    "",
    `- Ready: ${run.readyCount}`,
    `- Watch: ${run.watchCount}`,
    `- Blocked: ${run.blockedCount}`,
    "",
    "## Jobs",
    "",
    ...run.jobs.flatMap((job) => [
      `### ${job.priority}. ${job.title}`,
      "",
      `- Type: ${job.type}`,
      `- Owner: ${job.owner}`,
      `- Status: ${job.status}`,
      `- Output: ${job.output}`,
      `- Next run: ${job.nextRun}`,
      `- Reason: ${job.reason}`,
      "",
    ]),
    "## Operating Rule",
    "",
    "Publish Ready outputs first. Keep Watch jobs in review notes. Do not publish Blocked outputs until the stated reason is fixed.",
  ].join("\n");
}

function formatUsd(value: number | null) {
  if (value === null) {
    return "unavailable";
  }

  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
    style: "currency",
    currency: "USD",
  }).format(value);
}
