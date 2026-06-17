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
  Network,
  Radar,
  RefreshCcw,
  Route,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  TrendingUp,
} from "lucide-react";
import { loadLiquiditySnapshot } from "./api";
import { buildAutomationRun, type AutomationRun } from "./automation";
import { buildChainCoverageRows, buildMarketScopeMetrics } from "./dataEngine";
import {
  buildExportPack,
  buildMarketsCsv,
  type ExportPack,
  type ExportPackArtifactId,
} from "./exportPack";
import { buildProtocolMiniReport } from "./reportGenerator";
import {
  buildServiceLayer,
  type ServiceLayer,
  type ServiceOffer,
} from "./serviceLayer";
import { SUPERCHAIN_NETWORKS } from "./sources";
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

type ExportPackFeedbackAction = ExportPackArtifactId | "pack-json" | "handoff";
type AutomationFeedbackAction = "run" | "copy" | "download";
type ServiceFeedbackAction = "copy-brief" | "download-brief" | "json";

function App() {
  const [network, setNetwork] = useState<NetworkScope>("All");
  const [target, setTarget] = useState<(typeof targets)[number]>("All");
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);
  const [selectedProtocolId, setSelectedProtocolId] = useState<string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedServiceOfferId, setSelectedServiceOfferId] = useState<
    ServiceOffer["id"] | null
  >(null);
  const [copyFeedback, setCopyFeedback] = useState<{
    label: string;
    protocolId: string;
  } | null>(null);
  const [reportFeedback, setReportFeedback] = useState<{
    label: string;
    protocolId: string;
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
  const [serviceFeedback, setServiceFeedback] = useState<{
    action: ServiceFeedbackAction;
    label: string;
  } | null>(null);
  const [automationRunVersion, setAutomationRunVersion] = useState(0);
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

  const downloadServiceJson = (layer: ServiceLayer) => {
    downloadTextFile(
      "superchain-service-layer.json",
      layer.serviceJson,
      "application/json;charset=utf-8",
    );
    setTemporaryServiceFeedback("json", "Downloaded");
  };

  return (
    <div className="app">
      <header className="opHeader">
        <div className="opMark" aria-hidden="true">
          OP
        </div>
        <div className="brandBlock">
          <strong>Superchain Impact Console</strong>
          <span>Live liquidity intelligence for Superchain DEX outcomes</span>
        </div>
        <nav className="topNav" aria-label="Product areas">
          <a href="#protocol-scanner">Protocol scanner</a>
          <a href="#reports">Reports</a>
          <a href="#export-pack">Export pack</a>
          <a href="#automation">Automation</a>
          <a href="#service-layer">Service layer</a>
          <a href="#markets">Live markets</a>
          <a href="#networks">Chain metrics</a>
          <a href="#reviewer-pack">Reviewer pack</a>
          <a href="#sources">Sources</a>
        </nav>
      </header>

      <main className="main">
        <section className="hero">
          <div className="heroCopy">
            <p className="eyebrow">Optimism / Superchain grant proof-of-work</p>
            <h1>Your liquidity. Your fees. Measurable outcomes.</h1>
            <p>
              Open-source analytics for protocols, LPs and grant reviewers to track
              live Superchain DEX volume, fee generation, chain TVL and incentive
              watchlists from public data sources.
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
              <h2>Find protocols worth testing, reporting and pitching</h2>
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
                      report={miniReport}
                    />
                  ) : null}

                  <div className="scannerAction">
                    <span>Opportunity</span>
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
                <div className="emptyState">Select a protocol scan to inspect the monetization angle.</div>
              )}
            </aside>
          </div>
        </section>

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
          onSelectReport={setSelectedReportId}
          selectedItem={selectedReportItem}
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

        <ServiceLayerSection
          feedback={serviceFeedback}
          layer={serviceLayer}
          onCopyBrief={(offer) => void copyServiceBrief(offer)}
          onDownloadBrief={downloadServiceBrief}
          onDownloadJson={downloadServiceJson}
          onSelectOffer={setSelectedServiceOfferId}
          selectedOffer={selectedServiceOffer}
        />

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
          <h2>One handoff package for protocol outreach and reviewer work</h2>
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

function ReportsSection({
  feedbackFor,
  isLoading,
  items,
  onCopy,
  onDownload,
  onSelectReport,
  selectedItem,
}: {
  feedbackFor: (report: ProtocolMiniReport) => string | null;
  isLoading: boolean;
  items: ReportLibraryItem[];
  onCopy: (report: ProtocolMiniReport) => void;
  onDownload: (report: ProtocolMiniReport) => void;
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
          <h2>Protocol report library for outreach and reviewer evidence</h2>
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
                </div>

                <div className="reportWorkflow">
                  <span>Delivery path</span>
                  <strong>1. Copy report</strong>
                  <strong>2. Attach CSV export</strong>
                  <strong>3. Send protocol-specific outreach</strong>
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
  report,
}: {
  feedback: string | null;
  onCopy: () => void;
  onDownload: () => void;
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
    `Opportunity: ${scan.opportunity}`,
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

export default App;
