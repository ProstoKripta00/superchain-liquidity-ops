import type { OutreachLead } from "./outreachPipeline";
import type { SalesKit } from "./salesKit";
import type { ServiceLayer, ServiceOffer } from "./serviceLayer";

export type RequestReportType =
  | "diagnostic"
  | "monitoring"
  | "grant-evidence"
  | "custom";

export type RequestReportForm = {
  protocol: string;
  contact: string;
  requestType: RequestReportType;
  deadline: string;
  budget: string;
  notes: string;
};

export type RequestReportPack = {
  generatedAt: string;
  title: string;
  summary: string;
  requestMarkdown: string;
  requestJson: string;
  telegramCopy: string;
  githubIssueUrl: string;
  contactRoutes: Array<{
    id: string;
    label: string;
    value: string;
    href?: string;
    note: string;
  }>;
  intakeChecklist: string[];
};

export const REQUEST_TYPES: Array<{ id: RequestReportType; label: string }> = [
  { id: "diagnostic", label: "Protocol diagnostic" },
  { id: "monitoring", label: "Monitoring retainer" },
  { id: "grant-evidence", label: "Grant evidence pack" },
  { id: "custom", label: "Custom scope" },
];

export const REQUEST_BUDGETS = [
  "$750-$1,500",
  "$1,000-$2,500/mo",
  "$2,000-$4,000",
  "Need quote",
];

const ISSUE_REPO_URL =
  "https://github.com/ProstoKripta00/superchain-liquidity-ops/issues/new";

export function buildDefaultRequestReportForm({
  salesKit,
  selectedLead,
  selectedOffer,
}: {
  salesKit: SalesKit;
  selectedLead: OutreachLead | null;
  selectedOffer: ServiceOffer | null;
}): RequestReportForm {
  const protocol = selectedLead?.protocolName ?? salesKit.targetProtocol;
  const requestType = mapOfferToRequestType(selectedOffer);

  return {
    protocol,
    contact: selectedLead?.contactUrl ?? selectedLead?.contactTarget ?? "",
    requestType,
    deadline: "",
    budget: normalizeBudget(selectedOffer?.priceLabel ?? salesKit.priceLabel),
    notes: `Need ${selectedOffer?.name ?? salesKit.packageName} for ${protocol}.`,
  };
}

export function buildRequestReportPack({
  form,
  salesKit,
  selectedLead,
  selectedOffer,
  serviceLayer,
}: {
  form: RequestReportForm;
  salesKit: SalesKit;
  selectedLead: OutreachLead | null;
  selectedOffer: ServiceOffer | null;
  serviceLayer: ServiceLayer;
}): RequestReportPack {
  const generatedAt = new Date().toISOString();
  const offer = selectedOffer ?? serviceLayer.offers[0] ?? null;
  const requestTypeLabel =
    REQUEST_TYPES.find((item) => item.id === form.requestType)?.label ?? "Custom scope";
  const protocol = form.protocol.trim() || salesKit.targetProtocol;
  const contact = form.contact.trim() || "Not provided";
  const deadline = form.deadline || "Flexible";
  const budget = form.budget || offer?.priceLabel || salesKit.priceLabel;
  const title = `${protocol} ${requestTypeLabel} request`;
  const intakeChecklist = [
    "Confirm the protocol, chain, market scope and reader.",
    "Confirm the report format: Markdown, CSV, JSON, or full export pack.",
    "Refresh live data before final delivery.",
    "Disclose unavailable metrics and source limitations.",
    "Send the final artifacts only after scope and payment terms are confirmed.",
  ];
  const requestMarkdown = [
    "# Request Report",
    "",
    `Generated: ${generatedAt}`,
    `Project: Superchain Liquidity Ops`,
    `Protocol / client: ${protocol}`,
    `Contact route: ${contact}`,
    `Request type: ${requestTypeLabel}`,
    `Suggested budget: ${budget}`,
    `Target deadline: ${deadline}`,
    "",
    "## Selected Package",
    "",
    `- Package: ${offer?.name ?? salesKit.packageName}`,
    `- Timeline: ${offer?.timeline ?? salesKit.timeline}`,
    `- Launch status: ${salesKit.status}`,
    `- Readiness score: ${salesKit.readinessScore}/100`,
    "",
    "## Need",
    "",
    form.notes.trim() || "Client wants a source-backed Superchain liquidity report.",
    "",
    "## Deliverables",
    "",
    ...(offer?.deliverables ?? ["Markdown report", "CSV export", "Source notes"]).map(
      (item) => `- ${item}`,
    ),
    "",
    "## Acceptance Criteria",
    "",
    ...(offer?.acceptanceCriteria ?? [
      "Metrics are source-linked.",
      "Unavailable values are disclosed.",
      "Report can be exported and reviewed.",
    ]).map((item) => `- ${item}`),
    "",
    "## Intake Checklist",
    "",
    ...intakeChecklist.map((item) => `- [ ] ${item}`),
    "",
    "## Lead Context",
    "",
    `- Selected lead: ${selectedLead?.protocolName ?? "Not selected"}`,
    `- Lead status: ${selectedLead?.status ?? "Not selected"}`,
    `- Contact confidence: ${
      selectedLead ? `${selectedLead.enrichmentConfidence}/100` : "Not selected"
    }`,
    `- Recommended offer: ${selectedLead?.recommendedOfferName ?? "Not selected"}`,
    "",
  ].join("\n");
  const requestPayload = {
    generatedAt,
    product: "Superchain Liquidity Ops",
    title,
    form: {
      ...form,
      protocol,
      contact,
      deadline,
      budget,
      requestTypeLabel,
    },
    selectedPackage: offer
      ? {
          id: offer.id,
          name: offer.name,
          priceLabel: offer.priceLabel,
          timeline: offer.timeline,
          deliverables: offer.deliverables,
          acceptanceCriteria: offer.acceptanceCriteria,
        }
      : null,
    launch: {
      status: salesKit.status,
      readinessScore: salesKit.readinessScore,
      targetProtocol: salesKit.targetProtocol,
    },
    lead: selectedLead
      ? {
          id: selectedLead.id,
          protocolName: selectedLead.protocolName,
          status: selectedLead.status,
          contactTarget: selectedLead.contactTarget,
          contactUrl: selectedLead.contactUrl,
          enrichmentStatus: selectedLead.enrichmentStatus,
          enrichmentConfidence: selectedLead.enrichmentConfidence,
        }
      : null,
  };
  const requestJson = JSON.stringify(requestPayload, null, 2);
  const telegramCopy = [
    `Request: ${requestTypeLabel} for ${protocol}`,
    `Budget: ${budget}`,
    `Deadline: ${deadline}`,
    `Contact: ${contact}`,
    "",
    form.notes.trim() || "Need source-backed Superchain liquidity evidence.",
  ].join("\n");
  const githubIssueUrl = `${ISSUE_REPO_URL}?title=${encodeURIComponent(
    title,
  )}&body=${encodeURIComponent(requestMarkdown)}`;
  const contactRoutes = [
    {
      id: "github-issue",
      label: "GitHub issue",
      value: "Open a structured request in the public repository",
      href: githubIssueUrl,
      note: "Best route for public scope, questions and reproducible delivery notes.",
    },
    {
      id: "github-profile",
      label: "GitHub profile",
      value: "github.com/ProstoKripta00",
      href: "https://github.com/ProstoKripta00",
      note: "Use this when a client wants to inspect the builder profile first.",
    },
    {
      id: "manual-copy",
      label: "Manual copy",
      value: "Copy request text or Telegram text from this section",
      note: "Use for Telegram, X DM, email or a private client channel.",
    },
  ];

  return {
    generatedAt,
    title,
    summary: `${requestTypeLabel} request for ${protocol}. Budget ${budget}, deadline ${deadline}.`,
    requestMarkdown,
    requestJson,
    telegramCopy,
    githubIssueUrl,
    contactRoutes,
    intakeChecklist,
  };
}

function mapOfferToRequestType(offer: ServiceOffer | null): RequestReportType {
  if (!offer) {
    return "diagnostic";
  }

  if (offer.id === "monitoring-retainer") {
    return "monitoring";
  }

  if (offer.id === "grant-evidence-pack") {
    return "grant-evidence";
  }

  return "diagnostic";
}

function normalizeBudget(priceLabel: string) {
  if (priceLabel.includes("$750")) {
    return "$750-$1,500";
  }

  if (priceLabel.includes("/mo")) {
    return "$1,000-$2,500/mo";
  }

  if (priceLabel.includes("$2,000")) {
    return "$2,000-$4,000";
  }

  return priceLabel || "Need quote";
}
