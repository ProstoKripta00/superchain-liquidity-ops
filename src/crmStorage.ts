import {
  CONTACT_CHANNELS,
  CONTACT_ENRICHMENT_STATUSES,
  type ContactChannel,
  type ContactEnrichmentStatus,
  type LeadStatus,
  type OutreachCrmRecord,
  type PitchVariantId,
} from "./outreachPipeline";

export type OutreachCrmRecords = Record<string, OutreachCrmRecord>;

const STORAGE_KEY = "superchain-liquidity-ops.outreach-crm.v1";
const leadStatuses: LeadStatus[] = [
  "New",
  "Ready to contact",
  "Contacted",
  "Replied",
  "Won",
  "Lost",
];
const pitchIds: PitchVariantId[] = ["dm", "email", "follow-up"];

export function loadOutreachCrmRecords(): OutreachCrmRecords {
  if (!canUseLocalStorage()) {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed)
        .map(([leadId, record]) => [leadId, sanitizeRecord(record)])
        .filter((entry): entry is [string, OutreachCrmRecord] => Boolean(entry[1])),
    );
  } catch {
    return {};
  }
}

export function saveOutreachCrmRecords(records: OutreachCrmRecords) {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function updateOutreachCrmRecord(
  records: OutreachCrmRecords,
  leadId: string,
  patch: OutreachCrmRecord,
): OutreachCrmRecords {
  const nextRecord = sanitizeRecord({
    ...records[leadId],
    ...patch,
    updatedAt: new Date().toISOString(),
  });

  if (!nextRecord) {
    const { [leadId]: _removed, ...rest } = records;
    return rest;
  }

  return {
    ...records,
    [leadId]: nextRecord,
  };
}

function sanitizeRecord(record: unknown): OutreachCrmRecord | null {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return null;
  }

  const source = record as Record<string, unknown>;
  const status = typeof source.status === "string" && isLeadStatus(source.status)
    ? source.status
    : undefined;
  const selectedPitchId =
    typeof source.selectedPitchId === "string" && isPitchId(source.selectedPitchId)
      ? source.selectedPitchId
      : undefined;
  const sanitized: OutreachCrmRecord = {
    contactChannel:
      typeof source.contactChannel === "string" && isContactChannel(source.contactChannel)
        ? source.contactChannel
        : undefined,
    contactName: sanitizeText(source.contactName),
    contactUrl: sanitizeUrl(source.contactUrl),
    enrichmentConfidence: sanitizeConfidence(source.enrichmentConfidence),
    enrichmentStatus:
      typeof source.enrichmentStatus === "string" &&
      isContactEnrichmentStatus(source.enrichmentStatus)
        ? source.enrichmentStatus
        : undefined,
    lastContacted: sanitizeDate(source.lastContacted),
    nextFollowUp: sanitizeDate(source.nextFollowUp),
    notes: sanitizeText(source.notes),
    selectedPitchId,
    status,
    updatedAt: sanitizeText(source.updatedAt),
  };

  const hasValue = Object.values(sanitized).some((value) => value !== undefined);
  return hasValue ? sanitized : null;
}

function sanitizeText(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 2000) : undefined;
}

function sanitizeDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }

  return value;
}

function sanitizeUrl(value: unknown) {
  const sanitized = sanitizeText(value);

  if (!sanitized) {
    return undefined;
  }

  if (!/^https?:\/\/\S+$/i.test(sanitized)) {
    return undefined;
  }

  return sanitized.slice(0, 500);
}

function sanitizeConfidence(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  return Math.min(100, Math.max(0, Math.round(value)));
}

function isLeadStatus(value: string): value is LeadStatus {
  return leadStatuses.includes(value as LeadStatus);
}

function isPitchId(value: string): value is PitchVariantId {
  return pitchIds.includes(value as PitchVariantId);
}

function isContactChannel(value: string): value is ContactChannel {
  return CONTACT_CHANNELS.includes(value as ContactChannel);
}

function isContactEnrichmentStatus(
  value: string,
): value is ContactEnrichmentStatus {
  return CONTACT_ENRICHMENT_STATUSES.includes(value as ContactEnrichmentStatus);
}

function canUseLocalStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}
