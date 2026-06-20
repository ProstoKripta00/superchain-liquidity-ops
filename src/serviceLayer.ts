import type { AutomationRun } from "./automation";
import type { ExportPack } from "./exportPack";
import type {
  DexMarket,
  MarketScopeMetrics,
  NetworkScope,
  OutcomeTarget,
  ProtocolScan,
} from "./types";

export type ServiceOfferId =
  | "protocol-diagnostic"
  | "monitoring-retainer"
  | "incentive-evidence-pack";

export type ServiceOfferStatus = "Ready to sell" | "Needs review" | "Blocked";

export type ServiceOffer = {
  id: ServiceOfferId;
  name: string;
  audience: string;
  priceLabel: string;
  timeline: string;
  status: ServiceOfferStatus;
  priority: number;
  fitScore: number;
  protocolName: string;
  problem: string;
  salesAngle: string;
  operatingCadence: string;
  deliverables: string[];
  acceptanceCriteria: string[];
  includedArtifacts: string[];
  clientBrief: string;
};

export type ServiceLayer = {
  generatedAt: string;
  summary: string;
  scopeLabel: string;
  selectedProtocolName: string;
  recommendedOfferId: ServiceOfferId;
  recommendedOfferName: string;
  readyCount: number;
  totalPipelineLabel: string;
  offers: ServiceOffer[];
  operatingModel: string[];
  serviceJson: string;
};

type BuildServiceLayerInput = {
  automationRun: AutomationRun;
  filteredMarkets: DexMarket[];
  network: NetworkScope;
  protocolScans: ProtocolScan[];
  selectedExportPack: ExportPack | null;
  target: "All" | OutcomeTarget;
  totals: MarketScopeMetrics;
};

const usd = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
  style: "currency",
  currency: "USD",
});

export function buildServiceLayer({
  automationRun,
  filteredMarkets,
  network,
  protocolScans,
  selectedExportPack,
  target,
  totals,
}: BuildServiceLayerInput): ServiceLayer {
  const generatedAt = new Date().toISOString();
  const scopeLabel = `${network} / ${target}`;
  const selectedProtocol =
    protocolScans.find((scan) => scan.id === selectedExportPack?.protocolId) ??
    protocolScans.find((scan) => scan.status === "Ready for report") ??
    protocolScans[0] ??
    null;
  const protocolName = selectedProtocol?.name ?? "Selected protocol";
  const watchCount = filteredMarkets.filter((market) => market.health !== "Strong").length;
  const baseArtifacts = selectedExportPack
    ? [
        selectedExportPack.fileName,
        ...selectedExportPack.artifacts.map((artifact) => artifact.fileName),
      ]
    : ["Mini report Markdown", "Scope CSV export", "Source audit summary"];

  const rawOffers: Array<Omit<ServiceOffer, "clientBrief">> = [
    {
      id: "protocol-diagnostic",
      name: "Protocol Diagnostic Sprint",
      audience: "DEX, bridge, wallet, or protocol growth team",
      priceLabel: "$300-$750 first report",
      timeline: "2-4 days",
      status: selectedExportPack ? "Ready to sell" : selectedProtocol ? "Needs review" : "Blocked",
      priority: 1,
      fitScore: selectedProtocol?.score ?? 0,
      protocolName,
      problem:
        "Protocol teams need a fast, source-backed read on Superchain volume quality, fee capture and weak markets before they spend growth budget or ask for incentives.",
      salesAngle: selectedProtocol
        ? `${protocolName} has ${formatUsd(selectedProtocol.volume30dUsd)} in matched 30d DEX volume and scanner score ${selectedProtocol.score}/100. Start with a narrow evidence report before proposing a larger package.`
        : "Wait for a live protocol scan before pitching a diagnostic sprint.",
      operatingCadence: "One-off diagnostic with one revision pass.",
      deliverables: [
        "Protocol mini-report with health score and scanner recommendation",
        "Matched Superchain market CSV",
        "Top market risks and next actions",
        "Source audit notes for every public data point used",
      ],
      acceptanceCriteria: [
        "Client receives Markdown report and CSV evidence",
        "Every metric keeps its public source URL or unavailable marker",
        "Report includes at least three concrete follow-up actions",
      ],
      includedArtifacts: baseArtifacts,
    },
    {
      id: "monitoring-retainer",
      name: "Liquidity Monitoring Retainer",
      audience: "Protocol growth, ecosystem, or DAO operations team",
      priceLabel: "$750-$1,500 / month after pilot",
      timeline: "Weekly after first case",
      status: filteredMarkets.length > 0
        ? automationRun.blockedCount > 0
          ? "Needs review"
          : "Ready to sell"
        : "Blocked",
      priority: 2,
      fitScore: Math.min(100, 55 + automationRun.readyCount * 6 + watchCount * 2),
      protocolName: "Superchain scope",
      problem:
        "Teams that already care about incentive performance need weekly evidence without manually checking several DEX dashboards and source feeds.",
      salesAngle: `${filteredMarkets.length} markets are in scope, ${watchCount} need watchlist review, and current 30d DEX volume is ${formatUsd(totals.volume30d)}.`,
      operatingCadence: "Weekly runbook, watchlist review, and source-health check.",
      deliverables: [
        "Weekly automation runbook",
        "Watchlist of weak or deteriorating markets",
        "Scope CSV export",
        "Short action memo for protocol or ecosystem stakeholders",
      ],
      acceptanceCriteria: [
        "Weekly runbook is delivered on the agreed cadence",
        "Watchlist separates Ready, Watch and Blocked issues",
        "Source degradation is disclosed instead of hidden",
      ],
      includedArtifacts: [
        "superchain-automation-runbook.md",
        "superchain-dex-market-impact.csv",
        "source-audit.md",
      ],
    },
    {
      id: "incentive-evidence-pack",
      name: "DAO / Incentive Evidence Pack",
      audience: "Protocol team, DAO contributor, or ecosystem operations team",
      priceLabel: "$1,500-$3,000 after validated case",
      timeline: "7-10 days",
      status: selectedExportPack
        ? automationRun.status === "Blocked"
          ? "Needs review"
          : "Ready to sell"
        : "Blocked",
      priority: 3,
      fitScore: Math.min(100, (selectedProtocol?.healthScore.confidence ?? 40) + 20),
      protocolName,
      problem:
        "DAO and incentive teams need evidence that liquidity programs created measurable DEX activity, fee output and market health, not just screenshots.",
      salesAngle: selectedExportPack
        ? `${selectedExportPack.title} already packages Markdown, CSV and JSON artifacts for operator handoff.`
        : "Create an export pack before pitching this service.",
      operatingCadence: "Project delivery with kickoff, evidence pack, and final handoff.",
      deliverables: [
        "Decision-ready narrative",
        "Before/after metric scope",
        "Export pack JSON and CSV artifacts",
        "Methodology and source limitation notes",
      ],
      acceptanceCriteria: [
        "Evidence pack lists the metric scope and public endpoints",
        "Buyer can reproduce the exported numbers from dashboard sources",
        "Final handoff separates facts, risks and recommendations",
      ],
      includedArtifacts: selectedExportPack
        ? [selectedExportPack.fileName, ...selectedExportPack.artifacts.map((artifact) => artifact.fileName)]
        : baseArtifacts,
    },
  ];
  const offers: ServiceOffer[] = rawOffers.map((offer) => ({
    ...offer,
    clientBrief: buildClientBrief(offer, scopeLabel, generatedAt),
  }));
  const recommendedOffer =
    offers.find((offer) => offer.status === "Ready to sell") ??
    offers.find((offer) => offer.status === "Needs review") ??
    offers[0];
  const readyCount = offers.filter((offer) => offer.status === "Ready to sell").length;
  const operatingModel = [
    "Use scanner output to choose a protocol or scope.",
    "Generate reports and export pack from the same live data snapshot.",
    "Run automation to produce a repeatable operating runbook.",
    "Sell the narrowest diagnostic first, publish one honest case study, then expand into monitoring.",
  ];
  const servicePayload = {
    generatedAt,
    product: "Superchain Liquidity Ops",
    scope: {
      network,
      target,
      scopeLabel,
      markets: filteredMarkets.length,
      volume30dUsd: totals.volume30d,
      fees30dUsd: totals.fees30d,
      watchCount,
    },
    recommendedOfferId: recommendedOffer.id,
    offers: offers.map(({ clientBrief: _clientBrief, ...offer }) => offer),
    automation: {
      status: automationRun.status,
      readyJobs: automationRun.readyCount,
      watchJobs: automationRun.watchCount,
      blockedJobs: automationRun.blockedCount,
    },
  };

  return {
    generatedAt,
    summary: `${readyCount} of ${offers.length} service packages are ready from the current evidence layer.`,
    scopeLabel,
    selectedProtocolName: protocolName,
    recommendedOfferId: recommendedOffer.id,
    recommendedOfferName: recommendedOffer.name,
    readyCount,
    totalPipelineLabel: `${offers.length} service offers`,
    offers,
    operatingModel,
    serviceJson: JSON.stringify(servicePayload, null, 2),
  };
}

function buildClientBrief(
  offer: Omit<ServiceOffer, "clientBrief">,
  scopeLabel: string,
  generatedAt: string,
) {
  return [
    `# ${offer.name}`,
    "",
    `Generated: ${generatedAt}`,
    `Status: ${offer.status}`,
    `Audience: ${offer.audience}`,
    `Suggested quote: ${offer.priceLabel}`,
    `Timeline: ${offer.timeline}`,
    `Scope: ${scopeLabel}`,
    `Protocol: ${offer.protocolName}`,
    "",
    "## Problem",
    "",
    offer.problem,
    "",
    "## Sales Angle",
    "",
    offer.salesAngle,
    "",
    "## Deliverables",
    "",
    ...offer.deliverables.map((item) => `- ${item}`),
    "",
    "## Acceptance Criteria",
    "",
    ...offer.acceptanceCriteria.map((item) => `- ${item}`),
    "",
    "## Included Artifacts",
    "",
    ...offer.includedArtifacts.map((item) => `- ${item}`),
    "",
    "## Operating Cadence",
    "",
    offer.operatingCadence,
    "",
    "## Next Step",
    "",
    "Send the client brief with one sample artifact, confirm the target protocol or scope, then deliver only after source status and metric availability are checked.",
  ].join("\n");
}

function formatUsd(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? usd.format(value)
    : "unavailable";
}
