import type { ExportPack } from "./exportPack";
import type { OutreachLead, OutreachPipeline } from "./outreachPipeline";
import type { SampleReport } from "./sampleReports";
import type { ServiceLayer, ServiceOffer } from "./serviceLayer";

export type LaunchStatus = "Launch ready" | "Needs review" | "Blocked";
export type LaunchChecklistStatus = "Ready" | "Needs review" | "Blocked";

export type LaunchChecklistItem = {
  id: string;
  title: string;
  status: LaunchChecklistStatus;
  detail: string;
};

export type SalesKit = {
  generatedAt: string;
  status: LaunchStatus;
  readinessScore: number;
  packageName: string;
  priceLabel: string;
  timeline: string;
  targetProtocol: string;
  targetLead: string;
  sampleReportTitle: string;
  exportPackTitle: string;
  summary: string;
  checklist: LaunchChecklistItem[];
  intakeQuestions: string[];
  buyerFaq: Array<{ question: string; answer: string }>;
  terms: string[];
  proposalMarkdown: string;
  onboardingEmail: string;
  deliveryChecklistMarkdown: string;
  salesKitJson: string;
};

export function buildSalesKit({
  outreachPipeline,
  selectedExportPack,
  selectedLead,
  selectedOffer,
  selectedSampleReport,
  serviceLayer,
}: {
  outreachPipeline: OutreachPipeline;
  selectedExportPack: ExportPack | null;
  selectedLead: OutreachLead | null;
  selectedOffer: ServiceOffer | null;
  selectedSampleReport: SampleReport | null;
  serviceLayer: ServiceLayer;
}): SalesKit {
  const generatedAt = new Date().toISOString();
  const offer = selectedOffer ?? serviceLayer.offers[0] ?? null;
  const checklist = buildChecklist({
    outreachPipeline,
    selectedExportPack,
    selectedLead,
    selectedOffer: offer,
    selectedSampleReport,
    serviceLayer,
  });
  const readinessScore = scoreChecklist(checklist);
  const status = classifyLaunch(readinessScore, checklist);
  const targetProtocol =
    selectedLead?.protocolName ?? selectedExportPack?.title.replace(" Export Pack", "") ??
    serviceLayer.selectedProtocolName;
  const packageName = offer?.name ?? "Service package";
  const priceLabel = offer?.priceLabel ?? "Quote after scope";
  const timeline = offer?.timeline ?? "Timeline after scope";
  const targetLead = selectedLead
    ? `${selectedLead.protocolName} / ${selectedLead.status}`
    : "Select a lead in Outreach";
  const sampleReportTitle = selectedSampleReport?.title ?? "Select a public sample";
  const exportPackTitle = selectedExportPack?.title ?? "Generate an export pack";
  const intakeQuestions = buildIntakeQuestions();
  const buyerFaq = buildBuyerFaq();
  const terms = buildTerms();
  const summary = `${status}: ${packageName} for ${targetProtocol} at ${priceLabel}. ${checklist.filter((item) => item.status === "Ready").length}/${checklist.length} launch checks are ready.`;
  const proposalMarkdown = buildProposalMarkdown({
    checklist,
    generatedAt,
    intakeQuestions,
    offer,
    selectedExportPack,
    selectedLead,
    selectedSampleReport,
    serviceLayer,
    status,
    targetProtocol,
    terms,
  });
  const onboardingEmail = buildOnboardingEmail({
    offer,
    selectedLead,
    selectedSampleReport,
    status,
    targetProtocol,
  });
  const deliveryChecklistMarkdown = buildDeliveryChecklistMarkdown({
    checklist,
    generatedAt,
    offer,
    status,
    targetProtocol,
  });
  const salesKitJson = JSON.stringify(
    {
      generatedAt,
      product: "Superchain Liquidity Ops",
      status,
      readinessScore,
      summary,
      targetProtocol,
      targetLead,
      packageName,
      priceLabel,
      timeline,
      sampleReportTitle,
      exportPackTitle,
      checklist,
      intakeQuestions,
      buyerFaq,
      terms,
    },
    null,
    2,
  );

  return {
    generatedAt,
    status,
    readinessScore,
    packageName,
    priceLabel,
    timeline,
    targetProtocol,
    targetLead,
    sampleReportTitle,
    exportPackTitle,
    summary,
    checklist,
    intakeQuestions,
    buyerFaq,
    terms,
    proposalMarkdown,
    onboardingEmail,
    deliveryChecklistMarkdown,
    salesKitJson,
  };
}

function buildChecklist({
  outreachPipeline,
  selectedExportPack,
  selectedLead,
  selectedOffer,
  selectedSampleReport,
  serviceLayer,
}: {
  outreachPipeline: OutreachPipeline;
  selectedExportPack: ExportPack | null;
  selectedLead: OutreachLead | null;
  selectedOffer: ServiceOffer | null;
  selectedSampleReport: SampleReport | null;
  serviceLayer: ServiceLayer;
}): LaunchChecklistItem[] {
  return [
    {
      id: "offer",
      title: "Sellable package selected",
      status: selectedOffer
        ? selectedOffer.status === "Ready to sell"
          ? "Ready"
          : selectedOffer.status === "Needs review"
            ? "Needs review"
            : "Blocked"
        : "Blocked",
      detail: selectedOffer
        ? `${selectedOffer.name} / ${selectedOffer.priceLabel} / ${selectedOffer.timeline}`
        : "Select a package from Pricing.",
    },
    {
      id: "sample",
      title: "Public proof sample available",
      status: selectedSampleReport
        ? selectedSampleReport.status === "Live generated"
          ? "Ready"
          : "Needs review"
        : "Blocked",
      detail: selectedSampleReport
        ? `${selectedSampleReport.title} (${selectedSampleReport.status})`
        : "Generate or select a public sample report.",
    },
    {
      id: "export-pack",
      title: "Delivery artifacts packaged",
      status: selectedExportPack ? "Ready" : "Needs review",
      detail: selectedExportPack
        ? `${selectedExportPack.title} includes ${selectedExportPack.artifacts.length} artifacts.`
        : "Select a report and generate the export pack before delivery.",
    },
    {
      id: "lead",
      title: "Lead route prepared",
      status: selectedLead
        ? selectedLead.enrichmentStatus === "Contact found"
          ? "Ready"
          : selectedLead.status === "Ready to contact"
            ? "Needs review"
            : "Needs review"
        : "Blocked",
      detail: selectedLead
        ? `${selectedLead.protocolName}: ${selectedLead.status}, ${selectedLead.enrichmentSummary}`
        : "Select a lead and enrich the contact route.",
    },
    {
      id: "outreach",
      title: "Outreach pipeline has targets",
      status: outreachPipeline.leadCount > 0
        ? outreachPipeline.readyCount > 0
          ? "Ready"
          : "Needs review"
        : "Blocked",
      detail: `${outreachPipeline.leadCount} leads, ${outreachPipeline.readyCount} ready, ${outreachPipeline.enrichedCount} enriched.`,
    },
    {
      id: "service-layer",
      title: "Service layer is coherent",
      status: serviceLayer.readyCount > 0 ? "Ready" : "Needs review",
      detail: `${serviceLayer.readyCount}/${serviceLayer.offers.length} packages ready from current evidence.`,
    },
  ];
}

function scoreChecklist(checklist: LaunchChecklistItem[]) {
  const score = checklist.reduce((sum, item) => {
    if (item.status === "Ready") {
      return sum + 100;
    }

    if (item.status === "Needs review") {
      return sum + 55;
    }

    return sum;
  }, 0);

  return Math.round(score / checklist.length);
}

function classifyLaunch(
  readinessScore: number,
  checklist: LaunchChecklistItem[],
): LaunchStatus {
  if (checklist.some((item) => item.status === "Blocked")) {
    return readinessScore >= 70 ? "Needs review" : "Blocked";
  }

  if (readinessScore >= 80) {
    return "Launch ready";
  }

  return "Needs review";
}

function buildProposalMarkdown({
  checklist,
  generatedAt,
  intakeQuestions,
  offer,
  selectedExportPack,
  selectedLead,
  selectedSampleReport,
  serviceLayer,
  status,
  targetProtocol,
  terms,
}: {
  checklist: LaunchChecklistItem[];
  generatedAt: string;
  intakeQuestions: string[];
  offer: ServiceOffer | null;
  selectedExportPack: ExportPack | null;
  selectedLead: OutreachLead | null;
  selectedSampleReport: SampleReport | null;
  serviceLayer: ServiceLayer;
  status: LaunchStatus;
  targetProtocol: string;
  terms: string[];
}) {
  return [
    "# Superchain Liquidity Ops Proposal",
    "",
    `Generated: ${generatedAt}`,
    `Launch status: ${status}`,
    `Client / protocol: ${targetProtocol}`,
    `Package: ${offer?.name ?? "Service package"}`,
    `Price range: ${offer?.priceLabel ?? "Quote after scope"}`,
    `Timeline: ${offer?.timeline ?? "Timeline after scope"}`,
    "",
    "## Why This Is Useful",
    "",
    offer?.problem ??
      "The client needs source-backed Superchain liquidity, volume, fee and market-health evidence.",
    "",
    "## Commercial Angle",
    "",
    offer?.salesAngle ?? serviceLayer.summary,
    "",
    "## Deliverables",
    "",
    ...(offer?.deliverables ?? ["Scope report", "CSV export", "Source audit notes"]).map(
      (item) => `- ${item}`,
    ),
    "",
    "## Acceptance Criteria",
    "",
    ...(offer?.acceptanceCriteria ?? [
      "Metrics are source-linked.",
      "Unavailable values are disclosed.",
      "Client receives exportable evidence.",
    ]).map((item) => `- ${item}`),
    "",
    "## Proof Assets",
    "",
    `- Sample report: ${selectedSampleReport?.title ?? "Not selected"}`,
    `- Export pack: ${selectedExportPack?.title ?? "Not generated"}`,
    `- Outreach lead: ${selectedLead?.protocolName ?? "Not selected"}`,
    "",
    "## Launch Checklist",
    "",
    ...checklist.map((item) => `- ${item.status}: ${item.title} - ${item.detail}`),
    "",
    "## Client Intake",
    "",
    ...intakeQuestions.map((item) => `- ${item}`),
    "",
    "## Terms And Boundaries",
    "",
    ...terms.map((item) => `- ${item}`),
    "",
    "## Next Step",
    "",
    "Confirm scope, delivery format, deadline and payment method. Delivery starts after the scope is confirmed.",
    "",
  ].join("\n");
}

function buildOnboardingEmail({
  offer,
  selectedLead,
  selectedSampleReport,
  status,
  targetProtocol,
}: {
  offer: ServiceOffer | null;
  selectedLead: OutreachLead | null;
  selectedSampleReport: SampleReport | null;
  status: LaunchStatus;
  targetProtocol: string;
}) {
  return [
    `Subject: ${targetProtocol} Superchain liquidity evidence package`,
    "",
    `Hi ${targetProtocol} team,`,
    "",
    "I built Superchain Liquidity Ops, an open-source workflow for source-backed DEX volume, fee, market health and liquidity reporting across the Superchain.",
    "",
    `The package I would suggest is ${offer?.name ?? "a focused evidence package"} (${offer?.priceLabel ?? "quote after scope"}, ${offer?.timeline ?? "timeline after scope"}).`,
    selectedSampleReport
      ? `I can send ${selectedSampleReport.title} as a public delivery sample.`
      : "I can send a public delivery sample before asking you to commit.",
    selectedLead
      ? `Current lead route: ${selectedLead.contactTarget}`
      : "I am looking for the right growth, liquidity, ecosystem or BD owner.",
    "",
    `Current launch status: ${status}.`,
    "",
    "If this is useful, the next step is simple: confirm the target protocol/scope and the report format you want, then I will deliver the report, CSV evidence, source notes and action memo.",
    "",
    "Best,",
    "Dima",
  ].join("\n");
}

function buildDeliveryChecklistMarkdown({
  checklist,
  generatedAt,
  offer,
  status,
  targetProtocol,
}: {
  checklist: LaunchChecklistItem[];
  generatedAt: string;
  offer: ServiceOffer | null;
  status: LaunchStatus;
  targetProtocol: string;
}) {
  return [
    "# Delivery Checklist",
    "",
    `Generated: ${generatedAt}`,
    `Status: ${status}`,
    `Protocol: ${targetProtocol}`,
    `Package: ${offer?.name ?? "Service package"}`,
    "",
    "## Pre-Sale",
    "",
    ...checklist.map((item) => `- [ ] ${item.title}: ${item.detail}`),
    "",
    "## Delivery",
    "",
    "- [ ] Confirm client scope and deadline",
    "- [ ] Refresh live data before final export",
    "- [ ] Generate report Markdown",
    "- [ ] Generate protocol and scope CSV exports",
    "- [ ] Add source limitation notes",
    "- [ ] Send final artifacts and action memo",
    "- [ ] Save follow-up date in CRM",
    "",
  ].join("\n");
}

function buildIntakeQuestions() {
  return [
    "Which protocol, chain, market, or incentive program should be covered?",
    "Who is the reader: growth team, ecosystem team, DAO contributor, LPs, or BD?",
    "What decision should the report support?",
    "What deadline or meeting date should delivery target?",
    "Which metrics matter most: TVL, volume, fees, liquidity depth, incentives, or source audit?",
    "Which public links, dashboards, incentive pages, or docs should be included?",
    "What final format is needed: Markdown, PDF-ready text, CSV, JSON, or all artifacts?",
  ];
}

function buildBuyerFaq() {
  return [
    {
      question: "Is this a smart-contract audit?",
      answer:
        "No. It is analytics, reporting, source audit and liquidity evidence. It does not replace a security audit.",
    },
    {
      question: "Can the numbers be reproduced?",
      answer:
        "Yes. The workflow keeps source URLs, timestamps and unavailable values visible in reports and exports.",
    },
    {
      question: "Can this be a monthly retainer?",
      answer:
        "Yes. Start with a diagnostic, then move to weekly liquidity monitoring if the first report is useful.",
    },
    {
      question: "What happens when a data source is missing?",
      answer:
        "The report marks missing metrics as unavailable instead of filling them with manual guesses.",
    },
  ];
}

function buildTerms() {
  return [
    "Fixed-scope work starts after scope and payment method are confirmed.",
    "Metrics come from public sources and may change between refreshes.",
    "Unavailable data is disclosed instead of estimated without approval.",
    "The deliverable is not financial advice, investment advice, or a security audit.",
    "One revision pass is included unless a different scope is agreed.",
  ];
}
