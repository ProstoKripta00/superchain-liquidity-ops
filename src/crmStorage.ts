import type { LeadStatus, OutreachCrmRecord, PitchVariantId } from "./outreachPipeline";

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

function isLeadStatus(value: string): value is LeadStatus {
  return leadStatuses.includes(value as LeadStatus);
}

function isPitchId(value: string): value is PitchVariantId {
  return pitchIds.includes(value as PitchVariantId);
}

function canUseLocalStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}
