export type StaticSampleFile = {
  id: string;
  title: string;
  category: string;
  format: "Markdown" | "CSV" | "JSON";
  fileName: string;
  href: string;
  description: string;
  useCase: string;
};

const SAMPLE_BASE_URL = "/superchain-liquidity-ops/examples/";

export const STATIC_SAMPLE_MANIFEST_URL = `${SAMPLE_BASE_URL}index.json`;

export const STATIC_SAMPLE_FILES: StaticSampleFile[] = [
  {
    id: "7-day-liquidity-impact-report",
    title: "7-Day Liquidity Impact Report",
    category: "Primary report example",
    format: "Markdown",
    fileName: "7-day-liquidity-impact-report-example.md",
    href: `${SAMPLE_BASE_URL}7-day-liquidity-impact-report-example.md`,
    description:
      "Primary buyer-facing report example with scope, evidence table, recommendation format, payment terms and delivery boundary.",
    useCase: "Send as the first proof artifact before offering the $500 report.",
  },
  {
    id: "protocol-diagnostic",
    title: "Protocol Diagnostic Sprint",
    category: "Service proof",
    format: "Markdown",
    fileName: "protocol-diagnostic-example.md",
    href: `${SAMPLE_BASE_URL}protocol-diagnostic-example.md`,
    description:
      "Fixed-scope protocol diagnostic example with findings, recommendation, metrics and delivery boundary.",
    useCase: "Send before pitching a paid diagnostic sprint.",
  },
  {
    id: "liquidity-monitoring",
    title: "Liquidity Monitoring Retainer",
    category: "Service proof",
    format: "Markdown",
    fileName: "liquidity-monitoring-example.md",
    href: `${SAMPLE_BASE_URL}liquidity-monitoring-example.md`,
    description:
      "Weekly monitoring example with watchlist, operating cadence and source-health notes.",
    useCase: "Use when selling recurring monitoring.",
  },
  {
    id: "incentive-evidence-pack",
    title: "Liquidity Evidence Pack",
    category: "Decision proof",
    format: "Markdown",
    fileName: "incentive-evidence-pack-example.md",
    href: `${SAMPLE_BASE_URL}incentive-evidence-pack-example.md`,
    description:
      "Decision-ready example that maps DEX activity, fees, market health and source transparency.",
    useCase: "Attach to protocol, growth, incentive, or ecosystem evidence pitches.",
  },
  {
    id: "client-intake",
    title: "Client Intake Form",
    category: "Sales ops",
    format: "Markdown",
    fileName: "client-intake-example.md",
    href: `${SAMPLE_BASE_URL}client-intake-example.md`,
    description:
      "Client-scope example showing contact, decision, chains, metrics, budget and next steps.",
    useCase: "Show prospects what information is needed before paid work starts.",
  },
  {
    id: "request-report",
    title: "Request Report",
    category: "Sales ops",
    format: "Markdown",
    fileName: "request-report-example.md",
    href: `${SAMPLE_BASE_URL}request-report-example.md`,
    description:
      "Report request example with selected package, need, deliverables and acceptance criteria.",
    useCase: "Use as a public request template.",
  },
  {
    id: "market-impact-csv",
    title: "Market Impact CSV",
    category: "Data artifact",
    format: "CSV",
    fileName: "market-impact-example.csv",
    href: `${SAMPLE_BASE_URL}market-impact-example.csv`,
    description:
      "Static CSV showing the expected market-impact evidence columns and unavailable-value handling.",
    useCase: "Preview the tabular export format.",
  },
  {
    id: "source-audit-json",
    title: "Source Audit JSON",
    category: "Data artifact",
    format: "JSON",
    fileName: "source-audit-example.json",
    href: `${SAMPLE_BASE_URL}source-audit-example.json`,
    description:
      "Static JSON showing source URLs, status, use cases and delivery boundaries.",
    useCase: "Preview the source-transparency artifact.",
  },
];
