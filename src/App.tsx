import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowDownToLine,
  ArrowUpRight,
  BarChart3,
  CircleDollarSign,
  DatabaseZap,
  ExternalLink,
  FileCheck2,
  FileText,
  Gauge,
  GitBranch,
  Layers3,
  LineChart,
  Mail,
  MessageSquare,
  Network,
  Printer,
  Radar,
  RefreshCcw,
  Route,
  Send,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  TrendingUp,
} from "lucide-react";
import { loadLiquiditySnapshot } from "./api";
import { buildAutomationRun, type AutomationRun } from "./automation";
import {
  buildPublicCaseStudies,
  buildPublicCaseStudiesJson,
  type PublicCaseStudy,
  type PublicCaseStudyId,
} from "./caseStudies";
import {
  loadOutreachCrmRecords,
  saveOutreachCrmRecords,
  updateOutreachCrmRecord,
  type OutreachCrmRecords,
} from "./crmStorage";
import { buildChainCoverageRows, buildMarketScopeMetrics } from "./dataEngine";
import {
  buildExportPack,
  buildMarketsCsv,
  type ExportPack,
  type ExportPackArtifactId,
} from "./exportPack";
import {
  INTAKE_BUDGETS,
  INTAKE_CHAIN_OPTIONS,
  INTAKE_DECISIONS,
  INTAKE_DELIVERABLE_FORMATS,
  INTAKE_METRIC_OPTIONS,
  buildDefaultIntakeForm,
  buildIntakePack,
  loadIntakeRecords,
  recordsToJson,
  removeIntakeRecord,
  saveIntakeRecords,
  upsertIntakeRecord,
  type IntakeDecisionId,
  type IntakeFormState,
  type IntakeMetricId,
  type IntakePack,
  type IntakeRecord,
} from "./intakeForm";
import {
  CONTACT_CHANNELS,
  CONTACT_ENRICHMENT_STATUSES,
  buildOutreachPipeline,
  type ContactChannel,
  type ContactEnrichmentStatus,
  type LeadStatus,
  type OutreachLead,
  type OutreachPipeline,
  type PitchVariantId,
} from "./outreachPipeline";
import {
  buildLeadTargetList,
  type LeadTargetList,
} from "./leadTargets";
import { buildProtocolMiniReport } from "./reportGenerator";
import {
  REQUEST_BUDGETS,
  REQUEST_TYPES,
  buildDefaultRequestReportForm,
  buildRequestReportPack,
  type RequestReportForm,
  type RequestReportPack,
  type RequestReportType,
} from "./requestReport";
import {
  buildPaymentTermsPack,
  type PaymentTermsPack,
} from "./paymentTerms";
import {
  buildSampleReports,
  buildSampleReportsJson,
  type SampleReport,
  type SampleReportId,
} from "./sampleReports";
import {
  buildScheduledSnapshotsPack,
  type ScheduledSnapshotsPack,
} from "./scheduledSnapshots";
import {
  buildSalesKit,
  type SalesKit,
} from "./salesKit";
import {
  buildServiceLayer,
  type ServiceLayer,
  type ServiceOffer,
} from "./serviceLayer";
import {
  STATIC_SAMPLE_FILES,
  STATIC_SAMPLE_MANIFEST_URL,
  type StaticSampleFile,
} from "./staticSamples";
import { SUPERCHAIN_NETWORKS } from "./sources";
import { buildTrustProofPack, type TrustProofPack } from "./trustProof";
import type {
  DexMarket,
  LiquiditySnapshot,
  NetworkScope,
  OutcomeTarget,
  ProtocolMiniReport,
  ProtocolScan,
  SourceStatus,
  SuperchainNetwork,
} from "./types";

const compactUsd = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
  style: "currency",
  currency: "USD",
});

const pct = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});

const networks: Array<"All" | SuperchainNetwork> = ["All", ...SUPERCHAIN_NETWORKS];

const targets: Array<"All" | OutcomeTarget> = [
  "All",
  "Grow TVL",
  "Improve fee efficiency",
  "Rebalance liquidity",
  "Monitor incentives",
];

type ReportLibraryItem = {
  scan: ProtocolScan;
  report: ProtocolMiniReport;
};

type SampleReportFeedbackAction = "copy" | "download" | "json" | "pdf";
type CaseStudyFeedbackAction = "copy" | "download" | "json" | "pdf";
type LaunchFeedbackAction =
  | "copy-proposal"
  | "download-proposal"
  | "copy-email"
  | "download-checklist"
  | "download-json";
type ExportPackFeedbackAction = ExportPackArtifactId | "pack-json" | "handoff";
type AutomationFeedbackAction = "run" | "copy" | "download";
type ScheduledSnapshotFeedbackAction = "copy" | "download-md" | "download-yaml" | "download-json";
type ServiceFeedbackAction =
  | "copy-brief"
  | "download-brief"
  | "copy-pricing"
  | "download-pricing"
  | "json";
type PaymentTermsFeedbackAction = "copy" | "download";
type LeadTargetFeedbackAction = "copy" | "download-csv" | "download-json";
type OutreachFeedbackAction = "pitch" | "csv" | "json";
type RequestFeedbackAction =
  | "copy-request"
  | "copy-telegram"
  | "download-request"
  | "download-json";
type IntakeFeedbackAction =
  | "save"
  | "copy"
  | "telegram"
  | "download-md"
  | "download-json"
  | "export-records"
  | "delete"
  | "reset";
const leadStatuses: LeadStatus[] = [
  "New",
  "Ready to contact",
  "Contacted",
  "Replied",
  "Won",
  "Lost",
];

function App() {
  const [network, setNetwork] = useState<NetworkScope>("All");
  const [target, setTarget] = useState<(typeof targets)[number]>("All");
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);
  const [selectedProtocolId, setSelectedProtocolId] = useState<string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedSampleReportId, setSelectedSampleReportId] =
    useState<SampleReportId | null>(null);
  const [selectedCaseStudyId, setSelectedCaseStudyId] =
    useState<PublicCaseStudyId | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedServiceOfferId, setSelectedServiceOfferId] = useState<
    ServiceOffer["id"] | null
  >(null);
  const [requestForm, setRequestForm] = useState<RequestReportForm | null>(null);
  const [intakeForm, setIntakeForm] = useState<IntakeFormState | null>(null);
  const [intakeRecords, setIntakeRecords] = useState<IntakeRecord[]>(() =>
    loadIntakeRecords(),
  );
  const [selectedIntakeId, setSelectedIntakeId] = useState<string | null>(null);
  const [crmRecords, setCrmRecords] = useState<OutreachCrmRecords>(() =>
    loadOutreachCrmRecords(),
  );
  const [copyFeedback, setCopyFeedback] = useState<{
    label: string;
    protocolId: string;
  } | null>(null);
  const [reportFeedback, setReportFeedback] = useState<{
    label: string;
    protocolId: string;
  } | null>(null);
  const [sampleReportFeedback, setSampleReportFeedback] = useState<{
    action: SampleReportFeedbackAction;
    label: string;
    reportId?: SampleReportId;
  } | null>(null);
  const [caseStudyFeedback, setCaseStudyFeedback] = useState<{
    action: CaseStudyFeedbackAction;
    label: string;
    caseStudyId?: PublicCaseStudyId;
  } | null>(null);
  const [launchFeedback, setLaunchFeedback] = useState<{
    action: LaunchFeedbackAction;
    label: string;
  } | null>(null);
  const [exportPackFeedback, setExportPackFeedback] = useState<{
    action: ExportPackFeedbackAction;
    label: string;
    protocolId: string;
  } | null>(null);
  const [automationFeedback, setAutomationFeedback] = useState<{
    action: AutomationFeedbackAction;
    label: string;
  } | null>(null);
  const [scheduledSnapshotFeedback, setScheduledSnapshotFeedback] = useState<{
    action: ScheduledSnapshotFeedbackAction;
    label: string;
  } | null>(null);
  const [serviceFeedback, setServiceFeedback] = useState<{
    action: ServiceFeedbackAction;
    label: string;
  } | null>(null);
  const [paymentTermsFeedback, setPaymentTermsFeedback] = useState<{
    action: PaymentTermsFeedbackAction;
    label: string;
  } | null>(null);
  const [leadTargetFeedback, setLeadTargetFeedback] = useState<{
    action: LeadTargetFeedbackAction;
    label: string;
  } | null>(null);
  const [outreachFeedback, setOutreachFeedback] = useState<{
    action: OutreachFeedbackAction;
    label: string;
  } | null>(null);
  const [requestFeedback, setRequestFeedback] = useState<{
    action: RequestFeedbackAction;
    label: string;
  } | null>(null);
  const [intakeFeedback, setIntakeFeedback] = useState<{
    action: IntakeFeedbackAction;
    label: string;
  } | null>(null);
  const [automationRunVersion, setAutomationRunVersion] = useState(0);
  const [operatorMode, setOperatorMode] = useState(false);
  const [snapshot, setSnapshot] = useState<LiquiditySnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const nextSnapshot = await loadLiquiditySnapshot();
      setSnapshot(nextSnapshot);
      setSelectedMarketId((current) => current ?? nextSnapshot.markets[0]?.id ?? null);
      setSelectedProtocolId(
        (current) => current ?? nextSnapshot.protocolScans[0]?.id ?? null,
      );
      setSelectedReportId((current) => current ?? nextSnapshot.protocolScans[0]?.id ?? null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to load live data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  useEffect(() => {
    saveOutreachCrmRecords(crmRecords);
  }, [crmRecords]);

  useEffect(() => {
    saveIntakeRecords(intakeRecords);
  }, [intakeRecords]);

  const markets = snapshot?.markets ?? [];
  const chains = snapshot?.chains ?? [];
  const protocolScans = snapshot?.protocolScans ?? [];

  const filteredMarkets = useMemo(
    () =>
      markets.filter((market) => {
        const matchesNetwork = network === "All" || market.network === network;
        const matchesTarget = target === "All" || market.outcomeTarget === target;
        return matchesNetwork && matchesTarget;
      }),
    [markets, network, target],
  );

  const selectedMarket =
    filteredMarkets.find((market) => market.id === selectedMarketId) ??
    filteredMarkets[0] ??
    null;
  const selectedProtocol =
    protocolScans.find((scan) => scan.id === selectedProtocolId) ??
    protocolScans[0] ??
    null;
  const selectedProtocolMarkets = useMemo(
    () =>
      selectedProtocol
        ? markets.filter((market) => selectedProtocol.marketIds.includes(market.id))
        : [],
    [markets, selectedProtocol],
  );
  const miniReport = useMemo(
    () =>
      selectedProtocol
        ? buildProtocolMiniReport(selectedProtocol, selectedProtocolMarkets)
        : null,
    [selectedProtocol, selectedProtocolMarkets],
  );
  const reportItems = useMemo<ReportLibraryItem[]>(() => {
    const readyScans = protocolScans.filter(
      (scan) => scan.status === "Ready for report",
    );
    const selectedScans = (readyScans.length >= 3 ? readyScans : protocolScans).slice(
      0,
      4,
    );

    return selectedScans.map((scan) => {
      const scanMarkets = markets.filter((market) => scan.marketIds.includes(market.id));
      return {
        scan,
        report: buildProtocolMiniReport(scan, scanMarkets),
      };
    });
  }, [markets, protocolScans]);
  const selectedReportItem =
    reportItems.find((item) => item.report.protocolId === selectedReportId) ??
    reportItems[0] ??
    null;
  const sampleReports = useMemo(
    () => buildSampleReports({ markets, protocolScans }),
    [markets, protocolScans],
  );
  const selectedSampleReport =
    sampleReports.find((report) => report.id === selectedSampleReportId) ??
    sampleReports[0] ??
    null;
  const caseStudies = useMemo(
    () => buildPublicCaseStudies({ markets, protocolScans }),
    [markets, protocolScans],
  );
  const selectedCaseStudy =
    caseStudies.find((caseStudy) => caseStudy.id === selectedCaseStudyId) ??
    caseStudies[0] ??
    null;

  const totals = useMemo(
    () => buildMarketScopeMetrics(filteredMarkets, chains, network),
    [chains, filteredMarkets, network],
  );
  const selectedExportPack = useMemo(() => {
    if (!selectedReportItem) {
      return null;
    }

    const protocolMarkets = markets.filter((market) =>
      selectedReportItem.scan.marketIds.includes(market.id),
    );

    return buildExportPack({
      network,
      protocolMarkets,
      report: selectedReportItem.report,
      scan: selectedReportItem.scan,
      scopedMarkets: filteredMarkets,
      sources: snapshot?.sources ?? [],
      target,
      totals,
    });
  }, [filteredMarkets, markets, network, selectedReportItem, snapshot?.sources, target, totals]);
  const automationRun = useMemo(
    () =>
      buildAutomationRun({
        filteredMarkets,
        network,
        protocolScans,
        selectedExportPack,
        snapshot,
        sources: snapshot?.sources ?? [],
        target,
        totals,
      }),
    [
      automationRunVersion,
      filteredMarkets,
      network,
      protocolScans,
      selectedExportPack,
      snapshot,
      target,
      totals,
    ],
  );
  const serviceLayer = useMemo(
    () =>
      buildServiceLayer({
        automationRun,
        filteredMarkets,
        network,
        protocolScans,
        selectedExportPack,
        target,
        totals,
      }),
    [
      automationRun,
      filteredMarkets,
      network,
      protocolScans,
      selectedExportPack,
      target,
      totals,
    ],
  );
  const selectedServiceOffer =
    serviceLayer.offers.find((offer) => offer.id === selectedServiceOfferId) ??
    serviceLayer.offers.find((offer) => offer.id === serviceLayer.recommendedOfferId) ??
    serviceLayer.offers[0] ??
    null;
  const outreachPipeline = useMemo(
    () =>
      buildOutreachPipeline({
        crmRecords,
        filteredMarkets,
        network,
        protocolScans,
        serviceLayer,
        target,
        totals,
      }),
    [
      crmRecords,
      filteredMarkets,
      network,
      protocolScans,
      serviceLayer,
      target,
      totals,
    ],
  );
  const selectedLead =
    outreachPipeline.leads.find((lead) => lead.id === selectedLeadId) ??
    outreachPipeline.leads.find((lead) => lead.status === "Ready to contact") ??
    outreachPipeline.leads[0] ??
    null;
  const leadTargetList = useMemo(
    () =>
      buildLeadTargetList({
        pipeline: outreachPipeline,
      }),
    [outreachPipeline],
  );
  const scheduledSnapshotsPack = useMemo(
    () =>
      buildScheduledSnapshotsPack({
        automationRun,
        leadTargetList,
        network,
        selectedExportPack,
        snapshot,
        target,
        totals,
      }),
    [
      automationRun,
      leadTargetList,
      network,
      selectedExportPack,
      snapshot,
      target,
      totals,
    ],
  );
  const salesKit = useMemo(
    () =>
      buildSalesKit({
        outreachPipeline,
        selectedExportPack,
        selectedLead,
        selectedOffer: selectedServiceOffer,
        selectedSampleReport,
        serviceLayer,
      }),
    [
      outreachPipeline,
      selectedExportPack,
      selectedLead,
      selectedSampleReport,
      selectedServiceOffer,
      serviceLayer,
    ],
  );
  const paymentTermsPack = useMemo(
    () =>
      buildPaymentTermsPack({
        salesKit,
        selectedOffer: selectedServiceOffer,
      }),
    [salesKit, selectedServiceOffer],
  );
  const defaultRequestForm = useMemo(
    () =>
      buildDefaultRequestReportForm({
        salesKit,
        selectedLead,
        selectedOffer: selectedServiceOffer,
      }),
    [salesKit, selectedLead, selectedServiceOffer],
  );
  const activeRequestForm = requestForm ?? defaultRequestForm;
  const requestReportPack = useMemo(
    () =>
      buildRequestReportPack({
        form: activeRequestForm,
        salesKit,
        selectedLead,
        selectedOffer: selectedServiceOffer,
        serviceLayer,
      }),
    [
      activeRequestForm,
      salesKit,
      selectedLead,
      selectedServiceOffer,
      serviceLayer,
    ],
  );
  const defaultIntakeForm = useMemo(
    () =>
      buildDefaultIntakeForm({
        network,
        requestForm: activeRequestForm,
        selectedLead,
        selectedOffer: selectedServiceOffer,
        target,
      }),
    [activeRequestForm, network, selectedLead, selectedServiceOffer, target],
  );
  const activeIntakeForm = intakeForm ?? defaultIntakeForm;
  const intakePack = useMemo(
    () =>
      buildIntakePack({
        form: activeIntakeForm,
        requestPack: requestReportPack,
        selectedLead,
        selectedOffer: selectedServiceOffer,
        serviceLayer,
      }),
    [
      activeIntakeForm,
      requestReportPack,
      selectedLead,
      selectedServiceOffer,
      serviceLayer,
    ],
  );
  const selectedIntakeRecord =
    intakeRecords.find((record) => record.id === selectedIntakeId) ??
    intakeRecords[0] ??
    null;

  const chainRows = useMemo(
    () => buildChainCoverageRows(chains, network),
    [chains, network],
  );

  const liveState = useMemo(() => getLiveState(snapshot, loadError), [loadError, snapshot]);
  const lastUpdated = snapshot?.updatedAt
    ? new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        day: "2-digit",
        month: "short",
      }).format(new Date(snapshot.updatedAt))
    : "Not loaded";
  const trustProofPack = useMemo(
    () =>
      buildTrustProofPack({
        launchStatus: salesKit.status,
        liveStatus: isLoading ? "Refreshing" : liveState.title,
        marketCount: markets.length,
        protocolCount: protocolScans.length,
        readinessScore: salesKit.readinessScore,
        sampleReportCount: sampleReports.length,
        savedIntakeCount: intakeRecords.length,
        serviceOfferCount: serviceLayer.offers.length,
        serviceReadyCount: serviceLayer.readyCount,
        sourceCount: snapshot?.sources.length ?? 0,
        staticSampleCount: STATIC_SAMPLE_FILES.length,
      }),
    [
      intakeRecords.length,
      isLoading,
      liveState.title,
      markets.length,
      protocolScans.length,
      salesKit.readinessScore,
      salesKit.status,
      sampleReports.length,
      serviceLayer.offers.length,
      serviceLayer.readyCount,
      snapshot?.sources.length,
    ],
  );

  const exportCsv = () => {
    if (filteredMarkets.length === 0) {
      return;
    }

    downloadTextFile(
      "superchain-dex-market-impact.csv",
      buildMarketsCsv(filteredMarkets),
      "text/csv;charset=utf-8",
    );
  };

  const copyProtocolSummary = async (scan: ProtocolScan) => {
    const summary = buildProtocolSummary(scan);

    try {
      await writeClipboardText(summary);
      setCopyFeedback({ protocolId: scan.id, label: "Copied" });
    } catch {
      setCopyFeedback({ protocolId: scan.id, label: "Summary ready" });
    }

    window.setTimeout(() => {
      setCopyFeedback((current) => (current?.protocolId === scan.id ? null : current));
    }, 1600);
  };

  const copyMiniReport = async (report: ProtocolMiniReport) => {
    try {
      await writeClipboardText(report.markdown);
      setReportFeedback({ protocolId: report.protocolId, label: "Copied" });
    } catch {
      setReportFeedback({ protocolId: report.protocolId, label: "Markdown ready" });
    }

    window.setTimeout(() => {
      setReportFeedback((current) =>
        current?.protocolId === report.protocolId ? null : current,
      );
    }, 1600);
  };

  const downloadMiniReport = (report: ProtocolMiniReport) => {
    downloadTextFile(report.fileName, report.markdown, "text/markdown;charset=utf-8");
    setReportFeedback({ protocolId: report.protocolId, label: "Downloaded" });

    window.setTimeout(() => {
      setReportFeedback((current) =>
        current?.protocolId === report.protocolId ? null : current,
      );
    }, 1600);
  };

  const printMiniReport = (report: ProtocolMiniReport) => {
    const label = openPrintableMarkdown(report.title, report.markdown);
    setReportFeedback({ protocolId: report.protocolId, label });

    window.setTimeout(() => {
      setReportFeedback((current) =>
        current?.protocolId === report.protocolId ? null : current,
      );
    }, 1600);
  };

  const setTemporarySampleReportFeedback = (
    action: SampleReportFeedbackAction,
    label: string,
    reportId?: SampleReportId,
  ) => {
    setSampleReportFeedback({ action, label, reportId });

    window.setTimeout(() => {
      setSampleReportFeedback((current) =>
        current?.action === action && current.reportId === reportId ? null : current,
      );
    }, 1600);
  };

  const copySampleReport = async (report: SampleReport) => {
    try {
      await writeClipboardText(report.markdown);
      setTemporarySampleReportFeedback("copy", "Copied", report.id);
    } catch {
      setTemporarySampleReportFeedback("copy", "Sample ready", report.id);
    }
  };

  const downloadSampleReport = (report: SampleReport) => {
    downloadTextFile(report.fileName, report.markdown, "text/markdown;charset=utf-8");
    setTemporarySampleReportFeedback("download", "Downloaded", report.id);
  };

  const downloadSampleReportsJson = (reports: SampleReport[]) => {
    downloadTextFile(
      "superchain-public-sample-reports.json",
      buildSampleReportsJson(reports),
      "application/json;charset=utf-8",
    );
    setTemporarySampleReportFeedback("json", "Downloaded");
  };

  const printSampleReport = (report: SampleReport) => {
    const label = openPrintableMarkdown(report.title, report.markdown);
    setTemporarySampleReportFeedback("pdf", label, report.id);
  };

  const setTemporaryCaseStudyFeedback = (
    action: CaseStudyFeedbackAction,
    label: string,
    caseStudyId?: PublicCaseStudyId,
  ) => {
    setCaseStudyFeedback({ action, label, caseStudyId });

    window.setTimeout(() => {
      setCaseStudyFeedback((current) =>
        current?.action === action && current.caseStudyId === caseStudyId
          ? null
          : current,
      );
    }, 1600);
  };

  const copyCaseStudy = async (caseStudy: PublicCaseStudy) => {
    try {
      await writeClipboardText(caseStudy.markdown);
      setTemporaryCaseStudyFeedback("copy", "Copied", caseStudy.id);
    } catch {
      setTemporaryCaseStudyFeedback("copy", "Case study ready", caseStudy.id);
    }
  };

  const downloadCaseStudy = (caseStudy: PublicCaseStudy) => {
    downloadTextFile(caseStudy.fileName, caseStudy.markdown, "text/markdown;charset=utf-8");
    setTemporaryCaseStudyFeedback("download", "Downloaded", caseStudy.id);
  };

  const downloadCaseStudiesJson = (items: PublicCaseStudy[]) => {
    downloadTextFile(
      "superchain-public-case-studies.json",
      buildPublicCaseStudiesJson(items),
      "application/json;charset=utf-8",
    );
    setTemporaryCaseStudyFeedback("json", "Downloaded");
  };

  const printCaseStudy = (caseStudy: PublicCaseStudy) => {
    const label = openPrintableMarkdown(caseStudy.title, caseStudy.markdown);
    setTemporaryCaseStudyFeedback("pdf", label, caseStudy.id);
  };

  const setTemporaryLaunchFeedback = (
    action: LaunchFeedbackAction,
    label: string,
  ) => {
    setLaunchFeedback({ action, label });

    window.setTimeout(() => {
      setLaunchFeedback((current) =>
        current?.action === action ? null : current,
      );
    }, 1600);
  };

  const copyLaunchProposal = async (kit: SalesKit) => {
    try {
      await writeClipboardText(kit.proposalMarkdown);
      setTemporaryLaunchFeedback("copy-proposal", "Copied");
    } catch {
      setTemporaryLaunchFeedback("copy-proposal", "Proposal ready");
    }
  };

  const downloadLaunchProposal = (kit: SalesKit) => {
    downloadTextFile(
      "superchain-client-proposal.md",
      kit.proposalMarkdown,
      "text/markdown;charset=utf-8",
    );
    setTemporaryLaunchFeedback("download-proposal", "Downloaded");
  };

  const copyOnboardingEmail = async (kit: SalesKit) => {
    try {
      await writeClipboardText(kit.onboardingEmail);
      setTemporaryLaunchFeedback("copy-email", "Copied");
    } catch {
      setTemporaryLaunchFeedback("copy-email", "Email ready");
    }
  };

  const downloadDeliveryChecklist = (kit: SalesKit) => {
    downloadTextFile(
      "superchain-delivery-checklist.md",
      kit.deliveryChecklistMarkdown,
      "text/markdown;charset=utf-8",
    );
    setTemporaryLaunchFeedback("download-checklist", "Downloaded");
  };

  const downloadSalesKitJson = (kit: SalesKit) => {
    downloadTextFile(
      "superchain-sales-kit.json",
      kit.salesKitJson,
      "application/json;charset=utf-8",
    );
    setTemporaryLaunchFeedback("download-json", "Downloaded");
  };

  const setTemporaryRequestFeedback = (
    action: RequestFeedbackAction,
    label: string,
  ) => {
    setRequestFeedback({ action, label });

    window.setTimeout(() => {
      setRequestFeedback((current) =>
        current?.action === action ? null : current,
      );
    }, 1600);
  };

  const updateRequestForm = (patch: Partial<RequestReportForm>) => {
    setRequestForm((current) => ({
      ...defaultRequestForm,
      ...current,
      ...patch,
    }));
  };

  const resetRequestForm = () => {
    setRequestForm(null);
    setTemporaryRequestFeedback("copy-request", "Reset");
  };

  const copyRequestMarkdown = async (pack: RequestReportPack) => {
    try {
      await writeClipboardText(pack.requestMarkdown);
      setTemporaryRequestFeedback("copy-request", "Copied");
    } catch {
      setTemporaryRequestFeedback("copy-request", "Request ready");
    }
  };

  const copyTelegramRequest = async (pack: RequestReportPack) => {
    try {
      await writeClipboardText(pack.telegramCopy);
      setTemporaryRequestFeedback("copy-telegram", "Copied");
    } catch {
      setTemporaryRequestFeedback("copy-telegram", "Text ready");
    }
  };

  const downloadRequestMarkdown = (pack: RequestReportPack) => {
    downloadTextFile(
      "superchain-request-report.md",
      pack.requestMarkdown,
      "text/markdown;charset=utf-8",
    );
    setTemporaryRequestFeedback("download-request", "Downloaded");
  };

  const downloadRequestJson = (pack: RequestReportPack) => {
    downloadTextFile(
      "superchain-request-report.json",
      pack.requestJson,
      "application/json;charset=utf-8",
    );
    setTemporaryRequestFeedback("download-json", "Downloaded");
  };

  const setTemporaryIntakeFeedback = (
    action: IntakeFeedbackAction,
    label: string,
  ) => {
    setIntakeFeedback({ action, label });

    window.setTimeout(() => {
      setIntakeFeedback((current) =>
        current?.action === action ? null : current,
      );
    }, 1600);
  };

  const updateIntakeForm = (patch: Partial<IntakeFormState>) => {
    setIntakeForm((current) => ({
      ...defaultIntakeForm,
      ...current,
      ...patch,
    }));
  };

  const toggleIntakeChain = (chain: string) => {
    const currentChains = activeIntakeForm.chains;
    const nextChains = currentChains.includes(chain)
      ? currentChains.filter((item) => item !== chain)
      : [...currentChains, chain];

    updateIntakeForm({ chains: nextChains });
  };

  const toggleIntakeMetric = (metric: IntakeMetricId) => {
    const currentMetrics = activeIntakeForm.metrics;
    const nextMetrics = currentMetrics.includes(metric)
      ? currentMetrics.filter((item) => item !== metric)
      : [...currentMetrics, metric];

    updateIntakeForm({ metrics: nextMetrics });
  };

  const resetIntakeForm = () => {
    setIntakeForm(null);
    setSelectedIntakeId(null);
    setTemporaryIntakeFeedback("reset", "Reset");
  };

  const saveCurrentIntake = () => {
    const result = upsertIntakeRecord({
      existingId: selectedIntakeId,
      form: activeIntakeForm,
      pack: intakePack,
      records: intakeRecords,
    });

    setIntakeRecords(result.records);
    setSelectedIntakeId(result.record.id);
    setTemporaryIntakeFeedback("save", "Saved");
  };

  const loadIntakeRecord = (record: IntakeRecord) => {
    const { createdAt: _createdAt, id: _id, status: _status, title: _title, updatedAt: _updatedAt, ...form } = record;
    setIntakeForm(form);
    setSelectedIntakeId(record.id);
    setTemporaryIntakeFeedback("save", "Loaded");
  };

  const deleteIntakeRecord = (recordId: string) => {
    setIntakeRecords((current) => removeIntakeRecord(current, recordId));
    setSelectedIntakeId((current) => (current === recordId ? null : current));
    setTemporaryIntakeFeedback("delete", "Deleted");
  };

  const copyIntakeMarkdown = async (pack: IntakePack) => {
    try {
      await writeClipboardText(pack.intakeMarkdown);
      setTemporaryIntakeFeedback("copy", "Copied");
    } catch {
      setTemporaryIntakeFeedback("copy", "Intake ready");
    }
  };

  const copyIntakeTelegram = async (pack: IntakePack) => {
    try {
      await writeClipboardText(pack.telegramCopy);
      setTemporaryIntakeFeedback("telegram", "Copied");
    } catch {
      setTemporaryIntakeFeedback("telegram", "Text ready");
    }
  };

  const downloadIntakeMarkdown = (pack: IntakePack) => {
    downloadTextFile(
      "superchain-client-intake.md",
      pack.intakeMarkdown,
      "text/markdown;charset=utf-8",
    );
    setTemporaryIntakeFeedback("download-md", "Downloaded");
  };

  const downloadIntakeJson = (pack: IntakePack) => {
    downloadTextFile(
      "superchain-client-intake.json",
      pack.intakeJson,
      "application/json;charset=utf-8",
    );
    setTemporaryIntakeFeedback("download-json", "Downloaded");
  };

  const exportIntakeRecords = () => {
    downloadTextFile(
      "superchain-intake-records.json",
      recordsToJson(intakeRecords),
      "application/json;charset=utf-8",
    );
    setTemporaryIntakeFeedback("export-records", "Exported");
  };

  const setTemporaryExportPackFeedback = (
    pack: ExportPack,
    action: ExportPackFeedbackAction,
    label: string,
  ) => {
    setExportPackFeedback({ action, label, protocolId: pack.protocolId });

    window.setTimeout(() => {
      setExportPackFeedback((current) =>
        current?.protocolId === pack.protocolId && current.action === action
          ? null
          : current,
      );
    }, 1600);
  };

  const copyExportPackHandoff = async (pack: ExportPack) => {
    try {
      await writeClipboardText(pack.handoffSummary);
      setTemporaryExportPackFeedback(pack, "handoff", "Copied");
    } catch {
      setTemporaryExportPackFeedback(pack, "handoff", "Summary ready");
    }
  };

  const downloadExportPackJson = (pack: ExportPack) => {
    downloadTextFile(pack.fileName, pack.packJson, "application/json;charset=utf-8");
    setTemporaryExportPackFeedback(pack, "pack-json", "Downloaded");
  };

  const downloadExportPackArtifact = (
    pack: ExportPack,
    artifactId: ExportPackArtifactId,
  ) => {
    const artifact = pack.artifacts.find((item) => item.id === artifactId);

    if (!artifact) {
      return;
    }

    downloadTextFile(artifact.fileName, artifact.content, artifact.mimeType);
    setTemporaryExportPackFeedback(pack, artifactId, "Downloaded");
  };

  const setTemporaryAutomationFeedback = (
    action: AutomationFeedbackAction,
    label: string,
  ) => {
    setAutomationFeedback({ action, label });

    window.setTimeout(() => {
      setAutomationFeedback((current) =>
        current?.action === action ? null : current,
      );
    }, 1600);
  };

  const runAutomation = () => {
    setAutomationRunVersion((current) => current + 1);
    setTemporaryAutomationFeedback("run", "Run complete");
  };

  const copyAutomationRunbook = async () => {
    try {
      await writeClipboardText(automationRun.runbook);
      setTemporaryAutomationFeedback("copy", "Copied");
    } catch {
      setTemporaryAutomationFeedback("copy", "Runbook ready");
    }
  };

  const downloadAutomationRunbook = () => {
    downloadTextFile(
      "superchain-automation-runbook.md",
      automationRun.runbook,
      "text/markdown;charset=utf-8",
    );
    setTemporaryAutomationFeedback("download", "Downloaded");
  };

  const setTemporaryScheduledSnapshotFeedback = (
    action: ScheduledSnapshotFeedbackAction,
    label: string,
  ) => {
    setScheduledSnapshotFeedback({ action, label });

    window.setTimeout(() => {
      setScheduledSnapshotFeedback((current) =>
        current?.action === action ? null : current,
      );
    }, 1600);
  };

  const copyScheduledSnapshotPlan = async (pack: ScheduledSnapshotsPack) => {
    try {
      await writeClipboardText(pack.markdown);
      setTemporaryScheduledSnapshotFeedback("copy", "Copied");
    } catch {
      setTemporaryScheduledSnapshotFeedback("copy", "Plan ready");
    }
  };

  const downloadScheduledSnapshotMarkdown = (pack: ScheduledSnapshotsPack) => {
    downloadTextFile(
      "superchain-scheduled-snapshots.md",
      pack.markdown,
      "text/markdown;charset=utf-8",
    );
    setTemporaryScheduledSnapshotFeedback("download-md", "Downloaded");
  };

  const downloadScheduledSnapshotYaml = (pack: ScheduledSnapshotsPack) => {
    downloadTextFile(
      "scheduled-superchain-snapshots.yml",
      pack.githubActionYaml,
      "text/yaml;charset=utf-8",
    );
    setTemporaryScheduledSnapshotFeedback("download-yaml", "Downloaded");
  };

  const downloadScheduledSnapshotJson = (pack: ScheduledSnapshotsPack) => {
    downloadTextFile(
      "superchain-scheduled-snapshots.json",
      pack.json,
      "application/json;charset=utf-8",
    );
    setTemporaryScheduledSnapshotFeedback("download-json", "Downloaded");
  };

  const setTemporaryServiceFeedback = (
    action: ServiceFeedbackAction,
    label: string,
  ) => {
    setServiceFeedback({ action, label });

    window.setTimeout(() => {
      setServiceFeedback((current) =>
        current?.action === action ? null : current,
      );
    }, 1600);
  };

  const copyServiceBrief = async (offer: ServiceOffer) => {
    try {
      await writeClipboardText(offer.clientBrief);
      setTemporaryServiceFeedback("copy-brief", "Copied");
    } catch {
      setTemporaryServiceFeedback("copy-brief", "Brief ready");
    }
  };

  const downloadServiceBrief = (offer: ServiceOffer) => {
    downloadTextFile(
      `${offer.id}-client-brief.md`,
      offer.clientBrief,
      "text/markdown;charset=utf-8",
    );
    setTemporaryServiceFeedback("download-brief", "Downloaded");
  };

  const copyPricingSheet = async (layer: ServiceLayer) => {
    try {
      await writeClipboardText(buildPricingSheet(layer));
      setTemporaryServiceFeedback("copy-pricing", "Copied");
    } catch {
      setTemporaryServiceFeedback("copy-pricing", "Pricing ready");
    }
  };

  const downloadPricingSheet = (layer: ServiceLayer) => {
    downloadTextFile(
      "superchain-offer-pricing.md",
      buildPricingSheet(layer),
      "text/markdown;charset=utf-8",
    );
    setTemporaryServiceFeedback("download-pricing", "Downloaded");
  };

  const downloadServiceJson = (layer: ServiceLayer) => {
    downloadTextFile(
      "superchain-service-layer.json",
      layer.serviceJson,
      "application/json;charset=utf-8",
    );
    setTemporaryServiceFeedback("json", "Downloaded");
  };

  const setTemporaryPaymentTermsFeedback = (
    action: PaymentTermsFeedbackAction,
    label: string,
  ) => {
    setPaymentTermsFeedback({ action, label });

    window.setTimeout(() => {
      setPaymentTermsFeedback((current) =>
        current?.action === action ? null : current,
      );
    }, 1600);
  };

  const copyPaymentTerms = async (pack: PaymentTermsPack) => {
    try {
      await writeClipboardText(pack.termsMarkdown);
      setTemporaryPaymentTermsFeedback("copy", "Copied");
    } catch {
      setTemporaryPaymentTermsFeedback("copy", "Terms ready");
    }
  };

  const downloadPaymentTerms = (pack: PaymentTermsPack) => {
    downloadTextFile(
      "superchain-payment-terms.md",
      pack.termsMarkdown,
      "text/markdown;charset=utf-8",
    );
    setTemporaryPaymentTermsFeedback("download", "Downloaded");
  };

  const setTemporaryLeadTargetFeedback = (
    action: LeadTargetFeedbackAction,
    label: string,
  ) => {
    setLeadTargetFeedback({ action, label });

    window.setTimeout(() => {
      setLeadTargetFeedback((current) =>
        current?.action === action ? null : current,
      );
    }, 1600);
  };

  const copyLeadTargetList = async (list: LeadTargetList) => {
    try {
      await writeClipboardText(list.markdown);
      setTemporaryLeadTargetFeedback("copy", "Copied");
    } catch {
      setTemporaryLeadTargetFeedback("copy", "List ready");
    }
  };

  const downloadLeadTargetCsv = (list: LeadTargetList) => {
    downloadTextFile(
      "superchain-lead-target-list.csv",
      list.csv,
      "text/csv;charset=utf-8",
    );
    setTemporaryLeadTargetFeedback("download-csv", "Downloaded");
  };

  const downloadLeadTargetJson = (list: LeadTargetList) => {
    downloadTextFile(
      "superchain-lead-target-list.json",
      list.json,
      "application/json;charset=utf-8",
    );
    setTemporaryLeadTargetFeedback("download-json", "Downloaded");
  };

  const openLeadTarget = (leadId: string) => {
    setSelectedLeadId(leadId);
    window.setTimeout(() => {
      window.location.hash = "outreach";
      document.getElementById("outreach")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  };

  const setTemporaryOutreachFeedback = (
    action: OutreachFeedbackAction,
    label: string,
  ) => {
    setOutreachFeedback({ action, label });

    window.setTimeout(() => {
      setOutreachFeedback((current) =>
        current?.action === action ? null : current,
      );
    }, 1600);
  };

  const updateLeadCrm = (leadId: string, patch: Parameters<typeof updateOutreachCrmRecord>[2]) => {
    setCrmRecords((current) => updateOutreachCrmRecord(current, leadId, patch));
  };

  const updateLeadStatus = (leadId: string, status: LeadStatus) => {
    updateLeadCrm(leadId, { status });
  };

  const updateLeadNotes = (leadId: string, notes: string) => {
    updateLeadCrm(leadId, { notes });
  };

  const updateLeadLastContacted = (leadId: string, lastContacted: string) => {
    updateLeadCrm(leadId, { lastContacted });
  };

  const updateLeadNextFollowUp = (leadId: string, nextFollowUp: string) => {
    updateLeadCrm(leadId, { nextFollowUp });
  };

  const updateLeadContactName = (leadId: string, contactName: string) => {
    updateLeadCrm(leadId, { contactName });
  };

  const updateLeadContactChannel = (
    leadId: string,
    contactChannel: ContactChannel,
  ) => {
    updateLeadCrm(leadId, { contactChannel });
  };

  const updateLeadContactUrl = (leadId: string, contactUrl: string) => {
    updateLeadCrm(leadId, { contactUrl });
  };

  const updateLeadEnrichmentConfidence = (
    leadId: string,
    enrichmentConfidence: number,
  ) => {
    updateLeadCrm(leadId, { enrichmentConfidence });
  };

  const updateLeadEnrichmentStatus = (
    leadId: string,
    enrichmentStatus: ContactEnrichmentStatus,
  ) => {
    updateLeadCrm(leadId, { enrichmentStatus });
  };

  const updateLeadPitch = (leadId: string, selectedPitchId: PitchVariantId) => {
    updateLeadCrm(leadId, { selectedPitchId });
  };

  const copyLeadPitch = async (lead: OutreachLead, pitchId: PitchVariantId) => {
    const pitch = lead.pitches.find((item) => item.id === pitchId) ?? lead.pitches[0];
    const text = [`Subject: ${pitch.subject}`, "", pitch.body].join("\n");
    updateLeadPitch(lead.id, pitch.id);

    try {
      await writeClipboardText(text);
      setTemporaryOutreachFeedback("pitch", "Copied");
    } catch {
      setTemporaryOutreachFeedback("pitch", "Pitch ready");
    }
  };

  const downloadOutreachCsv = (pipeline: OutreachPipeline) => {
    downloadTextFile(
      "superchain-outreach-leads.csv",
      pipeline.leadsCsv,
      "text/csv;charset=utf-8",
    );
    setTemporaryOutreachFeedback("csv", "Downloaded");
  };

  const downloadOutreachJson = (pipeline: OutreachPipeline) => {
    downloadTextFile(
      "superchain-outreach-pipeline.json",
      pipeline.pipelineJson,
      "application/json;charset=utf-8",
    );
    setTemporaryOutreachFeedback("json", "Downloaded");
  };

  return (
    <div className="app">
      <header className="opHeader">
        <div className="opMark" aria-hidden="true">
          OP
        </div>
        <div className="brandBlock">
          <strong>Superchain Liquidity Ops</strong>
          <span>Impact Console for DEX liquidity and incentive programs</span>
        </div>
        <nav className="topNav" aria-label="Product areas">
          <a href="#protocol-scanner">Scanner</a>
          <a href="#reports">Reports</a>
          <a href="#methodology">Methodology</a>
          <a href="#case-studies">Case studies</a>
          <a href="#sample-reports">Sample reports</a>
          <a href="#trust-proof">Trust proof</a>
          <a href="#request-report">Request report</a>
          <a href="#export-pack">Export pack</a>
          <a href="#scheduled-snapshots">Scheduled snapshots</a>
          <a href="#markets">Live markets</a>
          <a href="#reviewer-pack">Reviewer pack</a>
          <a href="#sources">Sources</a>
          {operatorMode ? (
            <>
              <a href="#pricing">Pricing</a>
              <a href="#payment-terms">Payment terms</a>
              <a href="#launch-desk">Launch desk</a>
              <a href="#service-layer">Service layer</a>
              <a href="#lead-targets">Lead targets</a>
              <a href="#outreach">Outreach</a>
            </>
          ) : null}
        </nav>
        <button
          className={`operatorToggle ${operatorMode ? "active" : ""}`}
          onClick={() => setOperatorMode((current) => !current)}
          type="button"
        >
          <Settings2 size={16} />
          {operatorMode ? "Operator on" : "Operator off"}
        </button>
      </header>

      <main className="main">
        <section className="hero">
          <div className="heroCopy">
            <p className="eyebrow">Optimism / Superchain public-good proof-of-work</p>
            <h1>Measure whether liquidity incentives create real DEX outcomes.</h1>
            <p>
              Open-source impact reporting for protocols and reviewers that need
              decision-ready evidence: live Superchain DEX volume, fee generation,
              source freshness, weak markets, and exportable incentive reports.
            </p>
          </div>

          <aside className="dataPanel">
            <div className={`statusDot ${liveState.className}`}>
              <span>{liveState.label}</span>
              <strong>{isLoading ? "Refreshing live data" : liveState.title}</strong>
            </div>
            <div className="dataPanelStats">
              <Stat label="Markets loaded" value={isLoading ? "..." : String(markets.length)} />
              <Stat label="Protocols scanned" value={String(protocolScans.length)} />
              <Stat label="Sources checked" value={String(snapshot?.sources.length ?? 0)} />
              <Stat label="Last refresh" value={lastUpdated} />
              <Stat label="No local dataset" value="Live-first" />
            </div>
            <button className="refreshButton" onClick={refreshData} disabled={isLoading}>
              <RefreshCcw size={18} />
              Refresh
            </button>
          </aside>
        </section>

        <section className="commandBar">
          <div className="commandTitle">
            <SlidersHorizontal size={18} />
            <span>Scope controls</span>
          </div>
          <label>
            Network
            <select
              value={network}
              onChange={(event) => setNetwork(event.target.value as NetworkScope)}
            >
              {networks.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            Outcome target
            <select
              value={target}
              onChange={(event) => setTarget(event.target.value as typeof target)}
            >
              {targets.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <button className="exportButton" onClick={exportCsv} disabled={filteredMarkets.length === 0}>
            <ArrowDownToLine size={18} />
            Export report
          </button>
        </section>

        {loadError ? <div className="alertPanel">{loadError}</div> : null}

        <section className="metricRail">
          <Metric icon={<BarChart3 />} label="24h DEX volume" value={compactUsd.format(totals.volume24h)} />
          <Metric icon={<Layers3 />} label="30d DEX volume" value={compactUsd.format(totals.volume30d)} />
          <Metric icon={<CircleDollarSign />} label="30d fees" value={formatOptionalUsd(totals.fees30d)} />
          <Metric icon={<Gauge />} label="Fee / volume" value={formatOptionalPct(totals.feeToVolume)} />
          <Metric icon={<TrendingUp />} label="7d market trend" value={`${pct.format(totals.weightedChange7d)}%`} />
          <Metric icon={<Radar />} label="Watchlist markets" value={String(totals.watchCount)} />
        </section>

        <section className="protocolScanner" id="protocol-scanner">
          <div className="sectionHeader">
            <div>
              <p className="sectionKicker">Protocol Scanner</p>
              <h2>Find protocols worth evidence review</h2>
            </div>
            <span>{isLoading ? "Scanning" : `${protocolScans.length} protocol targets`}</span>
          </div>

          <div className="scannerGrid">
            <div className="scannerList">
              <div className="scannerHead">
                <span>Score</span>
                <span>Protocol</span>
                <span>30d volume</span>
                <span>30d fees</span>
                <span>Status</span>
              </div>
              {protocolScans.length > 0 ? (
                protocolScans.map((scan) => (
                  <button
                    className={`protocolRow ${scan.id === selectedProtocol?.id ? "selected" : ""}`}
                    key={scan.id}
                    onClick={() => setSelectedProtocolId(scan.id)}
                  >
                    <span className={`scorePill grade-${scan.healthScore.grade.toLowerCase()}`}>
                      <strong>{scan.score}</strong>
                      <small>{scan.healthScore.grade}</small>
                    </span>
                    <span>
                      <strong>{scan.name}</strong>
                      <small>
                        {scan.networks.join(", ")} / {scan.marketCount} markets
                      </small>
                    </span>
                    <strong>{compactUsd.format(scan.volume30dUsd)}</strong>
                    <strong>{formatOptionalUsd(scan.fees30dUsd)}</strong>
                    <ProtocolStatus value={scan.status} />
                  </button>
                ))
              ) : (
                <div className="emptyState">
                  {isLoading ? "Scanning live protocols..." : "No tracked protocol matched live markets."}
                </div>
              )}
            </div>

            <aside className="scannerDetail">
              {selectedProtocol ? (
                <>
                  <div className="scannerDetailHead">
                    <div>
                      <p className="sectionKicker">Selected target</p>
                      <h2>{selectedProtocol.name}</h2>
                      <span>{selectedProtocol.segment}</span>
                    </div>
                    <div className={`scoreDial grade-${selectedProtocol.healthScore.grade.toLowerCase()}`}>
                      <span>Grade</span>
                      <strong>{selectedProtocol.healthScore.grade}</strong>
                      <small>{selectedProtocol.score}/100</small>
                    </div>
                  </div>

                  <p className="scannerThesis">{selectedProtocol.thesis}</p>

                  <div className="focusGrid">
                    <Stat label="Networks" value={selectedProtocol.networks.join(", ")} />
                    <Stat label="Markets" value={String(selectedProtocol.marketCount)} />
                    <Stat label="7d trend" value={formatOptionalPct(selectedProtocol.weightedChange7dPct)} />
                    <Stat label="Fee / volume" value={formatOptionalPct(selectedProtocol.feeToVolume30dPct)} />
                    <Stat label="Strong markets" value={String(selectedProtocol.strongMarkets)} />
                    <Stat label="Risk markets" value={String(selectedProtocol.atRiskMarkets)} />
                    <Stat label="Data confidence" value={`${selectedProtocol.healthScore.confidence}/100`} />
                    <Stat label="Health grade" value={selectedProtocol.healthScore.grade} />
                  </div>

                  <HealthScoreBreakdown scan={selectedProtocol} />

                  {miniReport ? (
                    <MiniReportPanel
                      feedback={
                        reportFeedback?.protocolId === miniReport.protocolId
                          ? reportFeedback.label
                          : null
                      }
                      onCopy={() => void copyMiniReport(miniReport)}
                      onDownload={() => downloadMiniReport(miniReport)}
                      onPrint={() => printMiniReport(miniReport)}
                      report={miniReport}
                    />
                  ) : null}

                  <div className="scannerAction">
                    <span>Evidence opportunity</span>
                    <strong>{selectedProtocol.status}</strong>
                    <p>{selectedProtocol.opportunity}</p>
                    <p>{selectedProtocol.healthScore.recommendation}</p>
                    <button onClick={() => void copyProtocolSummary(selectedProtocol)}>
                      <FileCheck2 size={17} />
                      {copyFeedback?.protocolId === selectedProtocol.id
                        ? copyFeedback.label
                        : "Copy protocol summary"}
                    </button>
                  </div>
                </>
              ) : (
                <div className="emptyState">Select a protocol scan to inspect the evidence angle.</div>
              )}
            </aside>
          </div>
        </section>

        <MethodologySection />

        <ReportsSection
          feedbackFor={(report) =>
            reportFeedback?.protocolId === report.protocolId
              ? reportFeedback.label
              : null
          }
          isLoading={isLoading}
          items={reportItems}
          onCopy={(report) => void copyMiniReport(report)}
          onDownload={downloadMiniReport}
          onPrint={printMiniReport}
          onSelectReport={setSelectedReportId}
          selectedItem={selectedReportItem}
        />

        <CaseStudiesSection
          feedback={caseStudyFeedback}
          isLoading={isLoading}
          items={caseStudies}
          onCopy={(caseStudy) => void copyCaseStudy(caseStudy)}
          onDownload={downloadCaseStudy}
          onDownloadJson={downloadCaseStudiesJson}
          onPrint={printCaseStudy}
          onSelectCaseStudy={setSelectedCaseStudyId}
          selectedCaseStudy={selectedCaseStudy}
        />

        <SampleReportsSection
          feedback={sampleReportFeedback}
          isLoading={isLoading}
          items={sampleReports}
          onCopy={(report) => void copySampleReport(report)}
          onDownload={downloadSampleReport}
          onDownloadJson={downloadSampleReportsJson}
          onPrint={printSampleReport}
          onSelectReport={setSelectedSampleReportId}
          selectedReport={selectedSampleReport}
        />

        <StaticSampleFilesSection
          files={STATIC_SAMPLE_FILES}
          manifestUrl={STATIC_SAMPLE_MANIFEST_URL}
        />

        <TrustProofSection pack={trustProofPack} />

        <RequestReportSection
          feedback={requestFeedback}
          form={activeRequestForm}
          onCopyRequest={() => void copyRequestMarkdown(requestReportPack)}
          onCopyTelegram={() => void copyTelegramRequest(requestReportPack)}
          onDownloadJson={() => downloadRequestJson(requestReportPack)}
          onDownloadRequest={() => downloadRequestMarkdown(requestReportPack)}
          onReset={resetRequestForm}
          onUpdate={updateRequestForm}
          pack={requestReportPack}
        />

        <IntakeFormSection
          chainOptions={INTAKE_CHAIN_OPTIONS}
          decisionOptions={INTAKE_DECISIONS}
          deliverableFormats={INTAKE_DELIVERABLE_FORMATS}
          feedback={intakeFeedback}
          form={activeIntakeForm}
          metricOptions={INTAKE_METRIC_OPTIONS}
          onCopyIntake={() => void copyIntakeMarkdown(intakePack)}
          onCopyTelegram={() => void copyIntakeTelegram(intakePack)}
          onDeleteRecord={deleteIntakeRecord}
          onDownloadIntake={() => downloadIntakeMarkdown(intakePack)}
          onDownloadJson={() => downloadIntakeJson(intakePack)}
          onExportRecords={exportIntakeRecords}
          onLoadRecord={loadIntakeRecord}
          onReset={resetIntakeForm}
          onSave={saveCurrentIntake}
          onToggleChain={toggleIntakeChain}
          onToggleMetric={toggleIntakeMetric}
          onUpdate={updateIntakeForm}
          pack={intakePack}
          records={intakeRecords}
          selectedRecord={selectedIntakeRecord}
        />

        <ExportPackSection
          feedback={
            exportPackFeedback?.protocolId === selectedExportPack?.protocolId
              ? exportPackFeedback
              : null
          }
          isLoading={isLoading}
          onCopyHandoff={(pack) => void copyExportPackHandoff(pack)}
          onDownloadArtifact={downloadExportPackArtifact}
          onDownloadPack={downloadExportPackJson}
          pack={selectedExportPack}
        />

        <AutomationSection
          feedback={automationFeedback}
          isLoading={isLoading}
          onCopyRunbook={() => void copyAutomationRunbook()}
          onDownloadRunbook={downloadAutomationRunbook}
          onRun={runAutomation}
          run={automationRun}
        />

        <ScheduledSnapshotsSection
          feedback={scheduledSnapshotFeedback}
          onCopy={() => void copyScheduledSnapshotPlan(scheduledSnapshotsPack)}
          onDownloadJson={() => downloadScheduledSnapshotJson(scheduledSnapshotsPack)}
          onDownloadMarkdown={() => downloadScheduledSnapshotMarkdown(scheduledSnapshotsPack)}
          onDownloadYaml={() => downloadScheduledSnapshotYaml(scheduledSnapshotsPack)}
          pack={scheduledSnapshotsPack}
        />

        {operatorMode ? (
          <section className="operatorWorkspace" id="operator-workspace">
            <div className="sectionHeader">
              <div>
                <p className="sectionKicker">Operator mode</p>
                <h2>Internal sales and delivery workspace</h2>
              </div>
              <span>Hidden from public view by default</span>
            </div>

            <OfferPricingSection
              feedback={serviceFeedback}
              layer={serviceLayer}
              onCopyBrief={(offer) => void copyServiceBrief(offer)}
              onCopyPricing={() => void copyPricingSheet(serviceLayer)}
              onDownloadPricing={() => downloadPricingSheet(serviceLayer)}
              onSelectOffer={setSelectedServiceOfferId}
              selectedOffer={selectedServiceOffer}
            />

            <PaymentTermsSection
              feedback={paymentTermsFeedback}
              onCopy={() => void copyPaymentTerms(paymentTermsPack)}
              onDownload={() => downloadPaymentTerms(paymentTermsPack)}
              pack={paymentTermsPack}
            />

            <LaunchDeskSection
              feedback={launchFeedback}
              kit={salesKit}
              onCopyEmail={() => void copyOnboardingEmail(salesKit)}
              onCopyProposal={() => void copyLaunchProposal(salesKit)}
              onDownloadChecklist={() => downloadDeliveryChecklist(salesKit)}
              onDownloadJson={() => downloadSalesKitJson(salesKit)}
              onDownloadProposal={() => downloadLaunchProposal(salesKit)}
            />

            <ServiceLayerSection
              feedback={serviceFeedback}
              layer={serviceLayer}
              onCopyBrief={(offer) => void copyServiceBrief(offer)}
              onDownloadBrief={downloadServiceBrief}
              onDownloadJson={downloadServiceJson}
              onSelectOffer={setSelectedServiceOfferId}
              selectedOffer={selectedServiceOffer}
            />

            <LeadTargetListSection
              feedback={leadTargetFeedback}
              list={leadTargetList}
              onCopy={() => void copyLeadTargetList(leadTargetList)}
              onDownloadCsv={() => downloadLeadTargetCsv(leadTargetList)}
              onDownloadJson={() => downloadLeadTargetJson(leadTargetList)}
              onOpenLead={openLeadTarget}
            />

            <OutreachPipelineSection
              feedback={outreachFeedback}
              contactChannels={CONTACT_CHANNELS}
              contactEnrichmentStatuses={CONTACT_ENRICHMENT_STATUSES}
              leadStatuses={leadStatuses}
              onCopyPitch={(lead, pitchId) => void copyLeadPitch(lead, pitchId)}
              onDownloadCsv={downloadOutreachCsv}
              onDownloadJson={downloadOutreachJson}
              onSelectLead={setSelectedLeadId}
              onSelectPitch={updateLeadPitch}
              onUpdateContactChannel={updateLeadContactChannel}
              onUpdateContactName={updateLeadContactName}
              onUpdateContactUrl={updateLeadContactUrl}
              onUpdateEnrichmentConfidence={updateLeadEnrichmentConfidence}
              onUpdateEnrichmentStatus={updateLeadEnrichmentStatus}
              onUpdateLastContacted={updateLeadLastContacted}
              onUpdateLeadStatus={updateLeadStatus}
              onUpdateNextFollowUp={updateLeadNextFollowUp}
              onUpdateNotes={updateLeadNotes}
              pipeline={outreachPipeline}
              selectedLead={selectedLead}
              selectedPitchId={selectedLead?.selectedPitchId ?? "dm"}
            />
          </section>
        ) : null}

        <section className="workbench" id="markets">
          <section className="poolMatrix">
            <div className="sectionHeader">
              <div>
                <p className="sectionKicker">Live DefiLlama DEX markets</p>
                <h2>Volume, fees and reviewer watchlist</h2>
              </div>
              <span>{isLoading ? "Loading" : `${filteredMarkets.length} markets in scope`}</span>
            </div>

            <div className="table">
              <div className="tableHead">
                <span>Market</span>
                <span>24h vol</span>
                <span>7d vol</span>
                <span>30d vol</span>
                <span>30d fees</span>
                <span>Health</span>
              </div>
              {filteredMarkets.length > 0 ? (
                filteredMarkets.map((market) => (
                  <button
                    className={`poolRow ${market.id === selectedMarket?.id ? "selected" : ""}`}
                    key={market.id}
                    onClick={() => setSelectedMarketId(market.id)}
                  >
                    <span>
                      <strong>{market.dex}</strong>
                      <small>
                        {market.network} / {market.category} / {market.slug}
                      </small>
                    </span>
                    <strong>{compactUsd.format(market.volume24hUsd)}</strong>
                    <strong>{formatOptionalUsd(market.volume7dUsd)}</strong>
                    <strong>{formatOptionalUsd(market.volume30dUsd)}</strong>
                    <strong>{formatOptionalUsd(market.fees30dUsd)}</strong>
                    <Health value={market.health} />
                  </button>
                ))
              ) : (
                <div className="emptyState">
                  {isLoading ? "Loading live markets..." : "No live markets match the current filters."}
                </div>
              )}
            </div>
          </section>

          <aside className="reviewColumn">
            <section className="reviewPanel">
              {selectedMarket ? (
                <>
                  <div className="sectionHeader compactHeader">
                    <div>
                      <p className="sectionKicker">Reviewer focus</p>
                      <h2>{selectedMarket.dex}</h2>
                    </div>
                    <Health value={selectedMarket.health} />
                  </div>
                  <div className="focusGrid">
                    <Stat label="Network" value={selectedMarket.network} />
                    <Stat label="Category" value={selectedMarket.category} />
                    <Stat label="24h volume" value={compactUsd.format(selectedMarket.volume24hUsd)} />
                    <Stat label="7d change" value={formatOptionalPct(selectedMarket.change7dPct)} />
                    <Stat label="30d fee / volume" value={formatOptionalPct(selectedMarket.feeToVolume30dPct)} />
                    <Stat label="DefiLlama slug" value={selectedMarket.slug} />
                  </div>
                  <div className="outcomeBox">
                    <span>Outcome target</span>
                    <strong>{selectedMarket.outcomeTarget}</strong>
                    <p>{selectedMarket.note}</p>
                    <a href={selectedMarket.sourceUrl} target="_blank" rel="noreferrer">
                      Open live source <ExternalLink size={15} />
                    </a>
                  </div>
                </>
              ) : (
                <div className="emptyState">Select a live market to inspect reviewer signals.</div>
              )}
            </section>

            <section className="networkPanel" id="networks">
              <div className="sectionHeader compactHeader">
                <div>
                  <p className="sectionKicker">DefiLlama chain coverage</p>
                  <h2>TVL, DEX volume and fees</h2>
                </div>
                <Network size={20} />
              </div>
              <div className="chainBars">
                {chainRows.map((row) => (
                  <div className="chainBar" key={row.network}>
                    <div>
                      <strong>{row.network}</strong>
                      <span>
                        {formatOptionalUsd(row.tvlUsd)} TVL /{" "}
                        {formatOptionalUsd(row.dexVolume30dUsd)} 30d volume /{" "}
                        {formatOptionalUsd(row.fees30dUsd)} 30d fees
                      </span>
                    </div>
                    <div className="barTrack">
                      <span style={{ width: `${row.width}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </section>

        <section className="sourceAudit" id="sources">
          <div className="sectionHeader">
            <div>
              <p className="sectionKicker">Source audit</p>
              <h2>Every number links back to a public endpoint</h2>
            </div>
            <span>{liveState.title}</span>
          </div>
          <div className="sourceGrid">
            {(snapshot?.sources ?? []).map((source) => (
              <SourceItem source={source} key={source.id} />
            ))}
            {!snapshot && (
              <div className="emptyState">
                {isLoading ? "Checking public data sources..." : "No source status available."}
              </div>
            )}
          </div>
        </section>

        <section className="reviewerPack" id="reviewer-pack">
          <div className="sectionHeader">
            <div>
              <p className="sectionKicker">Grant reviewer pack</p>
              <h2>How to evaluate this tool against OP outcomes</h2>
            </div>
            <span>Evidence-first</span>
          </div>

          <div className="packHero">
            <div>
              <strong>Reviewer question</strong>
              <h2>Does this help Optimism measure DEX liquidity and fee outcomes?</h2>
              <p>
                The product maps live Superchain DEX data into a repeatable review workflow:
                inspect chain coverage, identify markets with weak fee output, export evidence,
                and compare results against TVL, fee and volume goals.
              </p>
            </div>
            <a href="https://www.opgrants.io/seasons/current/season-9/" target="_blank" rel="noreferrer">
              OP grant criteria <ExternalLink size={16} />
            </a>
          </div>

          <div className="packGrid">
            <PackCard
              icon={<Target />}
              title="Outcome fit"
              text="Maps directly to OP grant metrics: DEX liquidity, fee generation, volume efficiency and priority-market monitoring."
            />
            <PackCard
              icon={<DatabaseZap />}
              title="Verifiable data"
              text="Uses public DefiLlama endpoints and exposes source status, timestamps and live protocol links."
            />
            <PackCard
              icon={<FileCheck2 />}
              title="Review workflow"
              text="Reviewer can filter by Superchain network, inspect watchlists and export CSV evidence for offline analysis."
            />
            <PackCard
              icon={<ShieldCheck />}
              title="No hidden assumptions"
              text="Unavailable metrics are marked unavailable instead of being replaced with manual numbers."
            />
          </div>

          <div className="milestoneGrid">
            <PackStep
              label="Now"
              title="Live proof-of-work"
              text="Hosted dashboard, open-source repo, live Superchain DEX market data, source audit and CSV export."
            />
            <PackStep
              label="Next"
              title="Priority-pair adapter"
              text="Add OP priority-pair configuration, pair-level metadata and pool-specific ingestion where browser APIs are insufficient."
            />
            <PackStep
              label="Launch"
              title="Reviewer reports"
              text="Produce repeatable before/after grant reports with 7d and 30d windows, methodology docs and JSON exports."
            />
          </div>
        </section>

        <section className="impactStrip" id="exports">
          <Impact icon={<LineChart />} title="Live outcome metrics" text="DEX market volume, chain TVL and fee totals are refreshed from public endpoints." />
          <Impact icon={<DatabaseZap />} title="No hidden spreadsheet" text="The app does not import a local metric dataset; unavailable endpoints are surfaced as source errors." />
          <Impact icon={<GitBranch />} title="Reviewer-ready CSV" text="Exports include source URLs, timestamps, DEX slugs and derived health labels." />
          <Impact icon={<Target />} title="Superchain scope" text="The data layer is scoped to OP Mainnet, Base, Unichain, Mode and Zora." />
        </section>
      </main>
    </div>
  );
}

function OfferPricingSection({
  feedback,
  layer,
  onCopyBrief,
  onCopyPricing,
  onDownloadPricing,
  onSelectOffer,
  selectedOffer,
}: {
  feedback: {
    action: ServiceFeedbackAction;
    label: string;
  } | null;
  layer: ServiceLayer;
  onCopyBrief: (offer: ServiceOffer) => void;
  onCopyPricing: () => void;
  onDownloadPricing: () => void;
  onSelectOffer: (offerId: ServiceOffer["id"]) => void;
  selectedOffer: ServiceOffer | null;
}) {
  const feedbackFor = (action: ServiceFeedbackAction) =>
    feedback?.action === action ? feedback.label : null;

  return (
    <section className="pricingSection" id="pricing">
      <div className="sectionHeader">
        <div>
          <p className="sectionKicker">Offer / Pricing</p>
          <h2>Clear packages for teams that need liquidity evidence</h2>
        </div>
        <span>{layer.readyCount} ready to sell</span>
      </div>

      <div className="pricingLead">
        <article className="pricingCopy">
          <span>Commercial page</span>
          <h3>Buy a narrow report first. Expand only when the data proves value.</h3>
          <p>
            These packages turn the live scanner, public sample reports, export pack
            and outreach workflow into fixed-scope services with visible price ranges,
            delivery timelines and acceptance criteria.
          </p>

          <div className="pricingStats">
            <Stat label="Scope" value={layer.scopeLabel} />
            <Stat label="Recommended" value={layer.recommendedOfferName} />
            <Stat label="Pipeline" value={layer.totalPipelineLabel} />
            <Stat label="Updated" value={new Date(layer.generatedAt).toLocaleDateString()} />
          </div>

          <div className="pricingActions">
            <button onClick={onCopyPricing}>
              <FileCheck2 size={17} />
              {feedbackFor("copy-pricing") ?? "Copy pricing sheet"}
            </button>
            <button onClick={onDownloadPricing}>
              <ArrowDownToLine size={17} />
              {feedbackFor("download-pricing") ?? "Download pricing .md"}
            </button>
          </div>
        </article>

        <aside className="pricingProcess">
          <span>Buyer path</span>
          <strong>1. Pick a package</strong>
          <strong>2. Confirm protocol scope</strong>
          <strong>3. Deliver report and export pack</strong>
          <strong>4. Move to monitoring if useful</strong>
        </aside>
      </div>

      <div className="pricingGrid">
        {layer.offers.map((offer) => {
          const isSelected = offer.id === selectedOffer?.id;

          return (
            <article
              className={`pricingCard ${serviceStatusClass(offer.status)} ${
                isSelected ? "selected" : ""
              }`}
              key={offer.id}
            >
              <div className="pricingCardHead">
                <span>{offer.status}</span>
                <strong>{offer.priceLabel}</strong>
              </div>

              <h3>{offer.name}</h3>
              <p>{offer.audience}</p>

              <div className="pricingMiniStats">
                <Stat label="Timeline" value={offer.timeline} />
                <Stat label="Fit" value={`${offer.fitScore}/100`} />
                <Stat label="Protocol" value={offer.protocolName} />
              </div>

              <div className="pricingProblem">
                <Target size={18} />
                <strong>{offer.salesAngle}</strong>
              </div>

              <div className="pricingDeliverables">
                <span>Included</span>
                {offer.deliverables.map((item) => (
                  <strong key={item}>{item}</strong>
                ))}
              </div>

              <div className="pricingCardActions">
                <button onClick={() => onSelectOffer(offer.id)}>
                  <Route size={17} />
                  {isSelected ? "Selected" : "Select package"}
                </button>
                <button onClick={() => onCopyBrief(offer)}>
                  <FileCheck2 size={17} />
                  {isSelected && feedbackFor("copy-brief")
                    ? feedbackFor("copy-brief")
                    : "Copy buyer brief"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function PaymentTermsSection({
  feedback,
  onCopy,
  onDownload,
  pack,
}: {
  feedback: {
    action: PaymentTermsFeedbackAction;
    label: string;
  } | null;
  onCopy: () => void;
  onDownload: () => void;
  pack: PaymentTermsPack;
}) {
  const feedbackFor = (action: PaymentTermsFeedbackAction) =>
    feedback?.action === action ? feedback.label : null;

  return (
    <section className="paymentTermsSection" id="payment-terms">
      <div className="sectionHeader">
        <div>
          <p className="sectionKicker">Payment / Terms</p>
          <h2>Make the first paid report easy to agree</h2>
        </div>
        <span>Manual payment</span>
      </div>

      <div className="paymentTermsLayout">
        <article className="paymentTermsLead">
          <div className="paymentTermsTitle">
            <CircleDollarSign size={24} />
            <div>
              <span>Commercial terms</span>
              <h3>Scope, payment and handoff rules before delivery starts</h3>
            </div>
          </div>
          <p>{pack.summary}</p>

          <div className="paymentTermsValues">
            {pack.values.map((item) => (
              <div key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>

          <div className="paymentTermsActions">
            <button onClick={onCopy}>
              <FileCheck2 size={17} />
              {feedbackFor("copy") ?? "Copy terms"}
            </button>
            <button onClick={onDownload}>
              <ArrowDownToLine size={17} />
              {feedbackFor("download") ?? "Download terms .md"}
            </button>
          </div>
        </article>

        <aside className="paymentMethodsPanel">
          <span>Payment methods</span>
          {pack.methods.map((method) => (
            <div className="paymentMethodItem" key={method}>
              <ShieldCheck size={18} />
              <strong>{method}</strong>
            </div>
          ))}
          <small>
            Generated: {new Date(pack.generatedAt).toLocaleString()}
          </small>
        </aside>

        <div className="paymentGateGrid">
          {pack.gates.map((gate, index) => (
            <article className="paymentGateCard" key={gate.id}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{gate.title}</h3>
              <p>{gate.detail}</p>
            </article>
          ))}
        </div>

        <aside className="paymentPolicyPanel">
          <div>
            <span>Terms boundary</span>
            <h3>What is included, and what must be re-scoped</h3>
          </div>
          <div className="paymentPolicyList">
            {pack.policies.map((policy) => (
              <div className="paymentPolicyItem" key={policy.title}>
                <FileCheck2 size={18} />
                <div>
                  <strong>{policy.title}</strong>
                  <p>{policy.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}

function LaunchDeskSection({
  feedback,
  kit,
  onCopyEmail,
  onCopyProposal,
  onDownloadChecklist,
  onDownloadJson,
  onDownloadProposal,
}: {
  feedback: {
    action: LaunchFeedbackAction;
    label: string;
  } | null;
  kit: SalesKit;
  onCopyEmail: () => void;
  onCopyProposal: () => void;
  onDownloadChecklist: () => void;
  onDownloadJson: () => void;
  onDownloadProposal: () => void;
}) {
  const feedbackFor = (action: LaunchFeedbackAction) =>
    feedback?.action === action ? feedback.label : null;
  const proposalPreview = kit.proposalMarkdown.split("\n").slice(0, 30).join("\n");

  return (
    <section className="launchDeskSection" id="launch-desk">
      <div className="sectionHeader">
        <div>
          <p className="sectionKicker">Launch Desk</p>
          <h2>Final sales kit for closing and delivering the first client</h2>
        </div>
        <span>{kit.status}</span>
      </div>

      <div className="launchDeskLayout">
        <article className="launchLead">
          <div className="launchTitle">
            <span>Readiness score</span>
            <h3>{kit.readinessScore}/100</h3>
            <strong className={`launchStatus ${launchStatusClass(kit.status)}`}>
              {kit.status}
            </strong>
          </div>

          <p>{kit.summary}</p>

          <div className="launchStats">
            <Stat label="Package" value={kit.packageName} />
            <Stat label="Price" value={kit.priceLabel} />
            <Stat label="Timeline" value={kit.timeline} />
            <Stat label="Target" value={kit.targetProtocol} />
          </div>

          <div className="launchActions">
            <button onClick={onCopyProposal}>
              <FileCheck2 size={17} />
              {feedbackFor("copy-proposal") ?? "Copy proposal"}
            </button>
            <button onClick={onDownloadProposal}>
              <ArrowDownToLine size={17} />
              {feedbackFor("download-proposal") ?? "Download proposal"}
            </button>
            <button onClick={onCopyEmail}>
              <Mail size={17} />
              {feedbackFor("copy-email") ?? "Copy onboarding email"}
            </button>
            <button onClick={onDownloadChecklist}>
              <Route size={17} />
              {feedbackFor("download-checklist") ?? "Download checklist"}
            </button>
            <button onClick={onDownloadJson}>
              <DatabaseZap size={17} />
              {feedbackFor("download-json") ?? "Download sales JSON"}
            </button>
          </div>

          <pre className="launchProposalPreview">{proposalPreview}</pre>
        </article>

        <aside className="launchChecklistPanel">
          <div className="launchPanelHeader">
            <span>Launch checks</span>
            <strong>What must be true before asking for money</strong>
          </div>

          <div className="launchChecklist">
            {kit.checklist.map((item) => (
              <article
                className={`launchCheck ${checklistStatusClass(item.status)}`}
                key={item.id}
              >
                <span>{item.status}</span>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </article>
            ))}
          </div>

          <div className="launchIntake">
            <span>Client intake</span>
            {kit.intakeQuestions.map((question) => (
              <strong key={question}>{question}</strong>
            ))}
          </div>
        </aside>
      </div>

      <div className="launchProofGrid">
        <section>
          <span>Selected proof</span>
          <strong>{kit.sampleReportTitle}</strong>
          <small>{kit.exportPackTitle}</small>
          <small>{kit.targetLead}</small>
        </section>
        <section>
          <span>Buyer FAQ</span>
          {kit.buyerFaq.map((item) => (
            <details key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </section>
        <section>
          <span>Terms boundary</span>
          {kit.terms.map((term) => (
            <strong key={term}>{term}</strong>
          ))}
        </section>
      </div>
    </section>
  );
}

function RequestReportSection({
  feedback,
  form,
  onCopyRequest,
  onCopyTelegram,
  onDownloadJson,
  onDownloadRequest,
  onReset,
  onUpdate,
  pack,
}: {
  feedback: {
    action: RequestFeedbackAction;
    label: string;
  } | null;
  form: RequestReportForm;
  onCopyRequest: () => void;
  onCopyTelegram: () => void;
  onDownloadJson: () => void;
  onDownloadRequest: () => void;
  onReset: () => void;
  onUpdate: (patch: Partial<RequestReportForm>) => void;
  pack: RequestReportPack;
}) {
  const feedbackFor = (action: RequestFeedbackAction) =>
    feedback?.action === action ? feedback.label : null;
  const budgetOptions = Array.from(new Set([form.budget, ...REQUEST_BUDGETS]));
  const preview = pack.requestMarkdown.split("\n").slice(0, 34).join("\n");

  return (
    <section className="requestReportSection" id="request-report">
      <div className="sectionHeader">
        <div>
          <p className="sectionKicker">Contact / Request Report</p>
          <h2>Make it easy to request an evidence report</h2>
        </div>
        <span>{pack.title}</span>
      </div>

      <div className="requestLayout">
        <article className="requestLead">
          <div className="requestTitle">
            <span>Request pack</span>
            <h3>{pack.summary}</h3>
            <small>{new Date(pack.generatedAt).toLocaleString()}</small>
          </div>

          <div className="requestMetaGrid">
            <Stat label="Protocol" value={form.protocol || "Not set"} />
            <Stat label="Budget" value={form.budget || "Need quote"} />
            <Stat label="Deadline" value={form.deadline || "Flexible"} />
            <Stat label="Route" value={form.contact || "Manual"} />
          </div>

          <div className="requestActions">
            <button type="button" onClick={onCopyRequest}>
              <FileCheck2 size={17} />
              {feedbackFor("copy-request") ?? "Copy request"}
            </button>
            <button type="button" onClick={onCopyTelegram}>
              <MessageSquare size={17} />
              {feedbackFor("copy-telegram") ?? "Copy Telegram text"}
            </button>
            <button type="button" onClick={onDownloadRequest}>
              <ArrowDownToLine size={17} />
              {feedbackFor("download-request") ?? "Download request"}
            </button>
            <button type="button" onClick={onDownloadJson}>
              <DatabaseZap size={17} />
              {feedbackFor("download-json") ?? "Download JSON"}
            </button>
            <a
              className="requestOpenIssue"
              href={pack.githubIssueUrl}
              target="_blank"
              rel="noreferrer"
            >
              <GitBranch size={17} />
              Open GitHub issue
              <ExternalLink size={15} />
            </a>
          </div>

          <pre className="requestPreview">{preview}</pre>
        </article>

        <aside className="requestFormPanel">
          <div className="requestFormHead">
            <div>
              <span>Client intake</span>
              <strong>Scope, contact, budget and delivery date</strong>
            </div>
            <button type="button" onClick={onReset}>
              <RefreshCcw size={16} />
              Reset
            </button>
          </div>

          <div className="requestFields">
            <label>
              Protocol / project
              <input
                value={form.protocol}
                onChange={(event) => onUpdate({ protocol: event.target.value })}
                placeholder="Protocol name"
              />
            </label>
            <label>
              Contact route
              <input
                value={form.contact}
                onChange={(event) => onUpdate({ contact: event.target.value })}
                placeholder="Telegram, email, X, Discord, GitHub"
              />
            </label>
            <label>
              Request type
              <select
                value={form.requestType}
                onChange={(event) =>
                  onUpdate({ requestType: event.target.value as RequestReportType })
                }
              >
                {REQUEST_TYPES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Deadline
              <input
                type="date"
                value={form.deadline}
                onChange={(event) => onUpdate({ deadline: event.target.value })}
              />
            </label>
            <label>
              Budget
              <select
                value={form.budget}
                onChange={(event) => onUpdate({ budget: event.target.value })}
              >
                {budgetOptions.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="requestNotes">
              Notes
              <textarea
                value={form.notes}
                onChange={(event) => onUpdate({ notes: event.target.value })}
                placeholder="What should the report answer?"
              />
            </label>
          </div>

          <div className="requestRoutes">
            {pack.contactRoutes.map((route) =>
              route.href ? (
                <a href={route.href} key={route.id} target="_blank" rel="noreferrer">
                  <span>{route.label}</span>
                  <strong>{route.value}</strong>
                  <small>{route.note}</small>
                  <ExternalLink size={15} />
                </a>
              ) : (
                <div className="requestRoute" key={route.id}>
                  <span>{route.label}</span>
                  <strong>{route.value}</strong>
                  <small>{route.note}</small>
                </div>
              ),
            )}
          </div>

          <div className="requestChecklist">
            <span>Delivery guardrails</span>
            {pack.intakeChecklist.map((item) => (
              <strong key={item}>{item}</strong>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}

function IntakeFormSection({
  chainOptions,
  decisionOptions,
  deliverableFormats,
  feedback,
  form,
  metricOptions,
  onCopyIntake,
  onCopyTelegram,
  onDeleteRecord,
  onDownloadIntake,
  onDownloadJson,
  onExportRecords,
  onLoadRecord,
  onReset,
  onSave,
  onToggleChain,
  onToggleMetric,
  onUpdate,
  pack,
  records,
  selectedRecord,
}: {
  chainOptions: string[];
  decisionOptions: Array<{ id: IntakeDecisionId; label: string }>;
  deliverableFormats: string[];
  feedback: {
    action: IntakeFeedbackAction;
    label: string;
  } | null;
  form: IntakeFormState;
  metricOptions: Array<{ id: IntakeMetricId; label: string }>;
  onCopyIntake: () => void;
  onCopyTelegram: () => void;
  onDeleteRecord: (recordId: string) => void;
  onDownloadIntake: () => void;
  onDownloadJson: () => void;
  onExportRecords: () => void;
  onLoadRecord: (record: IntakeRecord) => void;
  onReset: () => void;
  onSave: () => void;
  onToggleChain: (chain: string) => void;
  onToggleMetric: (metric: IntakeMetricId) => void;
  onUpdate: (patch: Partial<IntakeFormState>) => void;
  pack: IntakePack;
  records: IntakeRecord[];
  selectedRecord: IntakeRecord | null;
}) {
  const feedbackFor = (action: IntakeFeedbackAction) =>
    feedback?.action === action ? feedback.label : null;
  const preview = pack.intakeMarkdown.split("\n").slice(0, 36).join("\n");
  const publicIssueDisabled = !form.publicIssueOk;

  return (
    <section className="intakeFormSection" id="intake-form">
      <div className="sectionHeader">
        <div>
          <p className="sectionKicker">Intake Form</p>
          <h2>Capture scope before doing manual evidence work</h2>
        </div>
        <span>{pack.status}</span>
      </div>

      <div className="intakeLayout">
        <article className="intakeLead">
          <div className="intakeTitle">
            <span>Client intake</span>
            <h3>{pack.summary}</h3>
            <small>{new Date(pack.generatedAt).toLocaleString()}</small>
          </div>

          <div className="intakeStats">
            <Stat label="Status" value={pack.status} />
            <Stat label="Missing" value={String(pack.missingFields.length)} />
            <Stat label="Saved" value={String(records.length)} />
            <Stat label="Selected" value={selectedRecord?.title ?? "Current draft"} />
          </div>

          {pack.missingFields.length > 0 ? (
            <div className="intakeMissing">
              <span>Missing fields</span>
              {pack.missingFields.map((field) => (
                <strong key={field}>{field}</strong>
              ))}
            </div>
          ) : (
            <div className="intakeReady">
              <ShieldCheck size={18} />
              <strong>Ready to scope. Confirm payment and delivery terms manually.</strong>
            </div>
          )}

          <div className="intakeActions">
            <button type="button" onClick={onSave}>
              <FileCheck2 size={17} />
              {feedbackFor("save") ?? "Save intake"}
            </button>
            <button type="button" onClick={onCopyIntake}>
              <FileText size={17} />
              {feedbackFor("copy") ?? "Copy intake"}
            </button>
            <button type="button" onClick={onCopyTelegram}>
              <MessageSquare size={17} />
              {feedbackFor("telegram") ?? "Copy DM text"}
            </button>
            <button type="button" onClick={onDownloadIntake}>
              <ArrowDownToLine size={17} />
              {feedbackFor("download-md") ?? "Download MD"}
            </button>
            <button type="button" onClick={onDownloadJson}>
              <DatabaseZap size={17} />
              {feedbackFor("download-json") ?? "Download JSON"}
            </button>
            {publicIssueDisabled ? (
              <button className="intakeIssueDisabled" type="button" disabled>
                <GitBranch size={17} />
                Public issue locked
              </button>
            ) : (
              <a
                className="intakeIssueLink"
                href={pack.githubIssueUrl}
                target="_blank"
                rel="noreferrer"
              >
                <GitBranch size={17} />
                Open public issue
                <ExternalLink size={15} />
              </a>
            )}
          </div>

          <pre className="intakePreview">{preview}</pre>

          <div className="intakeRecordPanel">
            <div className="intakeRecordHead">
              <span>Saved intakes</span>
              <button
                type="button"
                onClick={onExportRecords}
                disabled={records.length === 0}
              >
                <DatabaseZap size={16} />
                {feedbackFor("export-records") ?? "Export all"}
              </button>
            </div>

            <div className="intakeRecordList">
              {records.length > 0 ? (
                records.map((record) => (
                  <article
                    className={`intakeRecord ${
                      record.id === selectedRecord?.id ? "selected" : ""
                    }`}
                    key={record.id}
                  >
                    <button type="button" onClick={() => onLoadRecord(record)}>
                      <span className={`intakeStatus ${intakeStatusClass(record.status)}`}>
                        {record.status}
                      </span>
                      <strong>{record.title}</strong>
                      <small>{new Date(record.updatedAt).toLocaleString()}</small>
                    </button>
                    <button
                      className="intakeDelete"
                      type="button"
                      onClick={() => onDeleteRecord(record.id)}
                    >
                      {feedbackFor("delete") ?? "Delete"}
                    </button>
                  </article>
                ))
              ) : (
                <div className="emptyState">No saved intake forms yet.</div>
              )}
            </div>
          </div>
        </article>

        <aside className="intakeFormPanel">
          <div className="intakeFormHead">
            <div>
              <span>Scope fields</span>
              <strong>Only enough information to quote and deliver</strong>
            </div>
            <button type="button" onClick={onReset}>
              <RefreshCcw size={16} />
              {feedbackFor("reset") ?? "Reset"}
            </button>
          </div>

          <div className="intakeFields">
            <label>
              Protocol / project
              <input
                value={form.protocolName}
                onChange={(event) => onUpdate({ protocolName: event.target.value })}
                placeholder="Protocol name"
              />
            </label>
            <label>
              Team / company
              <input
                value={form.teamName}
                onChange={(event) => onUpdate({ teamName: event.target.value })}
                placeholder="Team name"
              />
            </label>
            <label>
              Contact name
              <input
                value={form.contactName}
                onChange={(event) => onUpdate({ contactName: event.target.value })}
                placeholder="Name or handle"
              />
            </label>
            <label>
              Contact route
              <input
                value={form.contactRoute}
                onChange={(event) => onUpdate({ contactRoute: event.target.value })}
                placeholder="Telegram, email, X, Discord, GitHub"
              />
            </label>
            <label>
              Role
              <input
                value={form.role}
                onChange={(event) => onUpdate({ role: event.target.value })}
                placeholder="Growth, grants, BD, founder"
              />
            </label>
            <label>
              Decision supported
              <select
                value={form.decision}
                onChange={(event) =>
                  onUpdate({ decision: event.target.value as IntakeDecisionId })
                }
              >
                {decisionOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="intakeChoiceGroup">
            <span>Chains</span>
            <div>
              {chainOptions.map((chain) => (
                <button
                  className={form.chains.includes(chain) ? "selected" : ""}
                  key={chain}
                  type="button"
                  onClick={() => onToggleChain(chain)}
                >
                  {chain}
                </button>
              ))}
            </div>
          </div>

          <div className="intakeChoiceGroup">
            <span>Metric focus</span>
            <div>
              {metricOptions.map((metric) => (
                <button
                  className={form.metrics.includes(metric.id) ? "selected" : ""}
                  key={metric.id}
                  type="button"
                  onClick={() => onToggleMetric(metric.id)}
                >
                  {metric.label}
                </button>
              ))}
            </div>
          </div>

          <div className="intakeFields">
            <label>
              Deliverable format
              <select
                value={form.deliverableFormat}
                onChange={(event) =>
                  onUpdate({ deliverableFormat: event.target.value })
                }
              >
                {deliverableFormats.map((format) => (
                  <option key={format}>{format}</option>
                ))}
              </select>
            </label>
            <label>
              Budget
              <select
                value={form.budget}
                onChange={(event) => onUpdate({ budget: event.target.value })}
              >
                {Array.from(new Set([form.budget, ...INTAKE_BUDGETS])).map((budget) => (
                  <option key={budget}>{budget}</option>
                ))}
              </select>
            </label>
            <label>
              Deadline
              <input
                type="date"
                value={form.deadline}
                onChange={(event) => onUpdate({ deadline: event.target.value })}
              />
            </label>
            <label className="intakePublicFlag">
              Public GitHub issue OK
              <input
                checked={form.publicIssueOk}
                type="checkbox"
                onChange={(event) => onUpdate({ publicIssueOk: event.target.checked })}
              />
            </label>
            <label className="intakeWide">
              Source links
              <textarea
                value={form.sourceLinks}
                onChange={(event) => onUpdate({ sourceLinks: event.target.value })}
                placeholder="One public source URL per line"
              />
            </label>
            <label className="intakeWide">
              Notes
              <textarea
                value={form.notes}
                onChange={(event) => onUpdate({ notes: event.target.value })}
                placeholder="What should the report answer?"
              />
            </label>
          </div>

          <div className="intakeNextSteps">
            <span>Next steps</span>
            {pack.nextSteps.map((step) => (
              <strong key={step}>{step}</strong>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}

function ExportPackSection({
  feedback,
  isLoading,
  onCopyHandoff,
  onDownloadArtifact,
  onDownloadPack,
  pack,
}: {
  feedback: {
    action: ExportPackFeedbackAction;
    label: string;
    protocolId: string;
  } | null;
  isLoading: boolean;
  onCopyHandoff: (pack: ExportPack) => void;
  onDownloadArtifact: (pack: ExportPack, artifactId: ExportPackArtifactId) => void;
  onDownloadPack: (pack: ExportPack) => void;
  pack: ExportPack | null;
}) {
  const feedbackFor = (action: ExportPackFeedbackAction) =>
    feedback?.action === action ? feedback.label : null;

  return (
    <section className="exportPackSection" id="export-pack">
      <div className="sectionHeader">
        <div>
          <p className="sectionKicker">Export Pack</p>
          <h2>One handoff package for protocol evidence and reviewer work</h2>
        </div>
        <span>{pack ? `${pack.artifacts.length} artifacts` : "Waiting for report"}</span>
      </div>

      {pack ? (
        <div className="exportPackLayout">
          <article className="exportPackLead">
            <div className="exportPackTitle">
              <span>Selected package</span>
              <h3>{pack.title}</h3>
              <small>{new Date(pack.generatedAt).toLocaleString()}</small>
            </div>

            <p>{pack.summary}</p>

            <div className="exportPackStats">
              <Stat label="Protocol markets" value={String(pack.protocolMarketCount)} />
              <Stat label="Scope markets" value={String(pack.scopeMarketCount)} />
              <Stat label="Sources included" value={String(pack.sourceCount)} />
              <Stat label="Full pack" value={pack.fileName} />
            </div>

            <pre className="handoffPreview">{pack.handoffSummary}</pre>

            <div className="exportPackActions">
              <button onClick={() => onDownloadPack(pack)}>
                <DatabaseZap size={17} />
                {feedbackFor("pack-json") ?? "Download JSON pack"}
              </button>
              <button onClick={() => onCopyHandoff(pack)}>
                <FileCheck2 size={17} />
                {feedbackFor("handoff") ?? "Copy handoff summary"}
              </button>
            </div>
          </article>

          <aside className="artifactPanel">
            <div className="artifactPanelHeader">
              <span>Included files</span>
              <strong>Download artifacts separately</strong>
            </div>

            <div className="artifactList">
              {pack.artifacts.map((artifact) => (
                <div className="artifactRow" key={artifact.id}>
                  <div>
                    <strong>{artifact.name}</strong>
                    <span>{artifact.description}</span>
                    <small>
                      {artifact.fileName} / {artifact.sizeLabel}
                    </small>
                  </div>
                  <button onClick={() => onDownloadArtifact(pack, artifact.id)}>
                    <ArrowDownToLine size={16} />
                    {feedbackFor(artifact.id) ?? "Download"}
                  </button>
                </div>
              ))}
            </div>
          </aside>
        </div>
      ) : (
        <div className="emptyState">
          {isLoading
            ? "Waiting for live data before creating the export pack..."
            : "Select a report to create an export pack."}
        </div>
      )}
    </section>
  );
}

function AutomationSection({
  feedback,
  isLoading,
  onCopyRunbook,
  onDownloadRunbook,
  onRun,
  run,
}: {
  feedback: {
    action: AutomationFeedbackAction;
    label: string;
  } | null;
  isLoading: boolean;
  onCopyRunbook: () => void;
  onDownloadRunbook: () => void;
  onRun: () => void;
  run: AutomationRun;
}) {
  const feedbackFor = (action: AutomationFeedbackAction) =>
    feedback?.action === action ? feedback.label : null;
  const preview = run.runbook.split("\n").slice(0, 18).join("\n");

  return (
    <section className={`automationSection ${run.status.toLowerCase()}`} id="automation">
      <div className="sectionHeader">
        <div>
          <p className="sectionKicker">Automation</p>
          <h2>Repeatable report, export and source-check workflow</h2>
        </div>
        <span>{isLoading ? "Refreshing" : run.status}</span>
      </div>

      <div className="automationLayout">
        <article className="automationLead">
          <div className="automationStatus">
            <span>{run.mode}</span>
            <strong>{run.status} run</strong>
            <small>{new Date(run.generatedAt).toLocaleString()}</small>
          </div>

          <p>{run.summary}</p>

          <div className="automationStats">
            <Stat label="Scope" value={run.scopeLabel} />
            <Stat label="Ready" value={String(run.readyCount)} />
            <Stat label="Watch" value={String(run.watchCount)} />
            <Stat label="Blocked" value={String(run.blockedCount)} />
          </div>

          <div className="automationActions">
            <button onClick={onRun} disabled={isLoading}>
              <RefreshCcw size={17} />
              {feedbackFor("run") ?? "Run automation"}
            </button>
            <button onClick={onCopyRunbook}>
              <FileCheck2 size={17} />
              {feedbackFor("copy") ?? "Copy runbook"}
            </button>
            <button onClick={onDownloadRunbook}>
              <ArrowDownToLine size={17} />
              {feedbackFor("download") ?? "Download runbook"}
            </button>
          </div>

          <pre className="automationRunbookPreview">{preview}</pre>
        </article>

        <aside className="automationJobs">
          <div className="automationJobsHeader">
            <span>Job queue</span>
            <strong>{run.jobs.length} automation jobs</strong>
          </div>

          <div className="automationJobList">
            {run.jobs.map((job) => (
              <article className={`automationJobRow ${job.status.toLowerCase()}`} key={job.id}>
                <div className="jobPriority">{job.priority}</div>
                <div>
                  <div className="jobTitleLine">
                    <strong>{job.title}</strong>
                    <span className={`jobBadge ${job.status.toLowerCase()}`}>{job.status}</span>
                  </div>
                  <p>{job.reason}</p>
                  <div className="jobMeta">
                    <span>{job.owner}</span>
                    <span>{job.output}</span>
                    <span>{job.nextRun}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}

function ScheduledSnapshotsSection({
  feedback,
  onCopy,
  onDownloadJson,
  onDownloadMarkdown,
  onDownloadYaml,
  pack,
}: {
  feedback: {
    action: ScheduledSnapshotFeedbackAction;
    label: string;
  } | null;
  onCopy: () => void;
  onDownloadJson: () => void;
  onDownloadMarkdown: () => void;
  onDownloadYaml: () => void;
  pack: ScheduledSnapshotsPack;
}) {
  const feedbackFor = (action: ScheduledSnapshotFeedbackAction) =>
    feedback?.action === action ? feedback.label : null;

  return (
    <section className="scheduledSnapshotsSection" id="scheduled-snapshots">
      <div className="sectionHeader">
        <div>
          <p className="sectionKicker">Scheduled Snapshots</p>
          <h2>Keep daily and weekly evidence without manual screenshots</h2>
        </div>
        <span>{pack.readyCount}/{pack.schedules.length} ready</span>
      </div>

      <div className="scheduledSnapshotsLayout">
        <article className="scheduledSnapshotsLead">
          <div className="scheduledSnapshotsTitle">
            <RefreshCcw size={24} />
            <div>
              <span>Snapshot plan</span>
              <h3>{pack.summary}</h3>
              <small>{new Date(pack.generatedAt).toLocaleString()}</small>
            </div>
          </div>

          <div className="scheduledSnapshotsStats">
            <Stat label="Ready" value={String(pack.readyCount)} />
            <Stat label="Watch" value={String(pack.watchCount)} />
            <Stat label="Blocked" value={String(pack.blockedCount)} />
            <Stat label="Next UTC" value={new Date(pack.nextSnapshotUtc).toLocaleString()} />
          </div>

          <div className="scheduledSnapshotActions">
            <button onClick={onCopy}>
              <FileCheck2 size={17} />
              {feedbackFor("copy") ?? "Copy plan"}
            </button>
            <button onClick={onDownloadMarkdown}>
              <ArrowDownToLine size={17} />
              {feedbackFor("download-md") ?? "Download .md"}
            </button>
            <button onClick={onDownloadYaml}>
              <GitBranch size={17} />
              {feedbackFor("download-yaml") ?? "Download Actions YAML"}
            </button>
            <button onClick={onDownloadJson}>
              <DatabaseZap size={17} />
              {feedbackFor("download-json") ?? "Download JSON"}
            </button>
          </div>

          <pre className="scheduledSnapshotPreview">{pack.githubActionYaml}</pre>
        </article>

        <aside className="snapshotArtifactPanel">
          <span>Artifact manifest</span>
          {pack.artifactPlan.map((item) => (
            <div className="snapshotArtifactItem" key={item.label}>
              <strong>{item.label}</strong>
              <small>{item.value}</small>
            </div>
          ))}
          <div className="snapshotBoundary">
            <ShieldCheck size={18} />
            <p>
              Static GitHub Pages can export this plan. Recurring execution needs
              GitHub Actions, a backend worker, or another external scheduler.
            </p>
          </div>
        </aside>

        <div className="snapshotScheduleGrid">
          {pack.schedules.map((schedule) => (
            <article
              className={`snapshotScheduleCard ${snapshotStatusClass(schedule.status)}`}
              key={schedule.id}
            >
              <div className="snapshotScheduleHead">
                <span>{schedule.cadence}</span>
                <strong>{schedule.status}</strong>
              </div>
              <h3>{schedule.title}</h3>
              <p>{schedule.detail}</p>
              <div className="snapshotScheduleMeta">
                <Stat label="Cron" value={schedule.cron} />
                <Stat label="Next UTC" value={new Date(schedule.nextRunUtc).toLocaleString()} />
                <Stat label="Owner" value={schedule.owner} />
                <Stat label="Retention" value={schedule.retention} />
              </div>
              <div className="snapshotOutput">
                <FileText size={17} />
                <span>{schedule.artifactName}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ServiceLayerSection({
  feedback,
  layer,
  onCopyBrief,
  onDownloadBrief,
  onDownloadJson,
  onSelectOffer,
  selectedOffer,
}: {
  feedback: {
    action: ServiceFeedbackAction;
    label: string;
  } | null;
  layer: ServiceLayer;
  onCopyBrief: (offer: ServiceOffer) => void;
  onDownloadBrief: (offer: ServiceOffer) => void;
  onDownloadJson: (layer: ServiceLayer) => void;
  onSelectOffer: (offerId: ServiceOffer["id"]) => void;
  selectedOffer: ServiceOffer | null;
}) {
  const feedbackFor = (action: ServiceFeedbackAction) =>
    feedback?.action === action ? feedback.label : null;
  const preview = selectedOffer
    ? selectedOffer.clientBrief.split("\n").slice(0, 20).join("\n")
    : "Select a service offer to generate a client brief.";

  return (
    <section className="serviceLayerSection" id="service-layer">
      <div className="sectionHeader">
        <div>
          <p className="sectionKicker">Service Layer</p>
          <h2>Turn analytics evidence into sellable client packages</h2>
        </div>
        <span>
          {layer.readyCount}/{layer.offers.length} ready
        </span>
      </div>

      <div className="serviceLayerLayout">
        <article className="serviceLead">
          <div className="serviceLeadTitle">
            <span>Recommended offer</span>
            <h3>{layer.recommendedOfferName}</h3>
            <small>{new Date(layer.generatedAt).toLocaleString()}</small>
          </div>

          <p>{layer.summary}</p>

          <div className="serviceStats">
            <Stat label="Scope" value={layer.scopeLabel} />
            <Stat label="Protocol" value={layer.selectedProtocolName} />
            <Stat label="Pipeline" value={layer.totalPipelineLabel} />
            <Stat label="Ready offers" value={String(layer.readyCount)} />
          </div>

          <div className="serviceOperatingModel">
            <span>Operating model</span>
            {layer.operatingModel.map((item) => (
              <strong key={item}>{item}</strong>
            ))}
          </div>

          <div className="serviceActions">
            <button
              disabled={!selectedOffer}
              onClick={() => selectedOffer && onCopyBrief(selectedOffer)}
            >
              <FileCheck2 size={17} />
              {feedbackFor("copy-brief") ?? "Copy client brief"}
            </button>
            <button
              disabled={!selectedOffer}
              onClick={() => selectedOffer && onDownloadBrief(selectedOffer)}
            >
              <ArrowDownToLine size={17} />
              {feedbackFor("download-brief") ?? "Download brief"}
            </button>
            <button onClick={() => onDownloadJson(layer)}>
              <DatabaseZap size={17} />
              {feedbackFor("json") ?? "Download service JSON"}
            </button>
          </div>

          <pre className="serviceBriefPreview">{preview}</pre>
        </article>

        <aside className="serviceOfferPanel">
          <div className="serviceOfferList">
            {layer.offers.map((offer) => (
              <button
                className={`serviceOfferCard ${
                  offer.id === selectedOffer?.id ? "selected" : ""
                } ${serviceStatusClass(offer.status)}`}
                key={offer.id}
                onClick={() => onSelectOffer(offer.id)}
              >
                <span className="servicePriority">{offer.priority}</span>
                <span>
                  <strong>{offer.name}</strong>
                  <small>{offer.audience}</small>
                </span>
                <em>{offer.priceLabel}</em>
                <i>{offer.status}</i>
              </button>
            ))}
          </div>

          {selectedOffer ? (
            <div className="serviceDetail">
              <div className="serviceDetailHead">
                <div>
                  <span>{selectedOffer.timeline}</span>
                  <h3>{selectedOffer.name}</h3>
                </div>
                <div className="serviceFit">
                  <Target size={17} />
                  <strong>{selectedOffer.fitScore}/100</strong>
                </div>
              </div>

              <p>{selectedOffer.problem}</p>

              <div className="serviceAngle">
                <CircleDollarSign size={18} />
                <strong>{selectedOffer.salesAngle}</strong>
              </div>

              <div className="serviceDetailGrid">
                <div>
                  <span>Deliverables</span>
                  {selectedOffer.deliverables.map((item) => (
                    <strong key={item}>{item}</strong>
                  ))}
                </div>
                <div>
                  <span>Acceptance criteria</span>
                  {selectedOffer.acceptanceCriteria.map((item) => (
                    <strong key={item}>{item}</strong>
                  ))}
                </div>
              </div>

              <div className="serviceArtifacts">
                <span>Included artifacts</span>
                {selectedOffer.includedArtifacts.map((item) => (
                  <small key={item}>{item}</small>
                ))}
              </div>
            </div>
          ) : (
            <div className="emptyState">Select a service offer to inspect the client package.</div>
          )}
        </aside>
      </div>
    </section>
  );
}

function LeadTargetListSection({
  feedback,
  list,
  onCopy,
  onDownloadCsv,
  onDownloadJson,
  onOpenLead,
}: {
  feedback: {
    action: LeadTargetFeedbackAction;
    label: string;
  } | null;
  list: LeadTargetList;
  onCopy: () => void;
  onDownloadCsv: () => void;
  onDownloadJson: () => void;
  onOpenLead: (leadId: string) => void;
}) {
  const feedbackFor = (action: LeadTargetFeedbackAction) =>
    feedback?.action === action ? feedback.label : null;
  const topTarget = list.targets[0] ?? null;

  return (
    <section className="leadTargetSection" id="lead-targets">
      <div className="sectionHeader">
        <div>
          <p className="sectionKicker">Lead Target List</p>
          <h2>Pick who to contact first and why they might pay</h2>
        </div>
        <span>{list.pitchNowCount} pitch now</span>
      </div>

      <div className="leadTargetLayout">
        <article className="leadTargetLead">
          <div className="leadTargetTitle">
            <Target size={24} />
            <div>
              <span>Priority shortlist</span>
              <h3>{list.summary}</h3>
              <small>{new Date(list.generatedAt).toLocaleString()}</small>
            </div>
          </div>

          <div className="leadTargetStats">
            <Stat label="Targets" value={String(list.topTargetCount)} />
            <Stat label="Pitch now" value={String(list.pitchNowCount)} />
            <Stat label="Enrich next" value={String(list.enrichNextCount)} />
            <Stat label="Monitor" value={String(list.monitorCount)} />
          </div>

          <div className="leadTargetActions">
            <button onClick={onCopy} disabled={list.targets.length === 0}>
              <FileCheck2 size={17} />
              {feedbackFor("copy") ?? "Copy target list"}
            </button>
            <button onClick={onDownloadCsv} disabled={list.targets.length === 0}>
              <ArrowDownToLine size={17} />
              {feedbackFor("download-csv") ?? "Download CSV"}
            </button>
            <button onClick={onDownloadJson} disabled={list.targets.length === 0}>
              <DatabaseZap size={17} />
              {feedbackFor("download-json") ?? "Download JSON"}
            </button>
          </div>
        </article>

        <aside className="leadTargetFocus">
          {topTarget ? (
            <>
              <span>First target</span>
              <h3>{topTarget.protocolName}</h3>
              <strong>{topTarget.cashAngle}</strong>
              <p>{topTarget.nextAction}</p>
              <button onClick={() => onOpenLead(topTarget.id)}>
                <Send size={17} />
                Open in CRM
              </button>
            </>
          ) : (
            <div className="emptyState">No lead targets are available yet.</div>
          )}
        </aside>

        <div className="leadTargetGrid">
          {list.targets.length > 0 ? (
            list.targets.map((target) => (
              <article
                className={`leadTargetCard ${leadTierClass(target.tier)}`}
                key={target.id}
              >
                <div className="leadTargetCardHead">
                  <span>#{target.rank}</span>
                  <strong>{target.tier}</strong>
                </div>

                <h3>{target.protocolName}</h3>
                <p>{target.valueSignal}</p>

                <div className="leadTargetMeta">
                  <Stat label="Urgency" value={`${target.urgencyScore}/100`} />
                  <Stat label="Status" value={target.status} />
                  <Stat label="Offer" value={target.recommendedOfferName} />
                  <Stat label="Price" value={target.priceLabel} />
                </div>

                <div className="leadTargetReason">
                  <CircleDollarSign size={18} />
                  <strong>{target.cashAngle}</strong>
                </div>

                <div className="leadTargetRoute">
                  <span>Contact route</span>
                  <strong>{target.contactRoute}</strong>
                  <small>{target.contactUrl || "Contact URL not confirmed yet"}</small>
                </div>

                <div className="leadTargetNext">
                  <span>Next action</span>
                  <p>{target.nextAction}</p>
                </div>

                <button onClick={() => onOpenLead(target.id)}>
                  <Route size={17} />
                  Open CRM
                </button>
              </article>
            ))
          ) : (
            <div className="emptyState">No lead targets are available yet.</div>
          )}
        </div>
      </div>
    </section>
  );
}

function OutreachPipelineSection({
  feedback,
  contactChannels,
  contactEnrichmentStatuses,
  leadStatuses,
  onCopyPitch,
  onDownloadCsv,
  onDownloadJson,
  onSelectLead,
  onSelectPitch,
  onUpdateContactChannel,
  onUpdateContactName,
  onUpdateContactUrl,
  onUpdateEnrichmentConfidence,
  onUpdateEnrichmentStatus,
  onUpdateLastContacted,
  onUpdateLeadStatus,
  onUpdateNextFollowUp,
  onUpdateNotes,
  pipeline,
  selectedLead,
  selectedPitchId,
}: {
  feedback: {
    action: OutreachFeedbackAction;
    label: string;
  } | null;
  contactChannels: ContactChannel[];
  contactEnrichmentStatuses: ContactEnrichmentStatus[];
  leadStatuses: LeadStatus[];
  onCopyPitch: (lead: OutreachLead, pitchId: PitchVariantId) => void;
  onDownloadCsv: (pipeline: OutreachPipeline) => void;
  onDownloadJson: (pipeline: OutreachPipeline) => void;
  onSelectLead: (leadId: string) => void;
  onSelectPitch: (leadId: string, pitchId: PitchVariantId) => void;
  onUpdateContactChannel: (leadId: string, contactChannel: ContactChannel) => void;
  onUpdateContactName: (leadId: string, contactName: string) => void;
  onUpdateContactUrl: (leadId: string, contactUrl: string) => void;
  onUpdateEnrichmentConfidence: (
    leadId: string,
    enrichmentConfidence: number,
  ) => void;
  onUpdateEnrichmentStatus: (
    leadId: string,
    enrichmentStatus: ContactEnrichmentStatus,
  ) => void;
  onUpdateLastContacted: (leadId: string, lastContacted: string) => void;
  onUpdateLeadStatus: (leadId: string, status: LeadStatus) => void;
  onUpdateNextFollowUp: (leadId: string, nextFollowUp: string) => void;
  onUpdateNotes: (leadId: string, notes: string) => void;
  pipeline: OutreachPipeline;
  selectedLead: OutreachLead | null;
  selectedPitchId: PitchVariantId;
}) {
  const feedbackFor = (action: OutreachFeedbackAction) =>
    feedback?.action === action ? feedback.label : null;
  const selectedPitch =
    selectedLead?.pitches.find((pitch) => pitch.id === selectedPitchId) ??
    selectedLead?.pitches[0] ??
    null;

  return (
    <section className="outreachSection" id="outreach">
      <div className="sectionHeader">
        <div>
          <p className="sectionKicker">Outreach Pipeline</p>
          <h2>Find protocol leads, enrich contacts and export the list</h2>
        </div>
        <span>{pipeline.readyCount} ready</span>
      </div>

      <div className="outreachLayout">
        <article className="outreachLeadPanel">
          <div className="outreachLeadTitle">
            <span>Lead export</span>
            <h3>{pipeline.summary}</h3>
            <small>{new Date(pipeline.generatedAt).toLocaleString()}</small>
          </div>

          <div className="outreachStats">
            <Stat label="Scope" value={pipeline.scopeLabel} />
            <Stat label="Leads" value={String(pipeline.leadCount)} />
            <Stat label="Ready" value={String(pipeline.readyCount)} />
            <Stat label="Enriched" value={String(pipeline.enrichedCount)} />
            <Stat label="Saved CRM" value={String(pipeline.crmRecordCount)} />
          </div>

          <div className="outreachActions">
            <button onClick={() => onDownloadCsv(pipeline)} disabled={pipeline.leads.length === 0}>
              <ArrowDownToLine size={17} />
              {feedbackFor("csv") ?? "Download leads CSV"}
            </button>
            <button onClick={() => onDownloadJson(pipeline)} disabled={pipeline.leads.length === 0}>
              <DatabaseZap size={17} />
              {feedbackFor("json") ?? "Download pipeline JSON"}
            </button>
          </div>

          <div className="leadList">
            {pipeline.leads.length > 0 ? (
              pipeline.leads.map((lead) => (
                <article
                  className={`leadRow ${lead.id === selectedLead?.id ? "selected" : ""}`}
                  key={lead.id}
                >
                  <button onClick={() => onSelectLead(lead.id)}>
                    <span className="leadPriority">{lead.priority}</span>
                    <span>
                      <strong>{lead.protocolName}</strong>
                      <small>{lead.valueSignal}</small>
                      <small className="leadContactHint">
                        {lead.enrichmentStatus} / {lead.contactChannel}
                      </small>
                    </span>
                    <em>{lead.score}</em>
                  </button>
                  <select
                    value={lead.status}
                    onInput={(event) =>
                      onUpdateLeadStatus(
                        lead.id,
                        event.currentTarget.value as LeadStatus,
                      )
                    }
                    onChange={(event) =>
                      onUpdateLeadStatus(lead.id, event.target.value as LeadStatus)
                    }
                  >
                    {leadStatuses.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                </article>
              ))
            ) : (
              <div className="emptyState">No scanner leads are available yet.</div>
            )}
          </div>
        </article>

        <aside className="pitchPanel">
          {selectedLead && selectedPitch ? (
            <>
              <div className="pitchHead">
                <div>
                  <span>{selectedLead.status}</span>
                  <h3>{selectedLead.protocolName}</h3>
                  <small>{selectedLead.recommendedOfferName} / {selectedLead.priceLabel}</small>
                </div>
                <div className="pitchScore">
                  <Send size={17} />
                  <strong>{selectedLead.grade}</strong>
                </div>
              </div>

              <p>{selectedLead.reason}</p>

              <div className="crmStatusBar">
                <span>Lead status</span>
                <div>
                  {leadStatuses.map((status) => (
                    <button
                      className={status === selectedLead.status ? "selected" : ""}
                      key={status}
                      onClick={() => onUpdateLeadStatus(selectedLead.id, status)}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <div className="leadBriefGrid">
                <Stat label="Segment" value={selectedLead.segment} />
                <Stat label="Contact target" value={selectedLead.contactTarget} />
                <Stat label="Next step" value={selectedLead.nextStep} />
              </div>

              <div className="contactEnrichment">
                <div className="contactEnrichmentHead">
                  <div>
                    <span>Contact enrichment</span>
                    <strong>{selectedLead.enrichmentSummary}</strong>
                  </div>
                  <div className="contactConfidence">
                    <Network size={17} />
                    <strong>{selectedLead.enrichmentConfidence}</strong>
                  </div>
                </div>

                <div className="contactFields">
                  <label>
                    Contact owner
                    <input
                      placeholder="Name, handle, role, or team"
                      type="text"
                      value={selectedLead.contactName}
                      onInput={(event) =>
                        onUpdateContactName(selectedLead.id, event.currentTarget.value)
                      }
                      onChange={(event) =>
                        onUpdateContactName(selectedLead.id, event.target.value)
                      }
                    />
                  </label>
                  <label>
                    Channel
                    <select
                      value={selectedLead.contactChannel}
                      onInput={(event) =>
                        onUpdateContactChannel(
                          selectedLead.id,
                          event.currentTarget.value as ContactChannel,
                        )
                      }
                      onChange={(event) =>
                        onUpdateContactChannel(
                          selectedLead.id,
                          event.target.value as ContactChannel,
                        )
                      }
                    >
                      {contactChannels.map((channel) => (
                        <option key={channel}>{channel}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Contact URL
                    <input
                      placeholder="https://..."
                      type="url"
                      value={selectedLead.contactUrl}
                      onInput={(event) =>
                        onUpdateContactUrl(selectedLead.id, event.currentTarget.value)
                      }
                      onChange={(event) =>
                        onUpdateContactUrl(selectedLead.id, event.target.value)
                      }
                    />
                  </label>
                  <label>
                    Enrichment status
                    <select
                      value={selectedLead.enrichmentStatus}
                      onInput={(event) =>
                        onUpdateEnrichmentStatus(
                          selectedLead.id,
                          event.currentTarget.value as ContactEnrichmentStatus,
                        )
                      }
                      onChange={(event) =>
                        onUpdateEnrichmentStatus(
                          selectedLead.id,
                          event.target.value as ContactEnrichmentStatus,
                        )
                      }
                    >
                      {contactEnrichmentStatuses.map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                  </label>
                  <label className="contactConfidenceField">
                    Confidence
                    <input
                      max="100"
                      min="0"
                      type="range"
                      value={selectedLead.enrichmentConfidence}
                      onInput={(event) =>
                        onUpdateEnrichmentConfidence(
                          selectedLead.id,
                          Number(event.currentTarget.value),
                        )
                      }
                      onChange={(event) =>
                        onUpdateEnrichmentConfidence(
                          selectedLead.id,
                          Number(event.target.value),
                        )
                      }
                    />
                  </label>
                </div>

                <div className="contactCandidates">
                  <span>Research links</span>
                  {selectedLead.contactCandidates.map((candidate) => (
                    <a
                      href={candidate.url}
                      key={`${selectedLead.id}-${candidate.label}`}
                      target="_blank"
                      rel="noreferrer"
                      title={candidate.reason}
                    >
                      {candidate.label}
                      <ExternalLink size={14} />
                    </a>
                  ))}
                </div>
              </div>

              <div className="crmFields">
                <label>
                  Last contacted
                  <input
                    type="date"
                    value={selectedLead.lastContacted}
                    onInput={(event) =>
                      onUpdateLastContacted(selectedLead.id, event.currentTarget.value)
                    }
                    onChange={(event) =>
                      onUpdateLastContacted(selectedLead.id, event.target.value)
                    }
                  />
                </label>
                <label>
                  Next follow-up
                  <input
                    type="date"
                    value={selectedLead.nextFollowUp}
                    onInput={(event) =>
                      onUpdateNextFollowUp(selectedLead.id, event.currentTarget.value)
                    }
                    onChange={(event) =>
                      onUpdateNextFollowUp(selectedLead.id, event.target.value)
                    }
                  />
                </label>
                <label className="crmNotes">
                  CRM notes
                  <textarea
                    placeholder="Who owns growth, where you contacted them, reply summary, next move..."
                    value={selectedLead.notes}
                    onInput={(event) => onUpdateNotes(selectedLead.id, event.currentTarget.value)}
                    onChange={(event) => onUpdateNotes(selectedLead.id, event.target.value)}
                  />
                </label>
              </div>

              <div className="pitchTabs">
                {selectedLead.pitches.map((pitch) => (
                  <button
                    className={pitch.id === selectedPitch.id ? "selected" : ""}
                    key={pitch.id}
                    onClick={() => onSelectPitch(selectedLead.id, pitch.id)}
                  >
                    {pitch.id === "email" ? <Mail size={16} /> : <MessageSquare size={16} />}
                    {pitch.label}
                  </button>
                ))}
              </div>

              <div className="pitchSubject">
                <span>Subject</span>
                <strong>{selectedPitch.subject}</strong>
              </div>

              <pre className="pitchPreview">{selectedPitch.body}</pre>

              <div className="pitchActions">
                <button onClick={() => onCopyPitch(selectedLead, selectedPitch.id)}>
                  <FileCheck2 size={17} />
                  {feedbackFor("pitch") ?? "Copy pitch"}
                </button>
              </div>

              <div className="sourceLinks">
                <span>Source links</span>
                {selectedLead.sourceUrls.slice(0, 4).map((url) => (
                  <a href={url} key={url} target="_blank" rel="noreferrer">
                    Open source <ExternalLink size={14} />
                  </a>
                ))}
              </div>
            </>
          ) : (
            <div className="emptyState">Select a lead to generate outreach copy.</div>
          )}
        </aside>
      </div>
    </section>
  );
}

function MethodologySection() {
  const formulaRows = [
    {
      label: "Health score",
      formula: "sum(component_score x weight) / 100",
      note: "Weighted score across activity, fees, trend, coverage, market quality, and confidence.",
    },
    {
      label: "Fee / volume",
      formula: "30d_fees / 30d_dex_volume",
      note: "Shows whether traded volume is producing measurable fee output.",
    },
    {
      label: "Trend",
      formula: "weighted_average(7d_change, 30d_volume)",
      note: "Large markets influence the trend more than small markets.",
    },
    {
      label: "Confidence",
      formula: "30 + fee_coverage x 40 + trend_coverage x 30",
      note: "Missing public fields lower confidence instead of being manually replaced.",
    },
  ];
  const componentRows = [
    ["DEX activity", "30%", "30d matched Superchain DEX volume"],
    ["Fee capture", "20%", "30d fees plus fee/volume"],
    ["Short-term trend", "15%", "Weighted 7d market movement"],
    ["Superchain coverage", "15%", "Matched networks and market count"],
    ["Market quality", "10%", "Strong vs At Risk market mix"],
    ["Data confidence", "10%", "Fee and trend field availability"],
  ];

  return (
    <section className="methodologySection" id="methodology">
      <div className="sectionHeader">
        <div>
          <p className="sectionKicker">Methodology</p>
          <h2>Decision-ready evidence, not another raw-data dashboard</h2>
        </div>
        <span>Explainable scoring</span>
      </div>

      <div className="methodologyLayout">
        <article className="methodologyLead">
          <span>Product position</span>
          <h3>Package public data into incentive impact evidence</h3>
          <p>
            The tool does not try to compete with DeFiLlama, Dune, Artemis, or
            Token Terminal. It uses public data to answer a narrower question:
            did liquidity incentives produce real volume, fees, healthier markets,
            and a reviewer-ready next action?
          </p>
          <div className="methodologyPillGrid">
            <strong>Before / after evidence</strong>
            <strong>Weak-pair detection</strong>
            <strong>Fee generation checks</strong>
            <strong>Grant update exports</strong>
          </div>
        </article>

        <aside className="methodologyFormulaPanel">
          <span>Core formulas</span>
          {formulaRows.map((row) => (
            <div className="formulaItem" key={row.label}>
              <strong>{row.label}</strong>
              <code>{row.formula}</code>
              <p>{row.note}</p>
            </div>
          ))}
        </aside>

        <div className="methodologyTable">
          <div className="methodologyTableHead">
            <span>Component</span>
            <span>Weight</span>
            <span>Signal</span>
          </div>
          {componentRows.map(([component, weight, signal]) => (
            <div className="methodologyRow" key={component}>
              <strong>{component}</strong>
              <span>{weight}</span>
              <p>{signal}</p>
            </div>
          ))}
        </div>

        <aside className="methodologyBoundary">
          <span>Boundary</span>
          <strong>Unavailable metrics stay unavailable.</strong>
          <p>
            The scanner is not a security audit, investment rating, or guarantee
            that a protocol will pay. It is an evidence triage layer for grant,
            incentive, and protocol-growth reporting.
          </p>
        </aside>
      </div>
    </section>
  );
}

function ReportsSection({
  feedbackFor,
  isLoading,
  items,
  onCopy,
  onDownload,
  onPrint,
  onSelectReport,
  selectedItem,
}: {
  feedbackFor: (report: ProtocolMiniReport) => string | null;
  isLoading: boolean;
  items: ReportLibraryItem[];
  onCopy: (report: ProtocolMiniReport) => void;
  onDownload: (report: ProtocolMiniReport) => void;
  onPrint: (report: ProtocolMiniReport) => void;
  onSelectReport: (protocolId: string) => void;
  selectedItem: ReportLibraryItem | null;
}) {
  const selectedFeedback = selectedItem ? feedbackFor(selectedItem.report) : null;
  const preview = selectedItem
    ? selectedItem.report.markdown.split("\n").slice(0, 28).join("\n")
    : "";

  return (
    <section className="reportsSection" id="reports">
      <div className="sectionHeader">
        <div>
          <p className="sectionKicker">Reports</p>
          <h2>Protocol report library for case studies and reviewer evidence</h2>
        </div>
        <span>{items.length > 0 ? `${items.length} live generated` : "Waiting for data"}</span>
      </div>

      <div className="reportsLayout">
        <aside className="reportQueue">
          <div className="reportQueueHeader">
            <span>Report queue</span>
            <strong>Scanner-selected targets</strong>
          </div>

          <div className="reportQueueList">
            {items.length > 0 ? (
              items.map((item) => (
                <button
                  className={`reportQueueItem ${
                    item.report.protocolId === selectedItem?.report.protocolId ? "selected" : ""
                  }`}
                  key={item.report.protocolId}
                  onClick={() => onSelectReport(item.report.protocolId)}
                >
                  <FileText size={18} />
                  <span>
                    <strong>{item.scan.name}</strong>
                    <small>
                      {item.scan.status} / grade {item.scan.healthScore.grade}
                    </small>
                  </span>
                  <em>{item.scan.score}</em>
                </button>
              ))
            ) : (
              <div className="emptyState">
                {isLoading
                  ? "Generating report queue from live protocol scans..."
                  : "No report targets are available yet."}
              </div>
            )}
          </div>
        </aside>

        {items.length > 0 ? (
          <article className="reportReader">
            {selectedItem ? (
              <>
                <div className="reportReaderHeader">
                  <div>
                    <span>{selectedItem.scan.status}</span>
                    <h3>{selectedItem.report.title}</h3>
                    <small>{new Date(selectedItem.report.generatedAt).toLocaleString()}</small>
                  </div>
                  <div
                    className={`scorePill grade-${selectedItem.scan.healthScore.grade.toLowerCase()}`}
                  >
                    <strong>{selectedItem.scan.score}</strong>
                    <small>{selectedItem.scan.healthScore.grade}</small>
                  </div>
                </div>

                <p className="reportSummary">{selectedItem.report.summary}</p>

                <div className="reportReaderStats">
                  <div>
                    <span>Protocol</span>
                    <strong>{selectedItem.scan.name}</strong>
                  </div>
                  <div>
                    <span>Status</span>
                    <strong>{selectedItem.scan.status}</strong>
                  </div>
                  <div>
                    <span>Score</span>
                    <strong>{selectedItem.scan.score}/100</strong>
                  </div>
                  <div>
                    <span>Confidence</span>
                    <strong>{selectedItem.scan.healthScore.confidence}/100</strong>
                  </div>
                  <div className="wideStat">
                    <span>Networks</span>
                    <strong>{selectedItem.scan.networks.join(", ")}</strong>
                  </div>
                  <div>
                    <span>30d volume</span>
                    <strong>{compactUsd.format(selectedItem.scan.volume30dUsd)}</strong>
                  </div>
                  <div>
                    <span>30d fees</span>
                    <strong>{formatOptionalUsd(selectedItem.scan.fees30dUsd)}</strong>
                  </div>
                </div>

                <pre className="reportMarkdownPreview">{preview}</pre>

                <div className="reportActions">
                  <button onClick={() => onCopy(selectedItem.report)}>
                    <FileCheck2 size={17} />
                    {selectedFeedback === "Copied" || selectedFeedback === "Markdown ready"
                      ? selectedFeedback
                      : "Copy report"}
                  </button>
                  <button onClick={() => onDownload(selectedItem.report)}>
                    <ArrowDownToLine size={17} />
                    {selectedFeedback === "Downloaded" ? selectedFeedback : "Download .md"}
                  </button>
                  <button onClick={() => onPrint(selectedItem.report)}>
                    <Printer size={17} />
                    {selectedFeedback === "PDF view opened" ||
                    selectedFeedback === "Print HTML downloaded"
                      ? selectedFeedback
                      : "Print / Save PDF"}
                  </button>
                </div>

                <div className="reportWorkflow">
                  <span>Delivery path</span>
                  <strong>1. Refresh live data</strong>
                  <strong>2. Attach CSV evidence</strong>
                  <strong>3. Export Markdown or PDF</strong>
                </div>
              </>
            ) : (
              <div className="emptyState">Select a report to inspect the generated output.</div>
            )}
          </article>
        ) : (
          <article className="reportReader">
            <div className="emptyState">
              {isLoading
                ? "Waiting for live data before rendering reports..."
                : "No generated reports are available yet."}
            </div>
          </article>
        )}
      </div>
    </section>
  );
}

function CaseStudiesSection({
  feedback,
  isLoading,
  items,
  onCopy,
  onDownload,
  onDownloadJson,
  onPrint,
  onSelectCaseStudy,
  selectedCaseStudy,
}: {
  feedback: {
    action: CaseStudyFeedbackAction;
    label: string;
    caseStudyId?: PublicCaseStudyId;
  } | null;
  isLoading: boolean;
  items: PublicCaseStudy[];
  onCopy: (caseStudy: PublicCaseStudy) => void;
  onDownload: (caseStudy: PublicCaseStudy) => void;
  onDownloadJson: (caseStudies: PublicCaseStudy[]) => void;
  onPrint: (caseStudy: PublicCaseStudy) => void;
  onSelectCaseStudy: (caseStudyId: PublicCaseStudyId) => void;
  selectedCaseStudy: PublicCaseStudy | null;
}) {
  const selectedFeedback =
    selectedCaseStudy && feedback?.caseStudyId === selectedCaseStudy.id ? feedback : null;
  const preview = selectedCaseStudy
    ? selectedCaseStudy.markdown.split("\n").slice(0, 34).join("\n")
    : "";

  return (
    <section className="caseStudiesSection" id="case-studies">
      <div className="sectionHeader">
        <div>
          <p className="sectionKicker">Public Case Studies</p>
          <h2>Concrete Superchain incentive reviews without fake client proof</h2>
        </div>
        <span>{items.length > 0 ? `${items.length} public studies` : "Waiting for data"}</span>
      </div>

      <div className="caseStudiesLayout">
        <aside className="caseStudyQueue">
          <div className="caseStudyQueueHeader">
            <span>Evidence examples</span>
            <strong>Use these instead of vague sample claims</strong>
            <p>
              Each study answers a reviewer-style question with live scanner data
              when available, then separates findings from limitations.
            </p>
          </div>

          <div className="caseStudyList">
            {items.length > 0 ? (
              items.map((caseStudy) => (
                <button
                  className={`caseStudyItem ${
                    caseStudy.id === selectedCaseStudy?.id ? "selected" : ""
                  }`}
                  key={caseStudy.id}
                  onClick={() => onSelectCaseStudy(caseStudy.id)}
                >
                  <FileText size={18} />
                  <span>
                    <strong>{caseStudy.protocolName}</strong>
                    <small>{caseStudy.networkFocus}</small>
                  </span>
                  <em>{caseStudy.status === "Live generated" ? "Live" : "Template"}</em>
                </button>
              ))
            ) : (
              <div className="emptyState">
                {isLoading
                  ? "Preparing public case studies from live scanner data..."
                  : "No case studies are available yet."}
              </div>
            )}
          </div>
        </aside>

        <article className="caseStudyReader">
          {selectedCaseStudy ? (
            <>
              <div className="caseStudyHeader">
                <div>
                  <span>{selectedCaseStudy.status}</span>
                  <h3>{selectedCaseStudy.title}</h3>
                  <small>{new Date(selectedCaseStudy.generatedAt).toLocaleString()}</small>
                </div>
                <div className="caseStudyBadge">
                  <Target size={18} />
                  <strong>{selectedCaseStudy.networkFocus}</strong>
                </div>
              </div>

              <div className="caseStudyQuestion">
                <span>Decision question</span>
                <strong>{selectedCaseStudy.decisionQuestion}</strong>
              </div>

              <p className="caseStudySummary">{selectedCaseStudy.summary}</p>

              <div className="caseStudyMetrics">
                {selectedCaseStudy.metrics.map((metric) => (
                  <div key={`${selectedCaseStudy.id}-${metric.label}`}>
                    <span>{metric.label}</span>
                    <strong>{metric.value}</strong>
                  </div>
                ))}
              </div>

              <div className="caseStudyFindings">
                <div>
                  <span>Findings</span>
                  {selectedCaseStudy.findings.slice(0, 4).map((finding) => (
                    <strong key={finding}>{finding}</strong>
                  ))}
                </div>
                <div>
                  <span>Limitations</span>
                  {selectedCaseStudy.limitations.slice(0, 3).map((limitation) => (
                    <strong key={limitation}>{limitation}</strong>
                  ))}
                </div>
              </div>

              <pre className="caseStudyPreview">{preview}</pre>

              <div className="caseStudyActions">
                <button onClick={() => onCopy(selectedCaseStudy)}>
                  <FileCheck2 size={17} />
                  {selectedFeedback?.action === "copy"
                    ? selectedFeedback.label
                    : "Copy case study"}
                </button>
                <button onClick={() => onDownload(selectedCaseStudy)}>
                  <ArrowDownToLine size={17} />
                  {selectedFeedback?.action === "download"
                    ? selectedFeedback.label
                    : "Download .md"}
                </button>
                <button onClick={() => onPrint(selectedCaseStudy)}>
                  <Printer size={17} />
                  {selectedFeedback?.action === "pdf"
                    ? selectedFeedback.label
                    : "Print / Save PDF"}
                </button>
                <button onClick={() => onDownloadJson(items)}>
                  <ArrowDownToLine size={17} />
                  {feedback?.action === "json" ? feedback.label : "Download case JSON"}
                </button>
              </div>
            </>
          ) : (
            <div className="emptyState">Select a public case study to preview it.</div>
          )}
        </article>
      </div>
    </section>
  );
}

function SampleReportsSection({
  feedback,
  isLoading,
  items,
  onCopy,
  onDownload,
  onDownloadJson,
  onPrint,
  onSelectReport,
  selectedReport,
}: {
  feedback: {
    action: SampleReportFeedbackAction;
    label: string;
    reportId?: SampleReportId;
  } | null;
  isLoading: boolean;
  items: SampleReport[];
  onCopy: (report: SampleReport) => void;
  onDownload: (report: SampleReport) => void;
  onDownloadJson: (reports: SampleReport[]) => void;
  onPrint: (report: SampleReport) => void;
  onSelectReport: (reportId: SampleReportId) => void;
  selectedReport: SampleReport | null;
}) {
  const selectedFeedback =
    selectedReport && feedback?.reportId === selectedReport.id ? feedback : null;
  const preview = selectedReport
    ? selectedReport.markdown.split("\n").slice(0, 34).join("\n")
    : "";

  return (
    <section className="sampleReportsSection" id="sample-reports">
      <div className="sectionHeader">
        <div>
          <p className="sectionKicker">Public Sample Reports</p>
          <h2>Client-ready examples that show what the service delivers</h2>
        </div>
        <span>{items.length > 0 ? `${items.length} samples` : "Waiting for data"}</span>
      </div>

      <div className="sampleReportsLayout">
        <aside className="sampleReportQueue">
          <div className="sampleReportQueueHeader">
            <span>Proof-of-work library</span>
            <strong>Use these before asking protocols to pay</strong>
            <p>
              These samples turn scanner output into public artifacts for protocol
              grant updates, monitoring workflows, and protocol evidence reviews.
            </p>
          </div>

          <div className="sampleReportList">
            {items.length > 0 ? (
              items.map((report) => (
                <button
                  className={`sampleReportItem ${
                    report.id === selectedReport?.id ? "selected" : ""
                  }`}
                  key={report.id}
                  onClick={() => onSelectReport(report.id)}
                >
                  <FileText size={18} />
                  <span>
                    <strong>{report.title}</strong>
                    <small>{report.serviceType}</small>
                  </span>
                  <em>{report.status === "Live generated" ? "Live" : "Template"}</em>
                </button>
              ))
            ) : (
              <div className="emptyState">
                {isLoading
                  ? "Preparing public sample reports from live scanner data..."
                  : "No sample reports are available yet."}
              </div>
            )}
          </div>
        </aside>

        <article className="sampleReportReader">
          {selectedReport ? (
            <>
              <div className="sampleReportHeader">
                <div>
                  <span>{selectedReport.status}</span>
                  <h3>{selectedReport.title}</h3>
                  <small>{new Date(selectedReport.generatedAt).toLocaleString()}</small>
                </div>
                <div className="sampleReportBadge">
                  <Target size={18} />
                  <strong>{selectedReport.protocolName}</strong>
                </div>
              </div>

              <p className="sampleReportSummary">{selectedReport.summary}</p>

              <div className="sampleReportStats">
                {selectedReport.metrics.map((metric) => (
                  <div key={`${selectedReport.id}-${metric.label}`}>
                    <span>{metric.label}</span>
                    <strong>{metric.value}</strong>
                  </div>
                ))}
              </div>

              <div className="sampleReportUse">
                <div>
                  <DatabaseZap size={18} />
                  <span>Commercial use</span>
                </div>
                <p>{selectedReport.sampleUse}</p>
                <small>{selectedReport.audience}</small>
              </div>

              <pre className="sampleReportPreview">{preview}</pre>

              <div className="sampleReportActions">
                <button onClick={() => onCopy(selectedReport)}>
                  <FileCheck2 size={17} />
                  {selectedFeedback?.action === "copy"
                    ? selectedFeedback.label
                    : "Copy sample"}
                </button>
                <button onClick={() => onDownload(selectedReport)}>
                  <ArrowDownToLine size={17} />
                  {selectedFeedback?.action === "download"
                    ? selectedFeedback.label
                    : "Download .md"}
                </button>
                <button onClick={() => onPrint(selectedReport)}>
                  <Printer size={17} />
                  {selectedFeedback?.action === "pdf"
                    ? selectedFeedback.label
                    : "Print / Save PDF"}
                </button>
                <button onClick={() => onDownloadJson(items)}>
                  <ArrowDownToLine size={17} />
                  {feedback?.action === "json" ? feedback.label : "Download sample JSON"}
                </button>
              </div>
            </>
          ) : (
            <div className="emptyState">Select a public sample report to preview it.</div>
          )}
        </article>
      </div>
    </section>
  );
}

function StaticSampleFilesSection({
  files,
  manifestUrl,
}: {
  files: StaticSampleFile[];
  manifestUrl: string;
}) {
  return (
    <section className="staticSamplesSection" id="static-samples">
      <div className="sectionHeader">
        <div>
          <p className="sectionKicker">Static Sample Files</p>
          <h2>Stable public artifacts for outreach and reviewer previews</h2>
        </div>
        <span>{files.length} files</span>
      </div>

      <div className="staticSamplesLayout">
        <article className="staticSamplesLead">
          <div className="staticSamplesTitle">
            <span>Public file pack</span>
            <h3>Permanent sample links that work without live data</h3>
            <p>
              These files are served directly from GitHub Pages. Use them in
              grant drafts, public reviews, and client calls when you need a
              stable proof-of-work link instead of a generated browser download.
            </p>
          </div>

          <div className="staticSamplesStats">
            <Stat label="Markdown" value={String(files.filter((file) => file.format === "Markdown").length)} />
            <Stat label="CSV" value={String(files.filter((file) => file.format === "CSV").length)} />
            <Stat label="JSON" value={String(files.filter((file) => file.format === "JSON").length)} />
            <Stat label="Manifest" value="index.json" />
          </div>

          <div className="staticManifestCard">
            <DatabaseZap size={18} />
            <div>
              <span>Manifest</span>
              <strong>samples/index.json</strong>
              <small>Machine-readable list of every static sample file.</small>
            </div>
            <a href={manifestUrl} target="_blank" rel="noreferrer">
              Open manifest
              <ExternalLink size={15} />
            </a>
          </div>
        </article>

        <div className="staticSampleGrid">
          {files.map((file) => (
            <article className="staticSampleCard" key={file.id}>
              <div className="staticSampleIcon">
                {file.format === "JSON" ? (
                  <DatabaseZap size={18} />
                ) : file.format === "CSV" ? (
                  <BarChart3 size={18} />
                ) : (
                  <FileText size={18} />
                )}
              </div>
              <div>
                <span>{file.category}</span>
                <h3>{file.title}</h3>
                <p>{file.description}</p>
                <small>{file.useCase}</small>
              </div>
              <div className="staticSampleMeta">
                <strong>{file.format}</strong>
                <code>{file.fileName}</code>
              </div>
              <div className="staticSampleActions">
                <a href={file.href} target="_blank" rel="noreferrer">
                  <ExternalLink size={15} />
                  Open
                </a>
                <a href={file.href} download>
                  <ArrowDownToLine size={15} />
                  Download
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function TrustProofSection({ pack }: { pack: TrustProofPack }) {
  return (
    <section className="trustProofSection" id="trust-proof">
      <div className="sectionHeader">
        <div>
          <p className="sectionKicker">Trust / Proof</p>
          <h2>Verifiable proof before a buyer pays</h2>
        </div>
        <span>Public proof</span>
      </div>

      <div className="trustProofLayout">
        <article className="trustProofLead">
          <div className="trustProofTitle">
            <ShieldCheck size={24} />
            <div>
              <span>Proof stack</span>
              <h3>No fake traction, only links a reviewer can verify</h3>
            </div>
          </div>
          <p>{pack.summary}</p>

          <div className="trustProofMetrics">
            {pack.metrics.map((metric) => (
              <div key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <small>{metric.note}</small>
              </div>
            ))}
          </div>

          <small className="trustProofGenerated">
            Generated from current app state: {new Date(pack.generatedAt).toLocaleString()}
          </small>
        </article>

        <div className="trustProofGrid">
          {pack.items.map((item) => (
            <article className="trustProofCard" key={item.id}>
              <div className="trustProofCardHead">
                <div className="trustProofIcon">
                  {item.category === "Source" ? (
                    <GitBranch size={18} />
                  ) : item.category === "Data" || item.category === "Artifacts" ? (
                    <DatabaseZap size={18} />
                  ) : (
                    <FileCheck2 size={18} />
                  )}
                </div>
                <span className={`trustProofStatus ${item.status.toLowerCase()}`}>
                  {item.status}
                </span>
              </div>
              <span>{item.category}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <small>{item.proof}</small>
              <a className="trustProofAction" href={item.href} target="_blank" rel="noreferrer">
                {item.action}
                <ExternalLink size={15} />
              </a>
            </article>
          ))}
        </div>

        <aside className="trustBoundaryPanel">
          <div>
            <span>Delivery boundaries</span>
            <h3>What this does not claim yet</h3>
          </div>
          <div className="trustBoundaryList">
            {pack.boundaries.map((boundary) => (
              <div className="trustBoundaryItem" key={boundary.title}>
                <ShieldCheck size={18} />
                <div>
                  <strong>{boundary.title}</strong>
                  <p>{boundary.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="metric">
      <div>{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Health({ value }: { value: DexMarket["health"] }) {
  return <span className={`health ${value.toLowerCase().replace(" ", "-")}`}>{value}</span>;
}

function ProtocolStatus({ value }: { value: ProtocolScan["status"] }) {
  return (
    <span className={`protocolStatus ${value.toLowerCase().replace(/\s+/g, "-")}`}>
      {value}
    </span>
  );
}

function HealthScoreBreakdown({ scan }: { scan: ProtocolScan }) {
  return (
    <section className="healthBreakdown">
      <div className="healthBreakdownHeader">
        <span>Health score breakdown</span>
        <strong>{scan.score}/100</strong>
      </div>
      <div className="componentList">
        {scan.healthScore.components.map((component) => (
          <div className="componentRow" key={component.id}>
            <div className="componentMeta">
              <strong>{component.label}</strong>
              <span>
                {component.score}/100 / weight {component.weight}%
              </span>
            </div>
            <div className="componentTrack" aria-hidden="true">
              <span style={{ width: `${component.score}%` }} />
            </div>
            <p>{component.note}</p>
          </div>
        ))}
      </div>
      <div className="healthTags">
        <div>
          <span>Strengths</span>
          {scan.healthScore.strengths.map((item) => (
            <strong key={item}>{item}</strong>
          ))}
        </div>
        <div>
          <span>Risks</span>
          {scan.healthScore.risks.map((item) => (
            <strong key={item}>{item}</strong>
          ))}
        </div>
      </div>
    </section>
  );
}

function MiniReportPanel({
  feedback,
  onCopy,
  onDownload,
  onPrint,
  report,
}: {
  feedback: string | null;
  onCopy: () => void;
  onDownload: () => void;
  onPrint: () => void;
  report: ProtocolMiniReport;
}) {
  const preview = report.markdown.split("\n").slice(0, 20).join("\n");

  return (
    <section className="miniReport">
      <div className="miniReportHeader">
        <div>
          <span>Mini report generator</span>
          <strong>{report.title}</strong>
        </div>
        <small>{new Date(report.generatedAt).toLocaleString()}</small>
      </div>
      <p>{report.summary}</p>
      <pre>{preview}</pre>
      <div className="miniReportActions">
        <button onClick={onCopy}>
          <FileCheck2 size={17} />
          {feedback === "Copied" || feedback === "Markdown ready"
            ? feedback
            : "Copy markdown"}
        </button>
        <button onClick={onDownload}>
          <ArrowDownToLine size={17} />
          {feedback === "Downloaded" ? feedback : "Download .md"}
        </button>
        <button onClick={onPrint}>
          <Printer size={17} />
          {feedback === "PDF view opened" || feedback === "Print HTML downloaded"
            ? feedback
            : "Print / Save PDF"}
        </button>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Impact({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <section className="impactItem">
      <div>{icon}</div>
      <h2>{title}</h2>
      <p>{text}</p>
      <ArrowUpRight size={18} />
    </section>
  );
}

function PackCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <section className="packCard">
      <div>{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </section>
  );
}

function PackStep({ label, title, text }: { label: string; title: string; text: string }) {
  return (
    <section className="packStep">
      <span>{label}</span>
      <Route size={18} />
      <h3>{title}</h3>
      <p>{text}</p>
    </section>
  );
}

function SourceItem({ source }: { source: SourceStatus }) {
  return (
    <a className={`sourceItem ${source.state}`} href={source.url} target="_blank" rel="noreferrer">
      <span>{source.state}</span>
      <strong>{source.name}</strong>
      <small>{source.message}</small>
      <ExternalLink size={16} />
    </a>
  );
}

function getLiveState(snapshot: LiquiditySnapshot | null, error: string | null) {
  if (error) {
    return {
      className: "error",
      label: "Live status",
      title: "API issue",
    };
  }

  if (!snapshot) {
    return {
      className: "loading",
      label: "Live status",
      title: "Connecting",
    };
  }

  if (snapshot.degraded) {
    return {
      className: "degraded",
      label: "Live status",
      title: "Partial data",
    };
  }

  return {
    className: "ok",
    label: "Live status",
    title: "All sources live",
  };
}

function formatOptionalUsd(value: number | null) {
  return value === null ? "Unavailable" : compactUsd.format(value);
}

function formatOptionalPct(value: number | null) {
  return value === null ? "Unavailable" : `${pct.format(value)}%`;
}

function serviceStatusClass(value: ServiceOffer["status"]) {
  return value.toLowerCase().replace(/\s+/g, "-");
}

function launchStatusClass(value: SalesKit["status"]) {
  return value.toLowerCase().replace(/\s+/g, "-");
}

function checklistStatusClass(value: SalesKit["checklist"][number]["status"]) {
  return value.toLowerCase().replace(/\s+/g, "-");
}

function snapshotStatusClass(value: string) {
  return value.toLowerCase().replace(/\s+/g, "-");
}

function leadTierClass(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function intakeStatusClass(value: IntakeRecord["status"]) {
  return value.toLowerCase().replace(/\s+/g, "-");
}

function buildPricingSheet(layer: ServiceLayer) {
  return [
    "# Superchain Liquidity Ops Offer / Pricing",
    "",
    `Generated: ${layer.generatedAt}`,
    `Scope: ${layer.scopeLabel}`,
    `Recommended offer: ${layer.recommendedOfferName}`,
    `Ready packages: ${layer.readyCount}/${layer.offers.length}`,
    "",
    "## What You Can Buy",
    "",
    "Fixed-scope analytics services for protocols, grant teams, and ecosystem operators that need source-backed Superchain DEX volume, fee, liquidity, and market-health evidence.",
    "",
    "## Packages",
    "",
    ...layer.offers.flatMap((offer) => [
      `### ${offer.name}`,
      "",
      `Price: ${offer.priceLabel}`,
      `Timeline: ${offer.timeline}`,
      `Status: ${offer.status}`,
      `Audience: ${offer.audience}`,
      `Fit score: ${offer.fitScore}/100`,
      "",
      "Problem:",
      offer.problem,
      "",
      "Sales angle:",
      offer.salesAngle,
      "",
      "Deliverables:",
      ...offer.deliverables.map((item) => `- ${item}`),
      "",
      "Acceptance criteria:",
      ...offer.acceptanceCriteria.map((item) => `- ${item}`),
      "",
      "Included artifacts:",
      ...offer.includedArtifacts.map((item) => `- ${item}`),
      "",
    ]),
    "## Delivery Boundary",
    "",
    "- The work is analytics, reporting, source audit, and operating evidence.",
    "- It is not a smart-contract security audit, investment recommendation, or guaranteed growth outcome.",
    "- Missing public metrics stay visible instead of being replaced with manual guesses.",
    "- Scope is confirmed before delivery starts.",
    "",
    "## Next Step",
    "",
    "Pick one package, confirm the protocol or Superchain scope, then send a sample report plus the buyer brief.",
    "",
  ].join("\n");
}

function buildProtocolSummary(scan: ProtocolScan) {
  return [
    `Protocol: ${scan.name}`,
    `Health score: ${scan.score}/100, grade ${scan.healthScore.grade} (${scan.status})`,
    `Data confidence: ${scan.healthScore.confidence}/100`,
    `Segment: ${scan.segment}`,
    `Networks: ${scan.networks.join(", ")}`,
    `Markets matched: ${scan.marketCount}`,
    `30d volume: ${compactUsd.format(scan.volume30dUsd)}`,
    `30d fees: ${formatOptionalUsd(scan.fees30dUsd)}`,
    `7d weighted trend: ${formatOptionalPct(scan.weightedChange7dPct)}`,
    `Fee / volume: ${formatOptionalPct(scan.feeToVolume30dPct)}`,
    `Component scores: ${scan.healthScore.components
      .map((component) => `${component.label} ${component.score}/100`)
      .join("; ")}`,
    `Strengths: ${scan.healthScore.strengths.join("; ")}`,
    `Risks: ${scan.healthScore.risks.join("; ")}`,
    `Evidence opportunity: ${scan.opportunity}`,
    `Recommendation: ${scan.healthScore.recommendation}`,
    `Next action: ${scan.nextAction}`,
  ].join("\n");
}

async function writeClipboardText(text: string) {
  const clipboard = globalThis.navigator?.clipboard;

  if (clipboard?.writeText) {
    try {
      await clipboard.writeText(text);
      return;
    } catch {
      // Some browser contexts expose clipboard but reject writes without permission.
    }
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  document.body.appendChild(textArea);
  textArea.select();

  try {
    const copied = document.execCommand("copy");
    if (!copied) {
      throw new Error("Copy command failed");
    }
  } finally {
    document.body.removeChild(textArea);
  }
}

function downloadTextFile(fileName: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function openPrintableMarkdown(title: string, markdown: string) {
  const html = buildPrintableHtml(title, markdown);
  const printWindow = window.open("", "_blank", "width=960,height=720");

  if (!printWindow) {
    downloadTextFile(`${slugifyFileName(title)}-print.html`, html, "text/html;charset=utf-8");
    return "Print HTML downloaded";
  }

  printWindow.opener = null;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  window.setTimeout(() => {
    printWindow.print();
  }, 350);

  return "PDF view opened";
}

function buildPrintableHtml(title: string, markdown: string) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      color: #111111;
      background: #ffffff;
      font-family: Inter, Arial, sans-serif;
    }

    body {
      margin: 0;
      padding: 42px;
    }

    header {
      border-bottom: 4px solid #ff0420;
      margin-bottom: 28px;
      padding-bottom: 18px;
    }

    header span {
      color: #ff0420;
      display: block;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: .08em;
      margin-bottom: 10px;
      text-transform: uppercase;
    }

    h1 {
      font-size: 34px;
      line-height: 1.05;
      margin: 0;
    }

    pre {
      font-family: "IBM Plex Mono", Consolas, monospace;
      font-size: 12px;
      line-height: 1.55;
      white-space: pre-wrap;
      word-break: break-word;
    }

    @page {
      margin: 16mm;
    }

    @media print {
      body {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <header>
    <span>Superchain Liquidity Ops / printable evidence report</span>
    <h1>${escapeHtml(title)}</h1>
  </header>
  <pre>${escapeHtml(markdown)}</pre>
</body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function slugifyFileName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default App;
