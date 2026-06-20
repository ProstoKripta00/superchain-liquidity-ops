import type { OutreachLead } from "./outreachPipeline";
import type { SalesKit } from "./salesKit";
import type { ServiceLayer, ServiceOffer } from "./serviceLayer";

export type RequestReportType =
  | "diagnostic"
  | "monitoring"
  | "incentive-evidence"
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
  { id: "diagnostic", label: "7-day Liquidity Impact Report" },
  { id: "monitoring", label: "Monthly monitoring" },
  { id: "incentive-evidence", label: "Liquidity Evidence Pack" },
  { id: "custom", label: "Custom scope" },
];

export const REQUEST_BUDGETS = [
  "$500 pilot",
  "$750-$1,500",
  "$750-$1,500/mo",
  "$1,500-$3,000",
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
    budget: "$500 pilot",
    notes: `Need a 7-day Liquidity Impact Report for ${protocol}: OP / Superchain volume, fees, weak markets, source audit, CSV evidence, PDF report, and next actions.`,
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
    "Confirm the report format: PDF report, CSV evidence and source audit.",
    "Refresh live data before final delivery.",
    "Disclose unavailable metrics and source limitations.",
    "Confirm whether a 30-minute review call is needed.",
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
    `- Package: ${requestTypeLabel}`,
    `- Timeline: ${form.requestType === "diagnostic" ? "7 days" : offer?.timeline ?? salesKit.timeline}`,
    "",
    "## Need",
    "",
    form.notes.trim() || "Client wants a source-backed OP / Superchain liquidity impact report.",
    "",
    "## Deliverables",
    "",
    ...(form.requestType === "diagnostic"
      ? [
          "PDF liquidity impact report",
          "CSV evidence",
          "Source audit",
          "Weak-market watchlist",
          "3-5 next actions",
        ]
      : offer?.deliverables ?? ["PDF report", "CSV export", "Source notes"]).map(
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
    publicScope: {
      targetProtocol: salesKit.targetProtocol,
      selectedLead: selectedLead?.protocolName ?? null,
      recommendedOffer: selectedLead?.recommendedOfferName ?? offer?.name ?? null,
    },
  };
  const requestJson = JSON.stringify(requestPayload, null, 2);
  const telegramCopy = [
    `Request: ${requestTypeLabel} for ${protocol}`,
    `Budget: ${budget}`,
    `Deadline: ${deadline}`,
    `Contact: ${contact}`,
    "",
    form.notes.trim() || "Need source-backed OP / Superchain liquidity evidence.",
  ].join("\n");
  const githubIssueUrl = `${ISSUE_REPO_URL}?title=${encodeURIComponent(
    title,
  )}&body=${encodeURIComponent(requestMarkdown)}`;
  const contactRoutes = [
    {
      id: "github-issue",
      label: "Public request",
      value: "Open a structured public request",
      href: githubIssueUrl,
      note: "Use only when the buyer is comfortable with a public scope.",
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

  if (offer.id === "incentive-evidence-pack") {
    return "incentive-evidence";
  }

  return "diagnostic";
}

function normalizeBudget(priceLabel: string) {
  if (priceLabel.includes("$750")) {
    return "$750-$1,500";
  }

  if (priceLabel.includes("/mo")) {
    return "$750-$1,500/mo";
  }

  if (priceLabel.includes("$1,500")) {
    return "$1,500-$3,000";
  }

  return priceLabel || "$500 pilot";
}
