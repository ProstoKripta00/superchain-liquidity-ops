import type { OutreachLead } from "./outreachPipeline";
import type { RequestReportForm, RequestReportPack } from "./requestReport";
import type { ServiceLayer, ServiceOffer } from "./serviceLayer";
import { SUPERCHAIN_NETWORKS } from "./sources";

export type IntakeMetricId =
  | "tvl"
  | "volume"
  | "fees"
  | "liquidity-depth"
  | "incentives"
  | "source-audit";

export type IntakeDecisionId =
  | "growth-budget"
  | "incentive-review"
  | "lp-update"
  | "protocol-monitoring"
  | "custom";

export type IntakeStatus = "Draft" | "Ready" | "Needs scope";

export type IntakeFormState = {
  protocolName: string;
  teamName: string;
  contactName: string;
  contactRoute: string;
  role: string;
  decision: IntakeDecisionId;
  chains: string[];
  metrics: IntakeMetricId[];
  deliverableFormat: string;
  deadline: string;
  budget: string;
  sourceLinks: string;
  notes: string;
  publicIssueOk: boolean;
};

export type IntakeRecord = IntakeFormState & {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: IntakeStatus;
  title: string;
};

export type IntakePack = {
  generatedAt: string;
  title: string;
  summary: string;
  status: IntakeStatus;
  missingFields: string[];
  intakeMarkdown: string;
  publicIssueMarkdown: string;
  intakeJson: string;
  telegramCopy: string;
  githubIssueUrl: string;
  nextSteps: string[];
};

export const INTAKE_CHAIN_OPTIONS = [...SUPERCHAIN_NETWORKS];

export const INTAKE_METRIC_OPTIONS: Array<{ id: IntakeMetricId; label: string }> = [
  { id: "tvl", label: "TVL" },
  { id: "volume", label: "DEX volume" },
  { id: "fees", label: "Fees" },
  { id: "liquidity-depth", label: "Liquidity depth" },
  { id: "incentives", label: "Incentives" },
  { id: "source-audit", label: "Source audit" },
];

export const INTAKE_DECISIONS: Array<{ id: IntakeDecisionId; label: string }> = [
  { id: "growth-budget", label: "Growth budget decision" },
  { id: "incentive-review", label: "DAO / incentive evidence" },
  { id: "lp-update", label: "LP / stakeholder update" },
  { id: "protocol-monitoring", label: "Protocol monitoring" },
  { id: "custom", label: "Custom decision" },
];

export const INTAKE_DELIVERABLE_FORMATS = [
  "Markdown report + CSV",
  "Full export pack",
  "JSON handoff",
  "Weekly monitoring memo",
  "Custom",
];

export const INTAKE_BUDGETS = [
  "$750-$1,500",
  "$1,000-$2,500/mo",
  "$2,000-$4,000",
  "Need quote",
];

const STORAGE_KEY = "superchain-liquidity-ops.intake-records.v1";
const ISSUE_REPO_URL =
  "https://github.com/ProstoKripta00/superchain-liquidity-ops/issues/new";
const MAX_RECORDS = 24;

export function buildDefaultIntakeForm({
  network,
  requestForm,
  selectedLead,
  selectedOffer,
  target,
}: {
  network: string;
  requestForm: RequestReportForm;
  selectedLead: OutreachLead | null;
  selectedOffer: ServiceOffer | null;
  target: string;
}): IntakeFormState {
  const chains = network === "All" ? ["OP Mainnet", "Base"] : [network];

  return {
    protocolName: requestForm.protocol,
    teamName: selectedLead?.protocolName ?? requestForm.protocol,
    contactName: selectedLead?.contactName ?? "",
    contactRoute: selectedLead?.contactUrl || requestForm.contact,
    role: selectedLead ? "Growth / liquidity owner" : "Founder / growth / ecosystem",
    decision:
      selectedOffer?.id === "incentive-evidence-pack" ? "incentive-review" : "growth-budget",
    chains,
    metrics: defaultMetrics(target),
    deliverableFormat:
      selectedOffer?.id === "monitoring-retainer"
        ? "Weekly monitoring memo"
        : "Markdown report + CSV",
    deadline: requestForm.deadline,
    budget: requestForm.budget,
    sourceLinks: selectedLead?.sourceUrls.join("\n") ?? "",
    notes: requestForm.notes,
    publicIssueOk: false,
  };
}

export function buildIntakePack({
  form,
  requestPack,
  selectedLead,
  selectedOffer,
  serviceLayer,
}: {
  form: IntakeFormState;
  requestPack: RequestReportPack;
  selectedLead: OutreachLead | null;
  selectedOffer: ServiceOffer | null;
  serviceLayer: ServiceLayer;
}): IntakePack {
  const generatedAt = new Date().toISOString();
  const offer = selectedOffer ?? serviceLayer.offers[0] ?? null;
  const protocol = form.protocolName.trim() || "Protocol not set";
  const contactRoute = form.contactRoute.trim() || "Not provided";
  const decisionLabel = labelForDecision(form.decision);
  const metrics = form.metrics.map(labelForMetric);
  const chains = form.chains.length > 0 ? form.chains : ["Not selected"];
  const sourceLinks = splitLines(form.sourceLinks);
  const missingFields = buildMissingFields(form);
  const status = missingFields.length === 0 ? "Ready" : missingFields.length <= 2 ? "Needs scope" : "Draft";
  const title = `${protocol} intake form`;
  const nextSteps = [
    "Confirm whether the scope is public or private before opening a public request.",
    "Refresh live Superchain data before preparing the final report.",
    "Confirm payment method and deadline outside the public dashboard.",
    "Deliver Markdown, CSV and JSON artifacts from the same live snapshot.",
  ];
  const intakeMarkdown = [
    "# Client Intake Form",
    "",
    `Generated: ${generatedAt}`,
    `Status: ${status}`,
    `Project: Superchain Liquidity Ops`,
    "",
    "## Client",
    "",
    `- Protocol / project: ${protocol}`,
    `- Team / company: ${form.teamName.trim() || "Not provided"}`,
    `- Contact name: ${form.contactName.trim() || "Not provided"}`,
    `- Contact route: ${contactRoute}`,
    `- Role: ${form.role.trim() || "Not provided"}`,
    "",
    "## Scope",
    "",
    `- Decision supported: ${decisionLabel}`,
    `- Chains: ${chains.join(", ")}`,
    `- Metrics: ${metrics.join(", ") || "Not selected"}`,
    `- Deliverable format: ${form.deliverableFormat}`,
    `- Deadline: ${form.deadline || "Flexible"}`,
    `- Budget: ${form.budget || "Need quote"}`,
    "",
    "## Source Links",
    "",
    ...(sourceLinks.length > 0 ? sourceLinks.map((link) => `- ${link}`) : ["- Not provided"]),
    "",
    "## Notes",
    "",
    form.notes.trim() || "No extra notes provided.",
    "",
    "## Selected Service Context",
    "",
    `- Request pack: ${requestPack.title}`,
    `- Offer: ${offer?.name ?? "Not selected"}`,
    `- Offer price: ${offer?.priceLabel ?? "Need quote"}`,
    `- Lead: ${selectedLead?.protocolName ?? "Not selected"}`,
    "",
    "## Missing Fields",
    "",
    ...(missingFields.length > 0 ? missingFields.map((field) => `- ${field}`) : ["- None"]),
    "",
    "## Next Steps",
    "",
    ...nextSteps.map((item) => `- ${item}`),
    "",
  ].join("\n");
  const publicIssueMarkdown = [
    "# Public Intake Scope",
    "",
    `Generated: ${generatedAt}`,
    `Protocol / project: ${protocol}`,
    `Decision supported: ${decisionLabel}`,
    `Chains: ${chains.join(", ")}`,
    `Metrics: ${metrics.join(", ") || "Not selected"}`,
    `Deliverable format: ${form.deliverableFormat}`,
    `Deadline: ${form.deadline || "Flexible"}`,
    `Budget: ${form.budget || "Need quote"}`,
    "",
    "## Public Notes",
    "",
    form.notes.trim() || "No public notes provided.",
    "",
    "## Source Links",
    "",
    ...(sourceLinks.length > 0 ? sourceLinks.map((link) => `- ${link}`) : ["- Not provided"]),
    "",
    "Private contact details should be sent outside the public issue if needed.",
    "",
  ].join("\n");
  const intakeJson = JSON.stringify(
    {
      generatedAt,
      status,
      title,
      form,
      selectedOffer: offer
        ? {
            id: offer.id,
            name: offer.name,
            priceLabel: offer.priceLabel,
            timeline: offer.timeline,
          }
        : null,
      selectedLead: selectedLead
        ? {
            id: selectedLead.id,
            protocolName: selectedLead.protocolName,
            status: selectedLead.status,
            contactChannel: selectedLead.contactChannel,
            enrichmentStatus: selectedLead.enrichmentStatus,
          }
        : null,
      missingFields,
      nextSteps,
    },
    null,
    2,
  );
  const telegramCopy = [
    `Intake: ${protocol}`,
    `Decision: ${decisionLabel}`,
    `Chains: ${chains.join(", ")}`,
    `Metrics: ${metrics.join(", ") || "Not selected"}`,
    `Format: ${form.deliverableFormat}`,
    `Budget: ${form.budget || "Need quote"}`,
    `Deadline: ${form.deadline || "Flexible"}`,
    "",
    form.notes.trim() || "Need a Superchain liquidity report.",
  ].join("\n");
  const githubIssueUrl = `${ISSUE_REPO_URL}?title=${encodeURIComponent(
    title,
  )}&body=${encodeURIComponent(publicIssueMarkdown)}`;

  return {
    generatedAt,
    title,
    summary: `${status}: ${protocol} / ${decisionLabel} / ${form.budget || "Need quote"}.`,
    status,
    missingFields,
    intakeMarkdown,
    publicIssueMarkdown,
    intakeJson,
    telegramCopy,
    githubIssueUrl,
    nextSteps,
  };
}

export function loadIntakeRecords(): IntakeRecord[] {
  if (!canUseLocalStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map(sanitizeRecord)
      .filter((record): record is IntakeRecord => Boolean(record))
      .slice(0, MAX_RECORDS);
  } catch {
    return [];
  }
}

export function saveIntakeRecords(records: IntakeRecord[]) {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(records.slice(0, MAX_RECORDS)),
  );
}

export function upsertIntakeRecord({
  existingId,
  form,
  pack,
  records,
}: {
  existingId: string | null;
  form: IntakeFormState;
  pack: IntakePack;
  records: IntakeRecord[];
}) {
  const now = new Date().toISOString();
  const existing = existingId
    ? records.find((record) => record.id === existingId)
    : null;
  const record: IntakeRecord = {
    ...form,
    id: existing?.id ?? createIntakeId(),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    status: pack.status,
    title: pack.title,
  };
  const nextRecords = [
    record,
    ...records.filter((item) => item.id !== record.id),
  ].slice(0, MAX_RECORDS);

  return {
    record,
    records: nextRecords,
  };
}

export function removeIntakeRecord(records: IntakeRecord[], recordId: string) {
  return records.filter((record) => record.id !== recordId);
}

export function recordsToJson(records: IntakeRecord[]) {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      product: "Superchain Liquidity Ops",
      records,
    },
    null,
    2,
  );
}

function defaultMetrics(target: string): IntakeMetricId[] {
  if (target === "Improve fee efficiency") {
    return ["fees", "volume", "source-audit"];
  }

  if (target === "Grow TVL") {
    return ["tvl", "volume", "liquidity-depth"];
  }

  if (target === "Monitor incentives") {
    return ["incentives", "volume", "fees"];
  }

  return ["tvl", "volume", "fees"];
}

function buildMissingFields(form: IntakeFormState) {
  const missing: string[] = [];

  if (!form.protocolName.trim()) {
    missing.push("Protocol / project");
  }

  if (!form.contactRoute.trim()) {
    missing.push("Contact route");
  }

  if (form.chains.length === 0) {
    missing.push("Chains");
  }

  if (form.metrics.length === 0) {
    missing.push("Metric focus");
  }

  if (!form.deliverableFormat.trim()) {
    missing.push("Deliverable format");
  }

  return missing;
}

function splitLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function labelForMetric(metric: IntakeMetricId) {
  return (
    INTAKE_METRIC_OPTIONS.find((item) => item.id === metric)?.label ?? metric
  );
}

function labelForDecision(decision: IntakeDecisionId) {
  return (
    INTAKE_DECISIONS.find((item) => item.id === decision)?.label ?? "Custom decision"
  );
}

function sanitizeRecord(record: unknown): IntakeRecord | null {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return null;
  }

  const source = record as Record<string, unknown>;
  const form = sanitizeForm(source);
  const id = sanitizeText(source.id, 120) ?? createIntakeId();
  const createdAt = sanitizeText(source.createdAt, 80) ?? new Date().toISOString();
  const updatedAt = sanitizeText(source.updatedAt, 80) ?? createdAt;
  const status = isIntakeStatus(source.status) ? source.status : "Draft";

  return {
    ...form,
    id,
    createdAt,
    updatedAt,
    status,
    title: sanitizeText(source.title, 180) ?? `${form.protocolName} intake form`,
  };
}

function sanitizeForm(source: Record<string, unknown>): IntakeFormState {
  return {
    protocolName: sanitizeText(source.protocolName, 180) ?? "",
    teamName: sanitizeText(source.teamName, 180) ?? "",
    contactName: sanitizeText(source.contactName, 180) ?? "",
    contactRoute: sanitizeText(source.contactRoute, 500) ?? "",
    role: sanitizeText(source.role, 180) ?? "",
    decision: isDecision(source.decision) ? source.decision : "custom",
    chains: sanitizeStringArray(source.chains, INTAKE_CHAIN_OPTIONS),
    metrics: sanitizeStringArray(source.metrics, INTAKE_METRIC_OPTIONS.map((item) => item.id)),
    deliverableFormat:
      sanitizeOption(source.deliverableFormat, INTAKE_DELIVERABLE_FORMATS) ??
      "Markdown report + CSV",
    deadline: sanitizeDate(source.deadline) ?? "",
    budget: sanitizeOption(source.budget, INTAKE_BUDGETS) ?? "Need quote",
    sourceLinks: sanitizeText(source.sourceLinks, 2000) ?? "",
    notes: sanitizeText(source.notes, 3000) ?? "",
    publicIssueOk: source.publicIssueOk === true,
  };
}

function sanitizeStringArray<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is T => typeof item === "string" && allowed.includes(item as T));
}

function sanitizeOption<T extends string>(value: unknown, allowed: readonly T[]) {
  if (typeof value !== "string") {
    return undefined;
  }

  return allowed.includes(value as T) ? (value as T) : undefined;
}

function sanitizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, maxLength) : undefined;
}

function sanitizeDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }

  return value;
}

function isDecision(value: unknown): value is IntakeDecisionId {
  return (
    typeof value === "string" &&
    INTAKE_DECISIONS.some((decision) => decision.id === value)
  );
}

function isIntakeStatus(value: unknown): value is IntakeStatus {
  return value === "Draft" || value === "Ready" || value === "Needs scope";
}

function createIntakeId() {
  return `intake-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function canUseLocalStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}
