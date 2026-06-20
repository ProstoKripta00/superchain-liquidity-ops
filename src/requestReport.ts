import type { OutreachLead } from "./outreachPipeline";
import type { SalesKit } from "./salesKit";
import type { ServiceLayer, ServiceOffer } from "./serviceLayer";

export type RequestReportType =
  | "diagnostic"
  | "monitoring"
  | "incentive-evidence"
  | "custom";

export type RequestReportForm = {
  name: string;
  organization: string;
  protocol: string;
  market: string;
  contact: string;
  requestType: RequestReportType;
  urgency: string;
  budget: string;
  evaluationGoal: string;
  deadline: string;
  notes: string;
};

export type RequestReportPack = {
  generatedAt: string;
  title: string;
  summary: string;
  requestMarkdown: string;
  requestJson: string;
  telegramCopy: string;
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
  "$1,500-$3,000",
  "From $1,500/mo",
  "Need quote",
];

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
    name: "",
    organization: selectedLead?.protocolName ?? "",
    protocol,
    market: "",
    contact: selectedLead?.contactUrl ?? selectedLead?.contactTarget ?? "",
    requestType,
    urgency: "This week",
    budget: "$500 pilot",
    evaluationGoal: `Evaluate whether ${protocol} liquidity incentives are creating real DEX outcomes.`,
    deadline: "",
    notes: "",
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
  const name = form.name.trim() || "Not provided";
  const organization = form.organization.trim() || "Not provided";
  const market = form.market.trim() || "Not specified";
  const contact = form.contact.trim() || "Not provided";
  const urgency = form.urgency || form.deadline || "Flexible";
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
    `Name: ${name}`,
    `Organization: ${organization}`,
    `Protocol / client: ${protocol}`,
    `Protocol / market scope: ${market}`,
    `Contact route: ${contact}`,
    `Request type: ${requestTypeLabel}`,
    `Suggested budget: ${budget}`,
    `Accepted payment: OP / USDT / USDC`,
    `Urgency: ${urgency}`,
    "",
    "## Selected Package",
    "",
    `- Package: ${requestTypeLabel}`,
    `- Timeline: ${form.requestType === "diagnostic" ? "7 days" : offer?.timeline ?? salesKit.timeline}`,
    "",
    "## Need",
    "",
    form.evaluationGoal.trim() ||
      "Client wants to evaluate whether liquidity incentives are creating real DEX outcomes.",
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
      name,
      organization,
      protocol,
      market,
      contact,
      urgency,
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
      : "Not selected",
    publicScope: {
      targetProtocol: salesKit.targetProtocol,
      selectedLead: selectedLead?.protocolName ?? "Not selected",
      recommendedOffer: selectedLead?.recommendedOfferName ?? offer?.name ?? "Not selected",
    },
  };
  const requestJson = JSON.stringify(requestPayload, null, 2);
  const telegramCopy = [
    `Request: ${requestTypeLabel} for ${protocol}`,
    `Name: ${name}`,
    `Organization: ${organization}`,
    `Market: ${market}`,
    `Budget: ${budget}`,
    `Accepted payment: OP / USDT / USDC`,
    `Urgency: ${urgency}`,
    `Contact: ${contact}`,
    "",
    form.evaluationGoal.trim() || "Need source-backed OP / Superchain liquidity evidence.",
  ].join("\n");
  const contactRoutes = [
    {
      id: "direct-request",
      label: "Direct request",
      value: "Send the copied request by email, Telegram, X, or Discord",
      note: "Best first step for a paid 7-day report.",
    },
    {
      id: "scope-payment",
      label: "Scope and payment",
      value: "Confirm scope, price, delivery date, token and network before work starts",
      note: "Accepted payment: OP, USDT or USDC. Wallet details are shared after scope confirmation.",
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
    summary: `${requestTypeLabel} request for ${protocol}. Budget ${budget}, urgency ${urgency}.`,
    requestMarkdown,
    requestJson,
    telegramCopy,
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
    return "From $1,500/mo";
  }

  if (priceLabel.includes("$1,500")) {
    return "$1,500-$3,000";
  }

  return priceLabel || "$500 pilot";
}
