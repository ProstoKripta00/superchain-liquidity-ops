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
import { SUPERCHAIN_NETWORKS } from "./sources";
import type {
  ChainMetric,
  DexMarket,
  LiquiditySnapshot,
  OutcomeTarget,
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

function App() {
  const [network, setNetwork] = useState<(typeof networks)[number]>("All");
  const [target, setTarget] = useState<(typeof targets)[number]>("All");
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);
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

  const totals = useMemo(() => {
    const volume24h = filteredMarkets.reduce(
      (sum, market) => sum + market.volume24hUsd,
      0,
    );
    const volume30d = sumNullableMarkets(filteredMarkets, "volume30dUsd") ?? 0;
    const marketFees30d = sumNullableMarkets(filteredMarkets, "fees30dUsd");
    const chainScope = chains.filter(
      (chain) => network === "All" || chain.network === network,
    );
    const chainFees30d = sumNullableChains(chainScope, "fees30dUsd");
    const weightedChange7d =
      volume30d === 0
        ? 0
        : filteredMarkets.reduce(
            (sum, market) =>
              sum + (market.change7dPct ?? 0) * (market.volume30dUsd ?? 0),
            0,
          ) / volume30d;

    return {
      volume24h,
      volume30d,
      fees30d: marketFees30d ?? chainFees30d,
      feeToVolume:
        marketFees30d === null || volume30d === 0 ? null : (marketFees30d / volume30d) * 100,
      weightedChange7d,
      watchCount: filteredMarkets.filter((market) => market.health !== "Strong").length,
    };
  }, [chains, filteredMarkets, network]);

  const chainRows = useMemo(() => {
    const rows = chains.filter((chain) => network === "All" || chain.network === network);
    const maxTvl = Math.max(...rows.map((row) => row.tvlUsd ?? 0), 1);
    return rows.map((row) => ({
      ...row,
      width: Math.max(8, ((row.tvlUsd ?? 0) / maxTvl) * 100),
    }));
  }, [chains, network]);

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

    const header = [
      "network",
      "dex",
      "slug",
      "category",
      "priority",
      "volume24hUsd",
      "volume7dUsd",
      "volume30dUsd",
      "fees24hUsd",
      "fees7dUsd",
      "fees30dUsd",
      "change1dPct",
      "change7dPct",
      "change30dPct",
      "feeToVolume30dPct",
      "health",
      "outcomeTarget",
      "sourceUrl",
      "updatedAt",
    ];
    const rows = filteredMarkets.map((market) =>
      [
        market.network,
        market.dex,
        market.slug,
        market.category,
        String(market.priority),
        String(market.volume24hUsd),
        nullableCell(market.volume7dUsd),
        nullableCell(market.volume30dUsd),
        nullableCell(market.fees24hUsd),
        nullableCell(market.fees7dUsd),
        nullableCell(market.fees30dUsd),
        nullableCell(market.change1dPct),
        nullableCell(market.change7dPct),
        nullableCell(market.change30dPct),
        nullableCell(market.feeToVolume30dPct),
        market.health,
        market.outcomeTarget,
        market.sourceUrl,
        market.updatedAt,
      ]
        .map(csvCell)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...rows].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "superchain-dex-market-impact.csv";
    link.click();
    URL.revokeObjectURL(url);
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
          <a href="#markets">Live markets</a>
          <a href="#networks">Chain metrics</a>
          <a href="#reviewer-pack">Reviewer pack</a>
          <a href="#sources">Sources</a>
          <a href="#exports">Exports</a>
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
              onChange={(event) => setNetwork(event.target.value as typeof network)}
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

type NullableChainMetricKey =
  | "tvlUsd"
  | "dexVolume24hUsd"
  | "dexVolume7dUsd"
  | "dexVolume30dUsd"
  | "fees24hUsd"
  | "fees7dUsd"
  | "fees30dUsd";

type NullableMarketMetricKey =
  | "volume7dUsd"
  | "volume30dUsd"
  | "fees24hUsd"
  | "fees7dUsd"
  | "fees30dUsd"
  | "change1dPct"
  | "change7dPct"
  | "change30dPct"
  | "feeToVolume30dPct";

function sumNullableChains(rows: ChainMetric[], key: NullableChainMetricKey): number | null {
  const values = rows
    .map((row) => row[key])
    .filter((value): value is number => typeof value === "number");
  return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0);
}

function sumNullableMarkets(rows: DexMarket[], key: NullableMarketMetricKey): number | null {
  const values = rows
    .map((row) => row[key])
    .filter((value): value is number => typeof value === "number");
  return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0);
}

function formatOptionalUsd(value: number | null) {
  return value === null ? "Unavailable" : compactUsd.format(value);
}

function formatOptionalPct(value: number | null) {
  return value === null ? "Unavailable" : `${pct.format(value)}%`;
}

function nullableCell(value: string | number | null) {
  return value === null ? "" : String(value);
}

function csvCell(value: string) {
  if (!/[",\n]/.test(value)) {
    return value;
  }

  return `"${value.replace(/"/g, '""')}"`;
}

export default App;
