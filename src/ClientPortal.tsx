import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  DatabaseZap,
  FileCheck2,
  FileText,
  Gauge,
  Home,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  LockKeyhole,
  MessageSquare,
  Plus,
  RefreshCcw,
  Send,
  ShieldCheck,
  UploadCloud,
  Users,
} from "lucide-react";
import {
  WORKSPACE_BUDGETS,
  WORKSPACE_NETWORKS,
  WORKSPACE_PACKAGES,
  buildWorkspaceSummary,
  createWorkspaceReport,
  createWorkspaceRequest,
  loadWorkspaceState,
  resetWorkspaceState,
  saveWorkspaceState,
  seedWorkspaceState,
  supabaseWorkspaceSchema,
  updateWorkspaceRequestStatus,
  type NewWorkspaceReportInput,
  type NewWorkspaceRequestInput,
  type ReportPackage,
  type ReportRequestStatus,
  type WorkspaceOrganization,
  type WorkspaceReportRequest,
  type WorkspaceRole,
  type WorkspaceState,
  type WorkspaceUser,
} from "./workspaceData";
import { hasSupabaseConfig, supabase } from "./supabaseClient";
import {
  createSupabaseWorkspaceReport,
  createSupabaseWorkspaceRequest,
  loadSupabaseWorkspaceState,
  signInWorkspaceUser,
  signOutWorkspaceUser,
  signUpWorkspaceUser,
  updateSupabaseWorkspaceRequestStatus,
  type WorkspaceBackendMode,
} from "./supabaseWorkspace";

type PortalTab =
  | "overview"
  | "requests"
  | "reports"
  | "clients"
  | "operator"
  | "settings";

const requestStatuses: ReportRequestStatus[] = [
  "New",
  "Scoping",
  "In progress",
  "Review",
  "Delivered",
];

type BackendStatus = "demo" | "checking" | "ready" | "saving" | "error";

type AuthMode = "sign-in" | "sign-up";

const defaultRequestForm = (user: WorkspaceUser): NewWorkspaceRequestInput => ({
  organizationId: user.organizationId,
  createdByUserId: user.id,
  packageName: "7-day Liquidity Impact Report",
  protocol: "",
  networkScope: ["OP Mainnet"],
  marketScope: "",
  budget: "$500 pilot",
  deadline: "",
  goal: "",
  notes: "",
});

const defaultReportForm = (
  request: WorkspaceReportRequest | null,
): NewWorkspaceReportInput => ({
  requestId: request?.id ?? "",
  organizationId: request?.organizationId ?? seedWorkspaceState.organizations[0].id,
  title: request ? `${request.protocol} Liquidity Impact Report` : "",
  summary: "",
  fileName: "liquidity-impact-report.pdf",
  fileType: "PDF",
});

export function ClientPortal() {
  const [state, setState] = useState<WorkspaceState>(() => loadWorkspaceState());
  const [activeUserId, setActiveUserId] = useState(() => state.users[0]?.id ?? "user-client");
  const [activeTab, setActiveTab] = useState<PortalTab>("overview");
  const [backendMode, setBackendMode] = useState<WorkspaceBackendMode>(
    hasSupabaseConfig ? "supabase" : "local",
  );
  const [backendStatus, setBackendStatus] = useState<BackendStatus>(
    hasSupabaseConfig ? "checking" : "demo",
  );
  const [backendError, setBackendError] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("sign-in");
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const activeUser = state.users.find((user) => user.id === activeUserId) ?? state.users[0];
  const activeOrg = state.organizations.find((org) => org.id === activeUser.organizationId);
  const isClient = activeUser.role === "client";
  const canOperate = activeUser.role === "operator" || activeUser.role === "admin";
  const scopedOrgId = isClient ? activeUser.organizationId : undefined;
  const summary = useMemo(
    () => buildWorkspaceSummary(state, scopedOrgId),
    [scopedOrgId, state],
  );
  const scopedRequests = useMemo(
    () =>
      scopedOrgId
        ? state.requests.filter((request) => request.organizationId === scopedOrgId)
        : state.requests,
    [scopedOrgId, state.requests],
  );
  const scopedReports = useMemo(
    () =>
      scopedOrgId
        ? state.reports.filter((report) => report.organizationId === scopedOrgId)
        : state.reports,
    [scopedOrgId, state.reports],
  );
  const [requestForm, setRequestForm] = useState(() => defaultRequestForm(activeUser));
  const [selectedRequestId, setSelectedRequestId] = useState(scopedRequests[0]?.id ?? "");
  const selectedRequest =
    state.requests.find((request) => request.id === selectedRequestId) ??
    scopedRequests[0] ??
    null;
  const [reportForm, setReportForm] = useState(() => defaultReportForm(selectedRequest));
  const [reportFile, setReportFile] = useState<File | null>(null);

  useEffect(() => {
    if (!hasSupabaseConfig) {
      saveWorkspaceState(state);
    }
  }, [state]);

  useEffect(() => {
    if (!hasSupabaseConfig || !supabase) {
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) {
        return;
      }

      if (error) {
        setBackendError(error.message);
        setBackendStatus("error");
        return;
      }

      setSession(data.session);
      setBackendStatus(data.session ? "checking" : "ready");
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setBackendStatus(nextSession ? "checking" : "ready");
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const refreshWorkspace = useCallback(async () => {
    if (!hasSupabaseConfig || !session) {
      return;
    }

    setBackendStatus("checking");
    setBackendError("");

    try {
      const result = await loadSupabaseWorkspaceState();

      setBackendMode(result.mode);
      setState(result.state);
      setActiveUserId((current) => {
        if (result.state.users.some((user) => user.id === current)) {
          return current;
        }

        if (result.state.users.some((user) => user.id === session.user.id)) {
          return session.user.id;
        }

        return result.state.users[0]?.id ?? current;
      });
      setBackendStatus("ready");
    } catch (error) {
      setBackendStatus("error");
      setBackendError(error instanceof Error ? error.message : String(error));
    }
  }, [session]);

  useEffect(() => {
    void refreshWorkspace();
  }, [refreshWorkspace]);

  useEffect(() => {
    setRequestForm(defaultRequestForm(activeUser));
  }, [activeUser.id]);

  useEffect(() => {
    if (!selectedRequestId || !state.requests.some((request) => request.id === selectedRequestId)) {
      setSelectedRequestId(scopedRequests[0]?.id ?? "");
    }
  }, [scopedRequests, selectedRequestId, state.requests]);

  useEffect(() => {
    setReportForm(defaultReportForm(selectedRequest));
    setReportFile(null);
  }, [selectedRequest?.id]);

  const createRequest = async () => {
    if (hasSupabaseConfig && session) {
      setBackendStatus("saving");
      setBackendError("");

      try {
        await createSupabaseWorkspaceRequest(requestForm);
        setRequestForm(defaultRequestForm(activeUser));
        setActiveTab("requests");
        await refreshWorkspace();
      } catch (error) {
        setBackendStatus("error");
        setBackendError(error instanceof Error ? error.message : String(error));
      }

      return;
    }

    setState((current) => createWorkspaceRequest(current, requestForm));
    setRequestForm(defaultRequestForm(activeUser));
    setActiveTab("requests");
  };

  const moveRequest = async (requestId: string, status: ReportRequestStatus) => {
    if (hasSupabaseConfig && session) {
      setBackendStatus("saving");
      setBackendError("");

      try {
        await updateSupabaseWorkspaceRequestStatus(requestId, status, activeUser.id);
        await refreshWorkspace();
      } catch (error) {
        setBackendStatus("error");
        setBackendError(error instanceof Error ? error.message : String(error));
      }

      return;
    }

    setState((current) => updateWorkspaceRequestStatus(current, requestId, status, activeUser.id));
  };

  const deliverReport = async () => {
    if (!reportForm.requestId) {
      return;
    }

    if (hasSupabaseConfig && session) {
      setBackendStatus("saving");
      setBackendError("");

      try {
        await createSupabaseWorkspaceReport(reportForm, activeUser.id, reportFile);
        setReportFile(null);
        setActiveTab("reports");
        await refreshWorkspace();
      } catch (error) {
        setBackendStatus("error");
        setBackendError(error instanceof Error ? error.message : String(error));
      }

      return;
    }

    setState((current) => createWorkspaceReport(current, reportForm, activeUser.id));
    setActiveTab("reports");
  };

  const resetDemo = () => {
    const cleanState = resetWorkspaceState();

    setState(cleanState);
    setActiveUserId(cleanState.users[0]?.id ?? "user-client");
    setActiveTab("overview");
  };

  const submitAuth = async (email: string, password: string) => {
    setAuthBusy(true);
    setAuthMessage("");
    setBackendError("");

    try {
      if (authMode === "sign-up") {
        await signUpWorkspaceUser(email, password);
        setAuthMessage("Account created. If email confirmation is enabled, check your inbox before signing in.");
      } else {
        await signInWorkspaceUser(email, password);
        setAuthMessage("Signed in.");
      }
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setAuthBusy(false);
    }
  };

  const signOut = async () => {
    setAuthBusy(true);

    try {
      await signOutWorkspaceUser();
      setSession(null);
      setState(loadWorkspaceState());
      setActiveUserId(seedWorkspaceState.users[0]?.id ?? "user-client");
      setBackendStatus("ready");
    } catch (error) {
      setBackendStatus("error");
      setBackendError(error instanceof Error ? error.message : String(error));
    } finally {
      setAuthBusy(false);
    }
  };

  if (hasSupabaseConfig && !session) {
    return (
      <WorkspaceAuthGate
        authBusy={authBusy}
        authMessage={authMessage}
        authMode={authMode}
        onChangeMode={setAuthMode}
        onSubmit={submitAuth}
      />
    );
  }

  return (
    <div className="portalApp">
      <PortalHeader
        activeUser={activeUser}
        backendMode={backendMode}
        backendStatus={backendStatus}
        onRefresh={refreshWorkspace}
        onSignOut={hasSupabaseConfig ? signOut : undefined}
        users={state.users}
        onSelectUser={setActiveUserId}
      />

      <main className="portalShell">
        <aside className="portalSidebar">
          <a className="portalBackLink" href="./">
            <ArrowLeft size={16} />
            Public site
          </a>
          <PortalOrgCard org={activeOrg} role={activeUser.role} />
          <PortalNav activeTab={activeTab} canOperate={canOperate} onSelect={setActiveTab} />
          <div className="portalModeCard">
            <LockKeyhole size={18} />
            <strong>{backendMode === "supabase" ? "Supabase live" : "Demo workspace"}</strong>
            <span>
              {backendMode === "supabase"
                ? "Auth, Postgres and private Storage are active for this workspace."
                : "Local browser storage now. Add Supabase env keys to activate production mode."}
            </span>
          </div>
        </aside>

        <section className="portalContent">
          <BackendNotice
            error={backendError}
            mode={backendMode}
            status={backendStatus}
          />

          {activeTab === "overview" ? (
            <OverviewTab
              activeOrg={activeOrg}
              activeUser={activeUser}
              activity={state.activity}
              messages={state.messages}
              organizations={state.organizations}
              reports={scopedReports}
              requests={scopedRequests}
              summary={summary}
            />
          ) : null}

          {activeTab === "requests" ? (
            <RequestsTab
              activeUser={activeUser}
              form={requestForm}
              onCreate={createRequest}
              onMoveRequest={moveRequest}
              onUpdateForm={setRequestForm}
              requests={scopedRequests}
            />
          ) : null}

          {activeTab === "reports" ? (
            <ReportsTab
              organizations={state.organizations}
              reports={scopedReports}
              requests={state.requests}
            />
          ) : null}

          {activeTab === "clients" ? (
            <ClientsTab organizations={state.organizations} requests={state.requests} />
          ) : null}

          {activeTab === "operator" ? (
            <OperatorTab
              activeUser={activeUser}
              form={reportForm}
              reportFile={reportFile}
              onDeliver={deliverReport}
              onFileChange={setReportFile}
              onMoveRequest={moveRequest}
              onSelectRequest={(requestId) => setSelectedRequestId(requestId)}
              onUpdateForm={setReportForm}
              organizations={state.organizations}
              requests={state.requests}
              selectedRequest={selectedRequest}
            />
          ) : null}

          {activeTab === "settings" ? (
            <SettingsTab
              activeUser={activeUser}
              backendError={backendError}
              backendMode={backendMode}
              backendStatus={backendStatus}
              sessionEmail={session?.user.email ?? ""}
              onReset={resetDemo}
              onRefresh={refreshWorkspace}
              schema={supabaseWorkspaceSchema}
              users={state.users}
            />
          ) : null}
        </section>
      </main>
    </div>
  );
}

function WorkspaceAuthGate({
  authBusy,
  authMessage,
  authMode,
  onChangeMode,
  onSubmit,
}: {
  authBusy: boolean;
  authMessage: string;
  authMode: AuthMode;
  onChangeMode: (mode: AuthMode) => void;
  onSubmit: (email: string, password: string) => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="portalApp">
      <header className="portalHeader">
        <div className="portalBrand">
          <div className="portalMark">OP</div>
          <div>
            <strong>Superchain Liquidity Ops</strong>
            <span>Supabase workspace</span>
          </div>
        </div>
        <a className="portalHeaderLink" href="./">
          Public site
        </a>
      </header>

      <main className="portalAuthShell">
        <section className="portalAuthPanel">
          <span>Production login</span>
          <h1>Client workspace is connected to Supabase.</h1>
          <p>
            Sign in with an invited account to load organizations, requests, reports, private
            files, messages and audit log from Postgres and Storage.
          </p>

          <div className="portalAuthTabs">
            <button
              className={authMode === "sign-in" ? "active" : ""}
              onClick={() => onChangeMode("sign-in")}
              type="button"
            >
              Sign in
            </button>
            <button
              className={authMode === "sign-up" ? "active" : ""}
              onClick={() => onChangeMode("sign-up")}
              type="button"
            >
              Sign up
            </button>
          </div>

          <div className="portalFormGrid singleColumn">
            <label>
              Email
              <input
                autoComplete="email"
                inputMode="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="client@protocol.xyz"
                value={email}
              />
            </label>
            <label>
              Password
              <input
                autoComplete={authMode === "sign-in" ? "current-password" : "new-password"}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Minimum 6 characters"
                type="password"
                value={password}
              />
            </label>
          </div>

          <button
            className="portalPrimaryAction"
            disabled={authBusy || !email || password.length < 6}
            onClick={() => onSubmit(email, password)}
            type="button"
          >
            <KeyRound size={17} />
            {authBusy ? "Working..." : authMode === "sign-in" ? "Sign in" : "Create account"}
          </button>

          {authMessage ? <p className="portalAuthMessage">{authMessage}</p> : null}
        </section>

        <aside className="portalAuthAside">
          <strong>Backend checklist</strong>
          <span>Supabase Auth session persistence</span>
          <span>Postgres Row Level Security</span>
          <span>Private Storage bucket: report-files</span>
          <span>Signed URLs for report files</span>
        </aside>
      </main>
    </div>
  );
}

function PortalHeader({
  activeUser,
  backendMode,
  backendStatus,
  onRefresh,
  onSignOut,
  onSelectUser,
  users,
}: {
  activeUser: WorkspaceUser;
  backendMode: WorkspaceBackendMode;
  backendStatus: BackendStatus;
  onRefresh: () => void;
  onSignOut?: () => void;
  onSelectUser: (userId: string) => void;
  users: WorkspaceUser[];
}) {
  return (
    <header className="portalHeader">
      <div className="portalBrand">
        <div className="portalMark">OP</div>
        <div>
          <strong>Superchain Liquidity Ops</strong>
          <span>Client workspace</span>
        </div>
      </div>

      <div className="portalHeaderActions">
        <span className={`portalBackendPill ${backendMode}`}>
          {backendMode === "supabase" ? "Supabase" : "Demo"} / {backendStatus}
        </span>
        <button onClick={onRefresh} type="button">
          <RefreshCcw size={15} />
          Sync
        </button>
        {onSignOut ? (
          <button onClick={onSignOut} type="button">
            <LockKeyhole size={15} />
            Sign out
          </button>
        ) : null}
        <label className="portalUserSwitch">
          Workspace role
          <select value={activeUser.id} onChange={(event) => onSelectUser(event.target.value)}>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} - {roleLabel(user.role)}
              </option>
            ))}
          </select>
        </label>
      </div>
    </header>
  );
}

function PortalOrgCard({
  org,
  role,
}: {
  org: WorkspaceOrganization | undefined;
  role: WorkspaceRole;
}) {
  if (!org) {
    return null;
  }

  return (
    <article className="portalOrgCard">
      <span>{roleLabel(role)}</span>
      <h1>{org.name}</h1>
      <p>{org.protocol}</p>
      <div>
        {org.networkFocus.map((network) => (
          <strong key={network}>{network}</strong>
        ))}
      </div>
    </article>
  );
}

function PortalNav({
  activeTab,
  canOperate,
  onSelect,
}: {
  activeTab: PortalTab;
  canOperate: boolean;
  onSelect: (tab: PortalTab) => void;
}) {
  const items: Array<{
    id: PortalTab;
    label: string;
    icon: ReactElement;
    operatorOnly?: boolean;
  }> = [
    { id: "overview", label: "Dashboard", icon: <LayoutDashboard size={17} /> },
    { id: "requests", label: "Requests", icon: <ClipboardList size={17} /> },
    { id: "reports", label: "Reports & files", icon: <FileCheck2 size={17} /> },
    { id: "clients", label: "Clients", icon: <Building2 size={17} />, operatorOnly: true },
    { id: "operator", label: "Operator queue", icon: <ListChecks size={17} />, operatorOnly: true },
    { id: "settings", label: "Settings", icon: <KeyRound size={17} /> },
  ];

  return (
    <nav className="portalNav" aria-label="Workspace sections">
      {items
        .filter((item) => canOperate || !item.operatorOnly)
        .map((item) => (
          <button
            className={activeTab === item.id ? "active" : ""}
            key={item.id}
            onClick={() => onSelect(item.id)}
            type="button"
          >
            {item.icon}
            {item.label}
          </button>
        ))}
    </nav>
  );
}

function BackendNotice({
  error,
  mode,
  status,
}: {
  error: string;
  mode: WorkspaceBackendMode;
  status: BackendStatus;
}) {
  if (mode === "local" && !error) {
    return (
      <div className="portalBackendNotice">
        <DatabaseZap size={18} />
        <span>
          Demo mode is active. Add Supabase env keys to enable Auth, Postgres and private
          Storage.
        </span>
      </div>
    );
  }

  if (status === "checking" || status === "saving") {
    return (
      <div className="portalBackendNotice">
        <RefreshCcw size={18} />
        <span>{status === "saving" ? "Saving to Supabase..." : "Syncing Supabase workspace..."}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="portalBackendNotice error">
        <ShieldCheck size={18} />
        <span>{error}</span>
      </div>
    );
  }

  return null;
}

function OverviewTab({
  activeOrg,
  activeUser,
  activity,
  messages,
  organizations,
  reports,
  requests,
  summary,
}: {
  activeOrg: WorkspaceOrganization | undefined;
  activeUser: WorkspaceUser;
  activity: WorkspaceState["activity"];
  messages: WorkspaceState["messages"];
  organizations: WorkspaceOrganization[];
  reports: WorkspaceState["reports"];
  requests: WorkspaceReportRequest[];
  summary: ReturnType<typeof buildWorkspaceSummary>;
}) {
  const orgActivity = activity.filter((item) =>
    activeUser.role === "client" ? item.organizationId === activeUser.organizationId : true,
  );
  const orgMessages = messages.filter((item) =>
    activeUser.role === "client" ? item.organizationId === activeUser.organizationId : true,
  );

  return (
    <div className="portalStack">
      <PortalTitle
        eyebrow="Workspace overview"
        title={activeUser.role === "client" ? "Your report workspace" : "Operations command center"}
        text={
          activeUser.role === "client"
            ? "Track requests, report files, messages and delivery status in one place."
            : "Manage clients, report requests, delivery files and backend readiness from one operator surface."
        }
      />

      <div className="portalMetricGrid">
        <PortalMetric icon={<ClipboardList />} label="Active requests" value={String(summary.activeRequests)} />
        <PortalMetric icon={<FileCheck2 />} label="Delivered reports" value={String(summary.deliveredReports)} />
        <PortalMetric icon={<DatabaseZap />} label="Client files" value={String(summary.clientVisibleFiles)} />
        <PortalMetric icon={<Building2 />} label="Organizations" value={String(summary.organizations)} />
      </div>

      <div className="portalTwoColumn">
        <article className="portalPanel">
          <div className="portalPanelHead">
            <div>
              <span>Next action</span>
              <h2>{nextActionTitle(requests)}</h2>
            </div>
            <Gauge size={22} />
          </div>
          <p>
            {activeOrg
              ? `${activeOrg.protocol} has ${requests.length} workspace request${
                  requests.length === 1 ? "" : "s"
                } and ${reports.length} report package${reports.length === 1 ? "" : "s"}.`
              : `${organizations.length} organizations are available in the operator workspace.`}
          </p>
          <div className="portalTimeline">
            {orgActivity.slice(0, 4).map((item) => (
              <div key={item.id}>
                <strong>{item.label}</strong>
                <span>{item.detail}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="portalPanel">
          <div className="portalPanelHead">
            <div>
              <span>Client communication</span>
              <h2>Latest messages</h2>
            </div>
            <MessageSquare size={22} />
          </div>
          <div className="portalMessageList">
            {orgMessages.slice(0, 3).map((message) => (
              <div key={message.id}>
                <strong>{message.visibility}</strong>
                <p>{message.body}</p>
              </div>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}

function RequestsTab({
  activeUser,
  form,
  onCreate,
  onMoveRequest,
  onUpdateForm,
  requests,
}: {
  activeUser: WorkspaceUser;
  form: NewWorkspaceRequestInput;
  onCreate: () => void;
  onMoveRequest: (requestId: string, status: ReportRequestStatus) => void;
  onUpdateForm: (form: NewWorkspaceRequestInput) => void;
  requests: WorkspaceReportRequest[];
}) {
  return (
    <div className="portalStack">
      <PortalTitle
        eyebrow="Requests"
        title="Create and track report work"
        text="Clients can request a report. Operators can move work through the delivery pipeline."
      />

      <div className="portalRequestLayout">
        <article className="portalPanel">
          <div className="portalPanelHead">
            <div>
              <span>New request</span>
              <h2>Request a liquidity report</h2>
            </div>
            <Plus size={22} />
          </div>

          <div className="portalFormGrid">
            <label>
              Package
              <select
                value={form.packageName}
                onChange={(event) =>
                  onUpdateForm({ ...form, packageName: event.target.value as ReportPackage })
                }
              >
                {WORKSPACE_PACKAGES.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              Protocol
              <input
                value={form.protocol}
                onChange={(event) => onUpdateForm({ ...form, protocol: event.target.value })}
                placeholder="Protocol or DEX name"
              />
            </label>
            <label>
              Budget
              <select
                value={form.budget}
                onChange={(event) => onUpdateForm({ ...form, budget: event.target.value })}
              >
                {WORKSPACE_BUDGETS.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              Deadline
              <input
                value={form.deadline}
                onChange={(event) => onUpdateForm({ ...form, deadline: event.target.value })}
                placeholder="2026-07-05, ASAP, or flexible"
              />
            </label>
            <label className="wideField">
              Network scope
              <div className="portalCheckboxGrid">
                {WORKSPACE_NETWORKS.map((network) => (
                  <button
                    className={form.networkScope.includes(network) ? "selected" : ""}
                    key={network}
                    onClick={() =>
                      onUpdateForm({
                        ...form,
                        networkScope: form.networkScope.includes(network)
                          ? form.networkScope.filter((item) => item !== network)
                          : [...form.networkScope, network],
                      })
                    }
                    type="button"
                  >
                    {network}
                  </button>
                ))}
              </div>
            </label>
            <label className="wideField">
              Market scope
              <input
                value={form.marketScope}
                onChange={(event) => onUpdateForm({ ...form, marketScope: event.target.value })}
                placeholder="Priority pairs, DEXs, pools, or network scope"
              />
            </label>
            <label className="wideField">
              Decision goal
              <textarea
                value={form.goal}
                onChange={(event) => onUpdateForm({ ...form, goal: event.target.value })}
                placeholder="What decision should this report support?"
              />
            </label>
            <label className="wideField">
              Notes
              <textarea
                value={form.notes}
                onChange={(event) => onUpdateForm({ ...form, notes: event.target.value })}
                placeholder="Anything the operator should know before scoping?"
              />
            </label>
          </div>

          <button className="portalPrimaryAction" onClick={onCreate} type="button">
            <Send size={17} />
            Submit request
          </button>
        </article>

        <article className="portalPanel">
          <div className="portalPanelHead">
            <div>
              <span>{activeUser.role === "client" ? "Your pipeline" : "Request pipeline"}</span>
              <h2>{requests.length} requests</h2>
            </div>
            <Activity size={22} />
          </div>
          <div className="portalRequestList">
            {requests.map((request) => (
              <RequestCard
                canMove={activeUser.role !== "client"}
                key={request.id}
                onMove={(status) => onMoveRequest(request.id, status)}
                request={request}
              />
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}

function ReportsTab({
  organizations,
  reports,
  requests,
}: {
  organizations: WorkspaceOrganization[];
  reports: WorkspaceState["reports"];
  requests: WorkspaceReportRequest[];
}) {
  return (
    <div className="portalStack">
      <PortalTitle
        eyebrow="Reports & files"
        title="Delivery library"
        text="Client-visible files stay separated from operator-only drafts. Production mode should store these in private Supabase Storage."
      />

      <div className="portalReportGrid">
        {reports.map((report) => {
          const request = requests.find((item) => item.id === report.requestId);
          const org = organizations.find((item) => item.id === report.organizationId);

          return (
            <article className="portalReportCard" key={report.id}>
              <div className="portalPanelHead">
                <div>
                  <span>{report.status}</span>
                  <h2>{report.title}</h2>
                </div>
                <FileText size={22} />
              </div>
              <p>{report.summary}</p>
              <div className="portalMiniStats">
                <PortalInlineStat label="Client" value={org?.name ?? "Unknown"} />
                <PortalInlineStat label="Request" value={request?.packageName ?? "Manual"} />
                <PortalInlineStat label="Period" value={report.period} />
              </div>
              <div className="portalFileList">
                {report.files.map((file) => (
                  <a href={file.href} key={file.id}>
                    <FileCheck2 size={16} />
                    <span>
                      <strong>{file.name}</strong>
                      <small>
                        {file.type} / {file.sizeLabel} / {file.access}
                      </small>
                    </span>
                  </a>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function ClientsTab({
  organizations,
  requests,
}: {
  organizations: WorkspaceOrganization[];
  requests: WorkspaceReportRequest[];
}) {
  return (
    <div className="portalStack">
      <PortalTitle
        eyebrow="Clients"
        title="Protocol accounts"
        text="Operator view for accounts, plan level, active requests and network focus."
      />

      <div className="portalClientGrid">
        {organizations
          .filter((org) => org.protocol !== "Internal")
          .map((org) => {
            const orgRequests = requests.filter((request) => request.organizationId === org.id);

            return (
              <article className="portalClientCard" key={org.id}>
                <div>
                  <span>{org.status}</span>
                  <h2>{org.name}</h2>
                  <p>{org.protocol}</p>
                </div>
                <div className="portalMiniStats">
                  <PortalInlineStat label="Plan" value={org.plan} />
                  <PortalInlineStat label="Requests" value={String(orgRequests.length)} />
                  <PortalInlineStat label="Network" value={org.networkFocus.join(", ")} />
                </div>
              </article>
            );
          })}
      </div>
    </div>
  );
}

function OperatorTab({
  activeUser,
  form,
  reportFile,
  onDeliver,
  onFileChange,
  onMoveRequest,
  onSelectRequest,
  onUpdateForm,
  organizations,
  requests,
  selectedRequest,
}: {
  activeUser: WorkspaceUser;
  form: NewWorkspaceReportInput;
  reportFile: File | null;
  onDeliver: () => void;
  onFileChange: (file: File | null) => void;
  onMoveRequest: (requestId: string, status: ReportRequestStatus) => void;
  onSelectRequest: (requestId: string) => void;
  onUpdateForm: (form: NewWorkspaceReportInput) => void;
  organizations: WorkspaceOrganization[];
  requests: WorkspaceReportRequest[];
  selectedRequest: WorkspaceReportRequest | null;
}) {
  return (
    <div className="portalStack">
      <PortalTitle
        eyebrow="Operator queue"
        title="Delivery workspace"
        text="Move requests, select a client scope, and register report delivery files."
      />

      <div className="portalOperatorGrid">
        <article className="portalPanel">
          <div className="portalPanelHead">
            <div>
              <span>Queue</span>
              <h2>{requests.length} report requests</h2>
            </div>
            <ListChecks size={22} />
          </div>
          <div className="portalRequestList">
            {requests.map((request) => (
              <button
                className={`portalQueueItem ${selectedRequest?.id === request.id ? "selected" : ""}`}
                key={request.id}
                onClick={() => onSelectRequest(request.id)}
                type="button"
              >
                <strong>{request.protocol}</strong>
                <span>{request.packageName}</span>
                <small>
                  {request.status} / {organizationName(organizations, request.organizationId)}
                </small>
              </button>
            ))}
          </div>
        </article>

        <article className="portalPanel">
          <div className="portalPanelHead">
            <div>
              <span>Delivery</span>
              <h2>{selectedRequest?.protocol ?? "Select request"}</h2>
            </div>
            <UploadCloud size={22} />
          </div>

          {selectedRequest ? (
            <>
              <div className="portalStatusStrip">
                {requestStatuses.map((status) => (
                  <button
                    className={selectedRequest.status === status ? "active" : ""}
                    key={status}
                    onClick={() => onMoveRequest(selectedRequest.id, status)}
                    type="button"
                  >
                    {status}
                  </button>
                ))}
              </div>

              <div className="portalFormGrid">
                <label className="wideField">
                  Report title
                  <input
                    value={form.title}
                    onChange={(event) => onUpdateForm({ ...form, title: event.target.value })}
                  />
                </label>
                <label className="wideField">
                  Summary
                  <textarea
                    value={form.summary}
                    onChange={(event) => onUpdateForm({ ...form, summary: event.target.value })}
                    placeholder="Short client-facing delivery summary"
                  />
                </label>
                <label>
                  File name
                  <input
                    value={form.fileName}
                    onChange={(event) => onUpdateForm({ ...form, fileName: event.target.value })}
                  />
                </label>
                <label>
                  File type
                  <select
                    value={form.fileType}
                    onChange={(event) =>
                      onUpdateForm({
                        ...form,
                        fileType: event.target.value as NewWorkspaceReportInput["fileType"],
                      })
                    }
                  >
                    <option>PDF</option>
                    <option>CSV</option>
                    <option>JSON</option>
                    <option>Markdown</option>
                  </select>
                </label>
                <label className="wideField">
                  Upload file
                  <input
                    onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
                    type="file"
                  />
                  <small>
                    {reportFile
                      ? `${reportFile.name} selected`
                      : "Optional in demo mode, required for real private Storage delivery."}
                  </small>
                </label>
              </div>

              <button className="portalPrimaryAction" onClick={onDeliver} type="button">
                <CheckCircle2 size={17} />
                Mark delivered
              </button>
            </>
          ) : (
            <div className="portalEmpty">Select a request to manage delivery.</div>
          )}
        </article>
      </div>
    </div>
  );
}

function SettingsTab({
  activeUser,
  backendError,
  backendMode,
  backendStatus,
  sessionEmail,
  onReset,
  onRefresh,
  schema,
  users,
}: {
  activeUser: WorkspaceUser;
  backendError: string;
  backendMode: WorkspaceBackendMode;
  backendStatus: BackendStatus;
  sessionEmail: string;
  onReset: () => void;
  onRefresh: () => void;
  schema: string;
  users: WorkspaceUser[];
}) {
  return (
    <div className="portalStack">
      <PortalTitle
        eyebrow="Settings"
        title="Production readiness"
        text="The UI is ready for sales demos. Supabase Auth, Postgres and Storage should be connected before real client data is stored."
      />

      <div className="portalTwoColumn">
        <article className="portalPanel">
          <div className="portalPanelHead">
            <div>
              <span>Access model</span>
              <h2>Roles and permissions</h2>
            </div>
            <ShieldCheck size={22} />
          </div>
          <div className="portalUserList">
            {users.map((user) => (
              <div key={user.id}>
                <strong>{user.name}</strong>
                <span>
                  {roleLabel(user.role)} / {user.email}
                </span>
              </div>
            ))}
          </div>
          <button className="portalSecondaryAction" onClick={onReset} type="button">
            <RefreshCcw size={17} />
            Reset demo data
          </button>
          <button className="portalSecondaryAction" onClick={onRefresh} type="button">
            <DatabaseZap size={17} />
            Sync Supabase
          </button>
        </article>

        <article className="portalPanel">
          <div className="portalPanelHead">
            <div>
              <span>Backend plan</span>
              <h2>Supabase schema</h2>
            </div>
            <DatabaseZap size={22} />
          </div>
          <p>
            Current user: <strong>{activeUser.name}</strong>
            {sessionEmail ? ` / ${sessionEmail}` : ""}. Backend: <strong>{backendMode}</strong>,
            status: <strong>{backendStatus}</strong>.
          </p>
          {backendError ? <p className="portalErrorText">{backendError}</p> : null}
          <div className="portalSetupList">
            <span>1. Run `SUPABASE_WORKSPACE_SCHEMA.sql` in Supabase SQL editor.</span>
            <span>2. Create/invite users in Supabase Auth.</span>
            <span>3. Insert matching `profiles` rows with client/operator/admin roles.</span>
            <span>4. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to hosting env.</span>
          </div>
          <pre className="portalSchemaPreview">{schema}</pre>
        </article>
      </div>
    </div>
  );
}

function RequestCard({
  canMove,
  onMove,
  request,
}: {
  canMove: boolean;
  onMove: (status: ReportRequestStatus) => void;
  request: WorkspaceReportRequest;
}) {
  return (
    <article className="portalRequestCard">
      <div>
        <span>{request.status}</span>
        <h3>{request.protocol}</h3>
        <p>{request.goal}</p>
      </div>
      <div className="portalMiniStats">
        <PortalInlineStat label="Package" value={request.packageName} />
        <PortalInlineStat label="Budget" value={request.budget} />
        <PortalInlineStat label="Deadline" value={request.deadline || "Flexible"} />
      </div>
      <small>{request.networkScope.join(", ")} / {request.marketScope}</small>
      {canMove ? (
        <div className="portalStatusStrip compact">
          {requestStatuses.map((status) => (
            <button
              className={request.status === status ? "active" : ""}
              key={status}
              onClick={() => onMove(status)}
              type="button"
            >
              {status}
            </button>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function PortalTitle({
  eyebrow,
  text,
  title,
}: {
  eyebrow: string;
  text: string;
  title: string;
}) {
  return (
    <header className="portalTitle">
      <div>
        <span>{eyebrow}</span>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
      <a href="#request-report">
        <Home size={16} />
        Request report
      </a>
    </header>
  );
}

function PortalMetric({
  icon,
  label,
  value,
}: {
  icon: ReactElement;
  label: string;
  value: string;
}) {
  return (
    <article className="portalMetric">
      <div>{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function PortalInlineStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function roleLabel(role: WorkspaceRole) {
  if (role === "admin") {
    return "Admin";
  }

  if (role === "operator") {
    return "Operator";
  }

  return "Client";
}

function nextActionTitle(requests: WorkspaceReportRequest[]) {
  const activeRequest = requests.find((request) => request.status !== "Delivered");

  if (!activeRequest) {
    return "Create next report request";
  }

  if (activeRequest.status === "New") {
    return "Operator should scope the request";
  }

  if (activeRequest.status === "Review") {
    return "Review delivery files";
  }

  return `${activeRequest.protocol} is ${activeRequest.status.toLowerCase()}`;
}

function organizationName(organizations: WorkspaceOrganization[], organizationId: string) {
  return organizations.find((org) => org.id === organizationId)?.name ?? "Unknown organization";
}
