import type { ServiceLayer, ServiceOffer, ServiceOfferId } from "./serviceLayer";
import type {
  DexMarket,
  MarketScopeMetrics,
  NetworkScope,
  OutcomeTarget,
  ProtocolScan,
} from "./types";

export type LeadStatus =
  | "New"
  | "Ready to contact"
  | "Contacted"
  | "Replied"
  | "Won"
  | "Lost";

export type PitchVariantId = "dm" | "email" | "follow-up";

export type OutreachPitch = {
  id: PitchVariantId;
  label: string;
  subject: string;
  body: string;
};

export type OutreachLead = {
  id: string;
  protocolId: string;
  protocolName: string;
  segment: string;
  status: LeadStatus;
  priority: number;
  score: number;
  grade: string;
  recommendedOfferId: ServiceOfferId;
  recommendedOfferName: string;
  priceLabel: string;
  reason: string;
  valueSignal: string;
  nextStep: string;
  contactTarget: string;
  sourceUrls: string[];
  pitches: OutreachPitch[];
};

export type OutreachPipeline = {
  generatedAt: string;
  scopeLabel: string;
  summary: string;
  leadCount: number;
  readyCount: number;
  contactedCount: number;
  selectedOfferCount: number;
  leads: OutreachLead[];
  leadsCsv: string;
  pipelineJson: string;
};

type BuildOutreachPipelineInput = {
  filteredMarkets: DexMarket[];
  network: NetworkScope;
  protocolScans: ProtocolScan[];
  serviceLayer: ServiceLayer;
  statusOverrides?: Partial<Record<string, LeadStatus>>;
  target: "All" | OutcomeTarget;
  totals: MarketScopeMetrics;
};

const usd = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
  style: "currency",
  currency: "USD",
});

const leadCsvHeader = [
  "priority",
  "protocol",
  "segment",
  "status",
  "score",
  "grade",
  "recommendedOffer",
  "priceLabel",
  "reason",
  "valueSignal",
  "nextStep",
  "contactTarget",
];

export function buildOutreachPipeline({
  filteredMarkets,
  network,
  protocolScans,
  serviceLayer,
  statusOverrides = {},
  target,
  totals,
}: BuildOutreachPipelineInput): OutreachPipeline {
  const generatedAt = new Date().toISOString();
  const scopeLabel = `${network} / ${target}`;
  const offerById = Object.fromEntries(
    serviceLayer.offers.map((offer) => [offer.id, offer]),
  ) as Record<ServiceOfferId, ServiceOffer>;
  const fallbackOffer = serviceLayer.offers[0];
  const leads = protocolScans
    .filter((scan) => scan.score >= 35 || scan.status !== "Low signal")
    .sort((left, right) => right.score - left.score)
    .slice(0, 10)
    .map<OutreachLead>((scan, index) => {
      const recommendedOfferId = chooseOfferId(scan);
      const offer = offerById[recommendedOfferId] ?? fallbackOffer;
      const defaultStatus = defaultLeadStatus(scan);
      const status = statusOverrides[scan.id] ?? defaultStatus;

      return {
        id: scan.id,
        protocolId: scan.id,
        protocolName: scan.name,
        segment: scan.segment,
        status,
        priority: index + 1,
        score: scan.score,
        grade: scan.healthScore.grade,
        recommendedOfferId: offer.id,
        recommendedOfferName: offer.name,
        priceLabel: offer.priceLabel,
        reason: buildLeadReason(scan, offer),
        valueSignal: buildValueSignal(scan),
        nextStep: buildNextStep(scan, offer),
        contactTarget: buildContactTarget(scan),
        sourceUrls: scan.sourceUrls,
        pitches: buildPitches(scan, offer, scopeLabel),
      };
    });
  const leadsCsv = buildLeadsCsv(leads);
  const payload = {
    generatedAt,
    product: "Superchain Liquidity Ops",
    scope: {
      network,
      target,
      markets: filteredMarkets.length,
      volume30dUsd: totals.volume30d,
      fees30dUsd: totals.fees30d,
      watchCount: totals.watchCount,
    },
    summary: {
      leadCount: leads.length,
      readyCount: leads.filter((lead) => lead.status === "Ready to contact").length,
      contactedCount: leads.filter((lead) => lead.status === "Contacted").length,
    },
    leads: leads.map(({ pitches: _pitches, ...lead }) => lead),
  };

  return {
    generatedAt,
    scopeLabel,
    summary: `${leads.length} protocol leads built from scanner output, ${payload.summary.readyCount} ready to contact.`,
    leadCount: leads.length,
    readyCount: payload.summary.readyCount,
    contactedCount: payload.summary.contactedCount,
    selectedOfferCount: new Set(leads.map((lead) => lead.recommendedOfferId)).size,
    leads,
    leadsCsv,
    pipelineJson: JSON.stringify(payload, null, 2),
  };
}

function chooseOfferId(scan: ProtocolScan): ServiceOfferId {
  if (scan.status === "Ready for report" && scan.score >= 75) {
    return "protocol-diagnostic";
  }

  if (scan.atRiskMarkets > 0 || scan.watchMarkets >= scan.strongMarkets) {
    return "monitoring-retainer";
  }

  return "grant-evidence-pack";
}

function defaultLeadStatus(scan: ProtocolScan): LeadStatus {
  if (scan.status === "Ready for report" && scan.score >= 65) {
    return "Ready to contact";
  }

  return "New";
}

function buildLeadReason(scan: ProtocolScan, offer: ServiceOffer) {
  return `${scan.status}; ${scan.score}/100 scanner score; ${offer.name} fits ${scan.segment.toLowerCase()} teams.`;
}

function buildValueSignal(scan: ProtocolScan) {
  return `${formatUsd(scan.volume30dUsd)} 30d volume, ${formatOptionalUsd(scan.fees30dUsd)} 30d fees, ${scan.marketCount} matched Superchain markets.`;
}

function buildNextStep(scan: ProtocolScan, offer: ServiceOffer) {
  if (scan.status === "Ready for report") {
    return `Send ${offer.name} pitch with one sample report and ask who owns liquidity/growth analytics.`;
  }

  if (scan.atRiskMarkets > 0 || scan.watchMarkets > 0) {
    return "Send monitoring pitch focused on weak markets and source-backed watchlist.";
  }

  return "Keep in the pipeline until scanner score or fee data improves.";
}

function buildContactTarget(scan: ProtocolScan) {
  const cleanName = scan.name.toLowerCase().replace(/[^a-z0-9]/g, "");
  return `X/Discord/BD lead for ${scan.name}; try @${cleanName} or the protocol docs contact page.`;
}

function buildPitches(
  scan: ProtocolScan,
  offer: ServiceOffer,
  scopeLabel: string,
): OutreachPitch[] {
  const valueSignal = buildValueSignal(scan);
  const compactProblem =
    scan.status === "Ready for report"
      ? "you already have enough visible Superchain activity for a source-backed diagnostic"
      : "your Superchain markets have mixed signals that are worth monitoring";

  return [
    {
      id: "dm",
      label: "DM",
      subject: `${scan.name} Superchain liquidity diagnostic`,
      body: [
        `Hey ${scan.name} team, I built an open-source Superchain liquidity monitor for DEX volume, fees and market health.`,
        "",
        `Your scanner snapshot shows ${valueSignal}. I can turn this into a short ${offer.name} with source links, weak-market notes and next actions.`,
        "",
        `Would it be useful if I sent a small sample report for ${scan.name}?`,
      ].join("\n"),
    },
    {
      id: "email",
      label: "Email",
      subject: `${scan.name}: source-backed Superchain liquidity report`,
      body: [
        `Hi ${scan.name} team,`,
        "",
        `I am building Superchain Liquidity Ops, an open-source analytics workflow for protocols and grants teams that need evidence around DEX volume, fee output and market health.`,
        "",
        `Your current scanner signal: ${valueSignal}`,
        `Recommended package: ${offer.name} (${offer.priceLabel})`,
        `Scope: ${scopeLabel}`,
        "",
        `The reason I am reaching out is simple: ${compactProblem}. The deliverable would be a concise report, CSV evidence, source audit notes and concrete follow-up actions.`,
        "",
        "If this is relevant, I can send a sample report first and you can decide whether it is worth a paid diagnostic.",
        "",
        "Best,",
        "Dima",
      ].join("\n"),
    },
    {
      id: "follow-up",
      label: "Follow-up",
      subject: `Following up on ${scan.name} liquidity evidence`,
      body: [
        `Quick follow-up on the ${scan.name} Superchain liquidity note.`,
        "",
        `The useful part is not a dashboard screenshot. It is a reproducible pack: report Markdown, matched market CSV, source audit and next-action memo.`,
        "",
        `If you point me to the right growth/liquidity owner, I can send the sample ${offer.name} brief and keep it narrow.`,
      ].join("\n"),
    },
  ];
}

function buildLeadsCsv(leads: OutreachLead[]) {
  const rows = leads.map((lead) =>
    [
      String(lead.priority),
      lead.protocolName,
      lead.segment,
      lead.status,
      String(lead.score),
      lead.grade,
      lead.recommendedOfferName,
      lead.priceLabel,
      lead.reason,
      lead.valueSignal,
      lead.nextStep,
      lead.contactTarget,
    ]
      .map(csvCell)
      .join(","),
  );

  return [leadCsvHeader.join(","), ...rows].join("\n");
}

function csvCell(value: string) {
  if (!/[",\n]/.test(value)) {
    return value;
  }

  return `"${value.replace(/"/g, '""')}"`;
}

function formatUsd(value: number | null) {
  return value === null ? "unavailable" : usd.format(value);
}

function formatOptionalUsd(value: number | null) {
  return value === null ? "unavailable fees" : `${usd.format(value)}`;
}
