import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowDownToLine,
  ArrowUpRight,
  BarChart3,
  CircleDollarSign,
  DatabaseZap,
  Gauge,
  GitBranch,
  Layers3,
  LineChart,
  Network,
  Radar,
  SlidersHorizontal,
  Target,
  TrendingUp,
} from "lucide-react";
import { pools } from "./data";
import type { LiquidityPool, OutcomeTarget, SuperchainNetwork } from "./types";

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

const networks: Array<"All" | SuperchainNetwork> = [
  "All",
  "OP Mainnet",
  "Base",
  "Unichain",
  "Mode",
  "Zora",
];

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
  const [selectedPoolId, setSelectedPoolId] = useState(pools[0].id);

  const filteredPools = useMemo(
    () =>
      pools.filter((pool) => {
        const matchesNetwork = network === "All" || pool.network === network;
        const matchesTarget = target === "All" || pool.outcomeTarget === target;
        return matchesNetwork && matchesTarget;
      }),
    [network, target],
  );

  const selectedPool =
    filteredPools.find((pool) => pool.id === selectedPoolId) ??
    filteredPools[0] ??
    pools[0];

  const totals = useMemo(() => {
    const tvl = filteredPools.reduce((sum, pool) => sum + pool.tvlUsd, 0);
    const fees = filteredPools.reduce((sum, pool) => sum + pool.fees30dUsd, 0);
    const volume = filteredPools.reduce((sum, pool) => sum + pool.volume30dUsd, 0);
    const priority = filteredPools.filter((pool) => pool.priority).length;
    const weightedChange =
      tvl === 0
        ? 0
        : filteredPools.reduce(
            (sum, pool) => sum + pool.tvlChange7dPct * pool.tvlUsd,
            0,
          ) / tvl;

    return {
      tvl,
      fees,
      volume,
      priority,
      feeEfficiency: tvl === 0 ? 0 : (fees / tvl) * 100,
      weightedChange,
      watchCount: filteredPools.filter((pool) => pool.health !== "Strong").length,
    };
  }, [filteredPools]);

  const chainRows = useMemo(() => {
    const rows = networks
      .filter((item): item is SuperchainNetwork => item !== "All")
      .map((item) => {
        const chainPools = pools.filter((pool) => pool.network === item);
        return {
          network: item,
          tvl: chainPools.reduce((sum, pool) => sum + pool.tvlUsd, 0),
          fees: chainPools.reduce((sum, pool) => sum + pool.fees30dUsd, 0),
          count: chainPools.length,
        };
      });
    const maxTvl = Math.max(...rows.map((row) => row.tvl), 1);
    return rows.map((row) => ({ ...row, width: Math.max(8, (row.tvl / maxTvl) * 100) }));
  }, []);

  const exportCsv = () => {
    const header = [
      "network",
      "dex",
      "pair",
      "priority",
      "tvlUsd",
      "tvlChange7dPct",
      "volume30dUsd",
      "fees30dUsd",
      "feeAprPct",
      "utilizationPct",
      "health",
      "outcomeTarget",
    ];
    const rows = filteredPools.map((pool) =>
      [
        pool.network,
        pool.dex,
        pool.pair,
        String(pool.priority),
        String(pool.tvlUsd),
        String(pool.tvlChange7dPct),
        String(pool.volume30dUsd),
        String(pool.fees30dUsd),
        String(pool.feeAprPct),
        String(pool.utilizationPct),
        pool.health,
        pool.outcomeTarget,
      ].join(","),
    );
    const blob = new Blob([[header.join(","), ...rows].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "superchain-liquidity-impact.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app">
      <header className="opHeader">
        <div className="opMark" aria-hidden="true">OP</div>
        <div className="brandBlock">
          <strong>Superchain Impact Console</strong>
          <span>Liquidity intelligence for DEX TVL, fees and incentive outcomes</span>
        </div>
        <nav className="topNav" aria-label="Product areas">
          <span>TVL</span>
          <span>Fees</span>
          <span>Priority pairs</span>
          <span>Reviewer reports</span>
        </nav>
      </header>

      <main className="main">
        <section className="hero">
          <div className="heroCopy">
            <p className="eyebrow">Optimism / Superchain grant proof-of-work</p>
            <h1>Your liquidity. Your fees. Measurable outcomes.</h1>
            <p>
              Open-source analytics for protocols, LPs and grant reviewers to see
              whether Superchain liquidity programs are increasing DEX TVL, fee
              generation and capital efficiency.
            </p>
          </div>

          <aside className="grantPanel">
            <span>Grant ask</span>
            <strong>$15,000 equivalent in OP</strong>
            <p>For live DEX data adapters, reviewer reports, methodology docs and a public MVP demo.</p>
          </aside>
        </section>

        <section className="commandBar">
          <div className="commandTitle">
            <SlidersHorizontal size={18} />
            <span>Scope controls</span>
          </div>
          <label>
            Network
            <select value={network} onChange={(event) => setNetwork(event.target.value as typeof network)}>
              {networks.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            Outcome target
            <select value={target} onChange={(event) => setTarget(event.target.value as typeof target)}>
              {targets.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <button className="exportButton" onClick={exportCsv}>
            <ArrowDownToLine size={18} />
            Export report
          </button>
        </section>

        <section className="metricRail">
          <Metric icon={<Layers3 />} label="Tracked TVL" value={compactUsd.format(totals.tvl)} />
          <Metric icon={<CircleDollarSign />} label="30d DEX fees" value={compactUsd.format(totals.fees)} />
          <Metric icon={<BarChart3 />} label="30d volume" value={compactUsd.format(totals.volume)} />
          <Metric icon={<Gauge />} label="Fees / TVL" value={`${totals.feeEfficiency.toFixed(2)}%`} />
          <Metric icon={<TrendingUp />} label="7d TVL delta" value={`${pct.format(totals.weightedChange)}%`} />
          <Metric icon={<Radar />} label="Watchlist pools" value={String(totals.watchCount)} />
        </section>

        <section className="workbench">
          <section className="poolMatrix">
            <div className="sectionHeader">
              <div>
                <p className="sectionKicker">Priority pair matrix</p>
                <h2>DEX liquidity outcome tracking</h2>
              </div>
              <span>{filteredPools.length} pools in scope</span>
            </div>

            <div className="table">
              <div className="tableHead">
                <span>Pool</span>
                <span>TVL</span>
                <span>7d TVL</span>
                <span>30d fees</span>
                <span>APR</span>
                <span>Health</span>
              </div>
              {filteredPools.map((pool) => (
                <button
                  className={`poolRow ${pool.id === selectedPool.id ? "selected" : ""}`}
                  key={pool.id}
                  onClick={() => setSelectedPoolId(pool.id)}
                >
                  <span>
                    <strong>{pool.pair}</strong>
                    <small>
                      {pool.network} / {pool.dex}
                    </small>
                  </span>
                  <strong>{compactUsd.format(pool.tvlUsd)}</strong>
                  <Change value={pool.tvlChange7dPct} />
                  <strong>{compactUsd.format(pool.fees30dUsd)}</strong>
                  <strong>{pool.feeAprPct.toFixed(1)}%</strong>
                  <Health value={pool.health} />
                </button>
              ))}
            </div>
          </section>

          <aside className="reviewColumn">
            <section className="reviewPanel">
              <div className="sectionHeader compactHeader">
                <div>
                  <p className="sectionKicker">Reviewer focus</p>
                  <h2>{selectedPool.pair}</h2>
                </div>
                <Health value={selectedPool.health} />
              </div>
              <div className="focusGrid">
                <Stat label="Network" value={selectedPool.network} />
                <Stat label="DEX" value={selectedPool.dex} />
                <Stat label="Liquidity depth" value={compactUsd.format(selectedPool.liquidityDepthUsd)} />
                <Stat label="Utilization" value={`${selectedPool.utilizationPct}%`} />
              </div>
              <div className="outcomeBox">
                <span>Outcome target</span>
                <strong>{selectedPool.outcomeTarget}</strong>
                <p>{selectedPool.note}</p>
              </div>
            </section>

            <section className="networkPanel">
              <div className="sectionHeader compactHeader">
                <div>
                  <p className="sectionKicker">Superchain coverage</p>
                  <h2>TVL by network</h2>
                </div>
                <Network size={20} />
              </div>
              <div className="chainBars">
                {chainRows.map((row) => (
                  <div className="chainBar" key={row.network}>
                    <div>
                      <strong>{row.network}</strong>
                      <span>{compactUsd.format(row.tvl)} TVL / {compactUsd.format(row.fees)} fees</span>
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

        <section className="impactStrip">
          <Impact icon={<LineChart />} title="Measurable outcomes" text="7d and 30d windows show whether incentives move TVL, fees and pool efficiency." />
          <Impact icon={<DatabaseZap />} title="Open data adapters" text="Grant milestone adds live DEX, subgraph, RPC and report export adapters." />
          <Impact icon={<GitBranch />} title="Reviewer-ready exports" text="CSV/JSON outputs make pool-level impact easier to audit and compare." />
          <Impact icon={<Target />} title="Priority-pair focus" text="The product is scoped around pairs that matter for Superchain grant outcomes." />
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

function Change({ value }: { value: number }) {
  return <strong className={value >= 0 ? "positive" : "negative"}>{pct.format(value)}%</strong>;
}

function Health({ value }: { value: LiquidityPool["health"] }) {
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

export default App;
