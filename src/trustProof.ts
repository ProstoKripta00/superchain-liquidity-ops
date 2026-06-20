export type TrustProofMetric = {
  label: string;
  note: string;
  value: string;
};

export type TrustProofItemStatus = "Public" | "Live" | "Documented" | "Boundary";

export type TrustProofItem = {
  action: string;
  category: string;
  description: string;
  href: string;
  id: string;
  proof: string;
  status: TrustProofItemStatus;
  title: string;
};

export type TrustBoundary = {
  detail: string;
  title: string;
};

export type TrustProofPack = {
  boundaries: TrustBoundary[];
  generatedAt: string;
  items: TrustProofItem[];
  metrics: TrustProofMetric[];
  summary: string;
};

type BuildTrustProofPackInput = {
  launchStatus: string;
  liveStatus: string;
  marketCount: number;
  protocolCount: number;
  readinessScore: number;
  sampleReportCount: number;
  savedIntakeCount: number;
  serviceOfferCount: number;
  serviceReadyCount: number;
  sourceCount: number;
  staticSampleCount: number;
};

const REPO_URL = "https://github.com/ProstoKripta00/superchain-liquidity-ops";
const LIVE_APP_URL = "https://prostokripta00.github.io/superchain-liquidity-ops/";
const MANIFEST_URL =
  "https://prostokripta00.github.io/superchain-liquidity-ops/examples/index.json";

export function buildTrustProofPack({
  launchStatus,
  liveStatus,
  marketCount,
  protocolCount,
  readinessScore,
  sampleReportCount,
  savedIntakeCount,
  serviceOfferCount,
  serviceReadyCount,
  sourceCount,
  staticSampleCount,
}: BuildTrustProofPackInput): TrustProofPack {
  return {
    boundaries: [
      {
        title: "No fake client logos",
        detail:
          "The public page does not invent customers, testimonials, audits, or paid case studies. Proof is limited to the repo, live app, exports, docs, and delivery examples.",
      },
      {
        title: "Not a security audit",
        detail:
          "Reports are liquidity and fee intelligence outputs. They are not smart-contract audits, financial advice, or guarantees of future market performance.",
      },
      {
        title: "Unavailable values stay visible",
        detail:
          "If a public source does not expose a metric, the app keeps that gap visible instead of filling it with manual or synthetic numbers.",
      },
      {
        title: "Private client data boundary",
        detail:
          "The public site does not collect private client data automatically. Paid delivery is scoped manually before private report files are shared.",
      },
    ],
    generatedAt: new Date().toISOString(),
    items: [
      {
        action: "Open repo",
        category: "Source",
        description:
          "Public TypeScript code, deployment workflow, methodology docs, and delivery examples can be inspected before a buyer responds.",
        href: REPO_URL,
        id: "public-repository",
        proof: "GitHub repository",
        status: "Public",
        title: "Open-source repository",
      },
      {
        action: "Open live site",
        category: "Product",
        description:
          "The dashboard runs from GitHub Pages and loads public Superchain market data directly in the browser.",
        href: LIVE_APP_URL,
        id: "live-dashboard",
        proof: `${marketCount} live markets visible when sources are available`,
        status: "Live",
        title: "Live dashboard",
      },
      {
        action: "Read methodology",
        category: "Method",
        description:
          "Scoring rules, source limits, report boundaries, and missing-data handling are documented in plain language.",
        href: `${REPO_URL}/blob/main/METHODOLOGY.md`,
        id: "methodology",
        proof: "METHODOLOGY.md",
        status: "Documented",
        title: "Transparent methodology",
      },
      {
        action: "Open manifest",
        category: "Artifacts",
        description:
          "Stable Markdown, CSV, JSON, and manifest files are served as public delivery examples.",
        href: MANIFEST_URL,
        id: "static-delivery-manifest",
        proof: `${staticSampleCount} static delivery files`,
        status: "Public",
        title: "Static delivery manifest",
      },
      {
        action: "View cases",
        category: "Evidence",
        description:
          "Public case studies show how live scanner data becomes a buyer-readable liquidity impact narrative.",
        href: `${LIVE_APP_URL}#case-studies`,
        id: "public-case-studies",
        proof: "Live-generated case study workflow",
        status: "Live",
        title: "Public case studies",
      },
      {
        action: "Check sources",
        category: "Data",
        description:
          "Every public endpoint has an audit row with status, timestamp, and source URL so missing or stale data is inspectable.",
        href: `${LIVE_APP_URL}#sources`,
        id: "source-audit",
        proof: `${sourceCount} sources checked`,
        status: "Live",
        title: "Source audit trail",
      },
      {
        action: "View boundaries",
        category: "Trust",
        description:
          "The trust block documents what the product does not claim yet, which reduces risk when selling as a new builder.",
        href: `${LIVE_APP_URL}#trust-proof`,
        id: "delivery-boundaries",
        proof: "Honest scope and limitation notes",
        status: "Boundary",
        title: "Delivery boundaries",
      },
    ],
    metrics: [
      {
        label: "Live status",
        note: "Current dashboard load state",
        value: liveStatus,
      },
      {
        label: "Sources checked",
        note: "Public endpoints with audit rows",
        value: String(sourceCount),
      },
      {
        label: "Protocol scans",
        note: "Targets available for reports",
        value: String(protocolCount),
      },
      {
        label: "Report examples",
        note: "Generated product reports",
        value: String(sampleReportCount),
      },
      {
        label: "Static files",
        note: "Permanent delivery examples",
        value: String(staticSampleCount),
      },
      {
        label: "Request flow",
        note: "Public report request section",
        value: "Live",
      },
    ],
    summary:
      "A compact proof layer for buyers and operators: public source code, live site, methodology, delivery examples, source audit, and clear delivery boundaries without fake traction claims.",
  };
}
