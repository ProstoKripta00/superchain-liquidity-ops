import type { AutomationRun } from "./automation";
import type { LeadTargetList } from "./leadTargets";
import type { ExportPack } from "./exportPack";
import type { LiquiditySnapshot, MarketScopeMetrics, NetworkScope, OutcomeTarget } from "./types";

export type SnapshotScheduleStatus = "Ready" | "Watch" | "Blocked";
export type SnapshotScheduleCadence = "Daily" | "Weekly" | "Manual";

export type SnapshotSchedule = {
  artifactName: string;
  cadence: SnapshotScheduleCadence;
  cron: string;
  detail: string;
  id: string;
  nextRunUtc: string;
  owner: string;
  retention: string;
  status: SnapshotScheduleStatus;
  title: string;
};

export type ScheduledSnapshotsPack = {
  generatedAt: string;
  summary: string;
  schedules: SnapshotSchedule[];
  readyCount: number;
  watchCount: number;
  blockedCount: number;
  nextSnapshotUtc: string;
  storagePath: string;
  snapshotManifestName: string;
  artifactPlan: Array<{ label: string; value: string }>;
  githubActionYaml: string;
  markdown: string;
  json: string;
};

type BuildScheduledSnapshotsInput = {
  automationRun: AutomationRun;
  leadTargetList: LeadTargetList;
  network: NetworkScope;
  selectedExportPack: ExportPack | null;
  snapshot: LiquiditySnapshot | null;
  target: "All" | OutcomeTarget;
  totals: MarketScopeMetrics;
};

const snapshotDate = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "UTC",
  year: "numeric",
});

export function buildScheduledSnapshotsPack({
  automationRun,
  leadTargetList,
  network,
  selectedExportPack,
  snapshot,
  target,
  totals,
}: BuildScheduledSnapshotsInput): ScheduledSnapshotsPack {
  const generatedAt = new Date().toISOString();
  const nextDaily = nextUtcRun(7);
  const nextWeekly = nextWeeklyUtcRun(9);
  const storagePath = `snapshots/${formatUtcDatePath(generatedAt)}`;
  const sourceProblems = snapshot?.sources.filter((source) => source.state !== "ok") ?? [];
  const hasSnapshot = Boolean(snapshot);
  const hasExportPack = Boolean(selectedExportPack);
  const hasLeadTargets = leadTargetList.targets.length > 0;

  const schedules: SnapshotSchedule[] = [
    {
      artifactName: "scope-summary.json",
      cadence: "Daily",
      cron: "0 7 * * *",
      detail: hasSnapshot
        ? `${snapshot?.markets.length ?? 0} markets, ${snapshot?.protocolScans.length ?? 0} protocol scans, ${sourceProblems.length} source issues.`
        : "Blocked until the first live snapshot loads.",
      id: "daily-scope-summary",
      nextRunUtc: nextDaily,
      owner: "Data Engine",
      retention: "30 daily files",
      status: hasSnapshot ? (sourceProblems.length > 0 ? "Watch" : "Ready") : "Blocked",
      title: "Daily Superchain scope summary",
    },
    {
      artifactName: "market-impact.csv",
      cadence: "Daily",
      cron: "15 7 * * *",
      detail: `${formatUsd(totals.volume30d)} 30d volume, ${formatOptionalUsd(totals.fees30d)} 30d fees, ${totals.watchCount} watch markets.`,
      id: "daily-market-impact",
      nextRunUtc: nextUtcRun(7, 15),
      owner: "Data Engine",
      retention: "30 daily CSV files",
      status: hasSnapshot ? "Ready" : "Blocked",
      title: "Daily market impact CSV",
    },
    {
      artifactName: selectedExportPack?.fileName ?? "selected-export-pack.json",
      cadence: "Weekly",
      cron: "0 9 * * 1",
      detail: hasExportPack
        ? `${selectedExportPack?.title} with ${selectedExportPack?.artifacts.length ?? 0} artifacts.`
        : "Select a protocol report before scheduling weekly export-pack snapshots.",
      id: "weekly-export-pack",
      nextRunUtc: nextWeekly,
      owner: "Export Pack",
      retention: "12 weekly packs",
      status: hasExportPack ? "Ready" : "Blocked",
      title: "Weekly selected protocol export pack",
    },
    {
      artifactName: "lead-target-list.json",
      cadence: "Weekly",
      cron: "30 9 * * 1",
      detail: `${leadTargetList.topTargetCount} targets, ${leadTargetList.pitchNowCount} pitch-now leads, ${leadTargetList.enrichNextCount} enrichment leads.`,
      id: "weekly-lead-targets",
      nextRunUtc: nextWeeklyUtcRun(9, 30),
      owner: "Lead Targets",
      retention: "12 weekly lead lists",
      status: hasLeadTargets ? "Ready" : "Watch",
      title: "Weekly lead target snapshot",
    },
    {
      artifactName: "source-audit.json",
      cadence: "Daily",
      cron: "45 7 * * *",
      detail:
        sourceProblems.length > 0
          ? `${sourceProblems.length} sources need review before publishing claims.`
          : "All tracked public sources are currently OK.",
      id: "daily-source-audit",
      nextRunUtc: nextUtcRun(7, 45),
      owner: "Source Audit",
      retention: "30 daily audit files",
      status: hasSnapshot ? (sourceProblems.length > 0 ? "Watch" : "Ready") : "Blocked",
      title: "Daily source audit snapshot",
    },
  ];

  const readyCount = schedules.filter((schedule) => schedule.status === "Ready").length;
  const watchCount = schedules.filter((schedule) => schedule.status === "Watch").length;
  const blockedCount = schedules.filter((schedule) => schedule.status === "Blocked").length;
  const snapshotManifestName = `${storagePath}/manifest.json`;
  const artifactPlan = [
    { label: "Scope", value: `${network} / ${target}` },
    { label: "Storage path", value: storagePath },
    { label: "Manifest", value: snapshotManifestName },
    { label: "Next snapshot", value: nextDaily },
    { label: "Retention", value: "30 daily / 12 weekly" },
    { label: "Schedule mode", value: "GitHub Actions cron or external scheduler" },
  ];
  const summary = `${readyCount}/${schedules.length} snapshot schedules ready. Static GitHub Pages can display and export the plan; recurring execution needs GitHub Actions or another scheduler.`;
  const githubActionYaml = buildGithubActionYaml();
  const markdown = buildMarkdown({
    artifactPlan,
    automationRun,
    generatedAt,
    githubActionYaml,
    schedules,
    summary,
  });
  const json = JSON.stringify(
    {
      generatedAt,
      product: "Superchain Liquidity Ops",
      scope: { network, target },
      summary,
      storagePath,
      snapshotManifestName,
      counts: { readyCount, watchCount, blockedCount },
      artifactPlan,
      schedules,
      githubActionYaml,
    },
    null,
    2,
  );

  return {
    artifactPlan,
    blockedCount,
    generatedAt,
    githubActionYaml,
    json,
    markdown,
    nextSnapshotUtc: nextDaily,
    readyCount,
    schedules,
    snapshotManifestName,
    storagePath,
    summary,
    watchCount,
  };
}

function nextUtcRun(hour: number, minute = 0) {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(hour, minute, 0, 0);

  if (next <= now) {
    next.setUTCDate(next.getUTCDate() + 1);
  }

  return next.toISOString();
}

function nextWeeklyUtcRun(hour: number, minute = 0) {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(hour, minute, 0, 0);
  const currentDay = next.getUTCDay();
  const daysUntilMonday = (8 - currentDay) % 7 || 7;

  if (currentDay !== 1 || next <= now) {
    next.setUTCDate(next.getUTCDate() + daysUntilMonday);
  }

  return next.toISOString();
}

function formatUtcDatePath(value: string) {
  return snapshotDate.format(new Date(value)).replaceAll("-", "/");
}

function buildGithubActionYaml() {
  return [
    "name: Scheduled Superchain Snapshots",
    "",
    "on:",
    "  workflow_dispatch:",
    "  schedule:",
    "    - cron: '0 7 * * *'",
    "    - cron: '0 9 * * 1'",
    "",
    "jobs:",
    "  snapshot:",
    "    runs-on: ubuntu-latest",
    "    steps:",
    "      - uses: actions/checkout@v4",
    "      - uses: actions/setup-node@v4",
    "        with:",
    "          node-version: 22",
    "      - run: npm ci",
    "      - run: npm run build",
    "      - run: npm run snapshot",
    "      - uses: actions/upload-artifact@v4",
    "        with:",
    "          name: superchain-snapshots",
    "          path: snapshots/",
  ].join("\n");
}

function buildMarkdown({
  artifactPlan,
  automationRun,
  generatedAt,
  githubActionYaml,
  schedules,
  summary,
}: {
  artifactPlan: Array<{ label: string; value: string }>;
  automationRun: AutomationRun;
  generatedAt: string;
  githubActionYaml: string;
  schedules: SnapshotSchedule[];
  summary: string;
}) {
  return [
    "# Superchain Scheduled Snapshots",
    "",
    `Generated: ${generatedAt}`,
    `Automation status: ${automationRun.status}`,
    "",
    "## Summary",
    "",
    summary,
    "",
    "## Artifact Plan",
    "",
    ...artifactPlan.map((item) => `- ${item.label}: ${item.value}`),
    "",
    "## Schedules",
    "",
    ...schedules.flatMap((schedule) => [
      `### ${schedule.title}`,
      "",
      `- Status: ${schedule.status}`,
      `- Cadence: ${schedule.cadence}`,
      `- Cron: ${schedule.cron}`,
      `- Next run UTC: ${schedule.nextRunUtc}`,
      `- Owner: ${schedule.owner}`,
      `- Artifact: ${schedule.artifactName}`,
      `- Retention: ${schedule.retention}`,
      `- Detail: ${schedule.detail}`,
      "",
    ]),
    "## GitHub Actions Template",
    "",
    "```yaml",
    githubActionYaml,
    "```",
    "",
    "## Boundary",
    "",
    "The static dashboard can generate and export this snapshot plan, but recurring execution requires GitHub Actions, a backend worker, or another scheduler.",
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

function formatOptionalUsd(value: number | null) {
  return value === null ? "unavailable" : formatUsd(value);
}
