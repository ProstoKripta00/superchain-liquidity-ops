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

const SAMPLE_BASE_URL = "/superchain-liquidity-ops/samples/";

export const STATIC_SAMPLE_MANIFEST_URL = `${SAMPLE_BASE_URL}index.json`;

export const STATIC_SAMPLE_FILES: StaticSampleFile[] = [
  {
    id: "protocol-diagnostic",
    title: "Protocol Diagnostic Sprint",
    category: "Service proof",
    format: "Markdown",
    fileName: "protocol-diagnostic-sample.md",
    href: `${SAMPLE_BASE_URL}protocol-diagnostic-sample.md`,
    description:
      "Fixed-scope protocol diagnostic sample with findings, recommendation, metrics and delivery boundary.",
    useCase: "Send before pitching a paid diagnostic sprint.",
  },
  {
    id: "liquidity-monitoring",
    title: "Liquidity Monitoring Retainer",
    category: "Service proof",
    format: "Markdown",
    fileName: "liquidity-monitoring-sample.md",
    href: `${SAMPLE_BASE_URL}liquidity-monitoring-sample.md`,
    description:
      "Weekly monitoring sample with watchlist, operating cadence and source-health notes.",
    useCase: "Use when selling recurring monitoring.",
  },
  {
    id: "grant-evidence-pack",
    title: "DAO / Incentive Evidence Pack",
    category: "Decision proof",
    format: "Markdown",
    fileName: "grant-evidence-pack-sample.md",
    href: `${SAMPLE_BASE_URL}grant-evidence-pack-sample.md`,
    description:
      "Decision-ready sample that maps DEX activity, fees, market health and source transparency.",
    useCase: "Attach to DAO, incentive-reporting, or ecosystem evidence pitches.",
  },
  {
    id: "client-intake",
    title: "Client Intake Form",
    category: "Sales ops",
    format: "Markdown",
    fileName: "client-intake-sample.md",
    href: `${SAMPLE_BASE_URL}client-intake-sample.md`,
    description:
      "Sample client-scope form showing contact, decision, chains, metrics, budget and next steps.",
    useCase: "Show prospects what information is needed before paid work starts.",
  },
  {
    id: "request-report",
    title: "Request Report",
    category: "Sales ops",
    format: "Markdown",
    fileName: "request-report-sample.md",
    href: `${SAMPLE_BASE_URL}request-report-sample.md`,
    description:
      "Sample report request with selected package, need, deliverables and acceptance criteria.",
    useCase: "Use as a public request template.",
  },
  {
    id: "market-impact-csv",
    title: "Market Impact CSV",
    category: "Data artifact",
    format: "CSV",
    fileName: "market-impact-sample.csv",
    href: `${SAMPLE_BASE_URL}market-impact-sample.csv`,
    description:
      "Static CSV showing the expected market-impact evidence columns and unavailable-value handling.",
    useCase: "Preview the tabular export format.",
  },
  {
    id: "source-audit-json",
    title: "Source Audit JSON",
    category: "Data artifact",
    format: "JSON",
    fileName: "source-audit-sample.json",
    href: `${SAMPLE_BASE_URL}source-audit-sample.json`,
    description:
      "Static JSON showing source URLs, status, use cases and delivery boundaries.",
    useCase: "Preview the source-transparency artifact.",
  },
];
