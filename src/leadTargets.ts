import type { OutreachLead, OutreachPipeline } from "./outreachPipeline";

export type LeadTargetTier = "A - pitch now" | "B - enrich next" | "C - monitor";

export type LeadTarget = {
  cashAngle: string;
  channel: string;
  contactRoute: string;
  contactUrl: string;
  firstMessage: string;
  id: string;
  nextAction: string;
  priceLabel: string;
  protocolName: string;
  rank: number;
  reason: string;
  recommendedOfferName: string;
  sourceUrls: string[];
  status: string;
  tier: LeadTargetTier;
  urgencyScore: number;
  valueSignal: string;
};

export type LeadTargetList = {
  csv: string;
  generatedAt: string;
  json: string;
  markdown: string;
  pitchNowCount: number;
  enrichNextCount: number;
  monitorCount: number;
  summary: string;
  targets: LeadTarget[];
  topTargetCount: number;
};

export function buildLeadTargetList({
  limit = 8,
  pipeline,
}: {
  limit?: number;
  pipeline: OutreachPipeline;
}): LeadTargetList {
  const generatedAt = new Date().toISOString();
  const targets = pipeline.leads
    .map((lead) => buildLeadTarget(lead))
    .sort((left, right) => right.urgencyScore - left.urgencyScore)
    .slice(0, limit)
    .map((target, index) => ({
      ...target,
      rank: index + 1,
    }));
  const pitchNowCount = targets.filter((target) => target.tier === "A - pitch now").length;
  const enrichNextCount = targets.filter((target) => target.tier === "B - enrich next").length;
  const monitorCount = targets.filter((target) => target.tier === "C - monitor").length;
  const summary = `${targets.length} priority lead targets, ${pitchNowCount} ready to pitch and ${enrichNextCount} needing contact enrichment.`;
  const markdown = buildLeadTargetsMarkdown(generatedAt, summary, targets);
  const csv = buildLeadTargetsCsv(targets);
  const json = JSON.stringify(
    {
      generatedAt,
      product: "Superchain Liquidity Ops",
      scope: pipeline.scopeLabel,
      summary,
      targets,
    },
    null,
    2,
  );

  return {
    csv,
    generatedAt,
    json,
    markdown,
    pitchNowCount,
    enrichNextCount,
    monitorCount,
    summary,
    targets,
    topTargetCount: targets.length,
  };
}

function buildLeadTarget(lead: OutreachLead): LeadTarget {
  const tier = classifyLeadTier(lead);
  const urgencyScore = scoreLeadUrgency(lead, tier);
  const firstPitch = lead.pitches.find((pitch) => pitch.id === lead.selectedPitchId) ??
    lead.pitches[0] ??
    null;

  return {
    cashAngle: buildCashAngle(lead),
    channel: lead.contactChannel,
    contactRoute: lead.contactName
      ? `${lead.contactName} via ${lead.contactChannel}`
      : lead.contactTarget,
    contactUrl: lead.contactUrl,
    firstMessage: firstPitch?.body ?? "Select a pitch variant in Outreach.",
    id: lead.id,
    nextAction: buildTargetNextAction(lead, tier),
    priceLabel: lead.priceLabel,
    protocolName: lead.protocolName,
    rank: lead.priority,
    reason: lead.reason,
    recommendedOfferName: lead.recommendedOfferName,
    sourceUrls: lead.sourceUrls.slice(0, 3),
    status: lead.status,
    tier,
    urgencyScore,
    valueSignal: lead.valueSignal,
  };
}

function classifyLeadTier(lead: OutreachLead): LeadTargetTier {
  if (
    lead.status === "Ready to contact" &&
    lead.score >= 65 &&
    lead.enrichmentStatus !== "Needs verification"
  ) {
    return "A - pitch now";
  }

  if (
    lead.status === "New" ||
    lead.enrichmentStatus === "Not started" ||
    lead.enrichmentStatus === "Researching" ||
    lead.enrichmentStatus === "Needs verification"
  ) {
    return "B - enrich next";
  }

  return "C - monitor";
}

function scoreLeadUrgency(lead: OutreachLead, tier: LeadTargetTier) {
  const tierWeight =
    tier === "A - pitch now" ? 30 : tier === "B - enrich next" ? 14 : 4;
  const statusWeight =
    lead.status === "Ready to contact"
      ? 18
      : lead.status === "Replied"
        ? 16
        : lead.status === "Contacted"
          ? 10
          : lead.status === "New"
            ? 8
            : 0;
  const enrichmentWeight =
    lead.enrichmentStatus === "Contact found"
      ? 12
      : lead.enrichmentStatus === "Researching"
        ? 6
        : lead.enrichmentStatus === "Needs verification"
          ? 3
          : 0;

  return Math.min(
    100,
    Math.round(lead.score * 0.55 + tierWeight + statusWeight + enrichmentWeight),
  );
}

function buildCashAngle(lead: OutreachLead) {
  return `Pitch ${lead.recommendedOfferName} at ${lead.priceLabel}; lead with ${lead.valueSignal}`;
}

function buildTargetNextAction(lead: OutreachLead, tier: LeadTargetTier) {
  if (tier === "A - pitch now") {
    return lead.contactUrl
      ? "Send the selected pitch and save the contacted date in CRM."
      : "Send only after confirming the official contact route from the candidate links.";
  }

  if (tier === "B - enrich next") {
    return "Find the official growth, BD, grants, or liquidity owner before pitching.";
  }

  if (lead.status === "Contacted") {
    return "Wait for the follow-up date, then send the follow-up pitch if there is no reply.";
  }

  return "Keep monitoring scanner score, fee visibility and weak-market signals.";
}

function buildLeadTargetsMarkdown(
  generatedAt: string,
  summary: string,
  targets: LeadTarget[],
) {
  return [
    "# Superchain Lead Target List",
    "",
    `Generated: ${generatedAt}`,
    summary,
    "",
    "## Priority Targets",
    "",
    ...targets.flatMap((target) => [
      `### ${target.rank}. ${target.protocolName}`,
      "",
      `- Tier: ${target.tier}`,
      `- Urgency score: ${target.urgencyScore}/100`,
      `- Status: ${target.status}`,
      `- Offer: ${target.recommendedOfferName} (${target.priceLabel})`,
      `- Contact route: ${target.contactRoute}`,
      `- Contact URL: ${target.contactUrl || "Not confirmed"}`,
      `- Value signal: ${target.valueSignal}`,
      `- Cash angle: ${target.cashAngle}`,
      `- Next action: ${target.nextAction}`,
      "",
    ]),
  ].join("\n");
}

function buildLeadTargetsCsv(targets: LeadTarget[]) {
  const header = [
    "rank",
    "protocol",
    "tier",
    "urgencyScore",
    "status",
    "offer",
    "price",
    "channel",
    "contactRoute",
    "contactUrl",
    "valueSignal",
    "cashAngle",
    "nextAction",
  ];
  const rows = targets.map((target) =>
    [
      String(target.rank),
      target.protocolName,
      target.tier,
      String(target.urgencyScore),
      target.status,
      target.recommendedOfferName,
      target.priceLabel,
      target.channel,
      target.contactRoute,
      target.contactUrl,
      target.valueSignal,
      target.cashAngle,
      target.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return [header.join(","), ...rows].join("\n");
}

function csvCell(value: string) {
  if (!/[",\n]/.test(value)) {
    return value;
  }

  return `"${value.replace(/"/g, '""')}"`;
}
