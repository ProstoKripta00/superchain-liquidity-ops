export type WorkspaceRole = "client" | "operator" | "admin";

export type WorkspaceUser = {
  id: string;
  name: string;
  email: string;
  role: WorkspaceRole;
  organizationId: string;
  title: string;
};

export type WorkspaceOrganization = {
  id: string;
  name: string;
  protocol: string;
  website: string;
  networkFocus: string[];
  plan: "Pilot" | "Monitoring" | "Enterprise";
  status: "Prospect" | "Active" | "Paused";
  ownerUserId: string;
};

export type ReportRequestStatus =
  | "New"
  | "Scoping"
  | "In progress"
  | "Review"
  | "Delivered";

export type ReportRequestPriority = "Normal" | "High" | "Launch critical";

export type ReportPackage =
  | "7-day Liquidity Impact Report"
  | "Monthly Monitoring"
  | "DAO / Incentive Evidence Pack";

export type WorkspaceReportRequest = {
  id: string;
  organizationId: string;
  createdByUserId: string;
  packageName: ReportPackage;
  status: ReportRequestStatus;
  priority: ReportRequestPriority;
  protocol: string;
  networkScope: string[];
  marketScope: string;
  budget: string;
  deadline: string;
  goal: string;
  notes: string;
  updatedAt: string;
};

export type WorkspaceReportFile = {
  id: string;
  name: string;
  type: "PDF" | "CSV" | "JSON" | "Markdown";
  sizeLabel: string;
  access: "Client visible" | "Operator only";
  href: string;
};

export type WorkspaceReport = {
  id: string;
  requestId: string;
  organizationId: string;
  title: string;
  status: "Draft" | "Ready for client" | "Delivered";
  period: string;
  deliveredAt: string | null;
  summary: string;
  metrics: Array<{
    label: string;
    value: string;
    delta?: string;
  }>;
  files: WorkspaceReportFile[];
};

export type WorkspaceMessage = {
  id: string;
  organizationId: string;
  requestId?: string;
  authorUserId: string;
  visibility: "Client" | "Internal";
  body: string;
  createdAt: string;
};

export type WorkspaceActivity = {
  id: string;
  organizationId: string;
  actorUserId: string;
  label: string;
  detail: string;
  createdAt: string;
};

export type WorkspaceState = {
  users: WorkspaceUser[];
  organizations: WorkspaceOrganization[];
  requests: WorkspaceReportRequest[];
  reports: WorkspaceReport[];
  messages: WorkspaceMessage[];
  activity: WorkspaceActivity[];
};

export type NewWorkspaceRequestInput = {
  organizationId: string;
  createdByUserId: string;
  packageName: ReportPackage;
  protocol: string;
  networkScope: string[];
  marketScope: string;
  budget: string;
  deadline: string;
  goal: string;
  notes: string;
};

export type NewWorkspaceReportInput = {
  requestId: string;
  organizationId: string;
  title: string;
  summary: string;
  fileName: string;
  fileType: WorkspaceReportFile["type"];
};

const WORKSPACE_STORAGE_KEY = "superchain-liquidity-ops.workspace.v1";

export const WORKSPACE_PACKAGES: ReportPackage[] = [
  "7-day Liquidity Impact Report",
  "Monthly Monitoring",
  "DAO / Incentive Evidence Pack",
];

export const WORKSPACE_BUDGETS = [
  "$500 pilot",
  "$750-$1,500",
  "$750-$1,500/mo",
  "$1,500-$3,000",
  "Need quote",
];

export const WORKSPACE_NETWORKS = [
  "OP Mainnet",
  "Base",
  "Unichain",
  "Mode",
  "Zora",
];

const nowIso = "2026-06-19T10:00:00.000Z";

export const seedWorkspaceState: WorkspaceState = {
  users: [
    {
      id: "user-client",
      name: "Maya Chen",
      email: "maya@example.protocol",
      role: "client",
      organizationId: "org-aerodrome-growth",
      title: "Growth lead",
    },
    {
      id: "user-operator",
      name: "Dima Operator",
      email: "operator@superchainops.local",
      role: "operator",
      organizationId: "org-superchain-ops",
      title: "Report operator",
    },
    {
      id: "user-admin",
      name: "Workspace Admin",
      email: "admin@superchainops.local",
      role: "admin",
      organizationId: "org-superchain-ops",
      title: "Platform owner",
    },
  ],
  organizations: [
    {
      id: "org-aerodrome-growth",
      name: "Example Protocol Growth",
      protocol: "Aerodrome",
      website: "https://aerodrome.finance",
      networkFocus: ["Base", "OP Mainnet"],
      plan: "Pilot",
      status: "Active",
      ownerUserId: "user-client",
    },
    {
      id: "org-velodrome-dao",
      name: "Velodrome DAO Ops",
      protocol: "Velodrome",
      website: "https://velodrome.finance",
      networkFocus: ["OP Mainnet"],
      plan: "Monitoring",
      status: "Prospect",
      ownerUserId: "user-operator",
    },
    {
      id: "org-superchain-ops",
      name: "Superchain Liquidity Ops",
      protocol: "Internal",
      website: "https://prostokripta00.github.io/superchain-liquidity-ops/",
      networkFocus: ["OP Mainnet", "Base", "Unichain", "Mode", "Zora"],
      plan: "Enterprise",
      status: "Active",
      ownerUserId: "user-admin",
    },
  ],
  requests: [
    {
      id: "req-base-impact",
      organizationId: "org-aerodrome-growth",
      createdByUserId: "user-client",
      packageName: "7-day Liquidity Impact Report",
      status: "In progress",
      priority: "High",
      protocol: "Aerodrome",
      networkScope: ["Base"],
      marketScope: "WETH/USDC, cbBTC/USDC and stable pools",
      budget: "$500 pilot",
      deadline: "2026-06-28",
      goal: "Understand whether current Base liquidity creates enough DEX volume and fees to justify a larger incentive update.",
      notes: "Include weak markets and source limitations. PDF and CSV are required.",
      updatedAt: "2026-06-19T09:20:00.000Z",
    },
    {
      id: "req-op-monitoring",
      organizationId: "org-velodrome-dao",
      createdByUserId: "user-operator",
      packageName: "Monthly Monitoring",
      status: "Scoping",
      priority: "Normal",
      protocol: "Velodrome",
      networkScope: ["OP Mainnet"],
      marketScope: "Priority pairs and watchlist pools",
      budget: "$750-$1,500/mo",
      deadline: "2026-07-03",
      goal: "Create a weekly view of volume, fees, at-risk markets and source quality.",
      notes: "Needs recurring snapshot design before client confirmation.",
      updatedAt: "2026-06-18T16:40:00.000Z",
    },
  ],
  reports: [
    {
      id: "report-base-impact",
      requestId: "req-base-impact",
      organizationId: "org-aerodrome-growth",
      title: "Base Liquidity Impact Preview",
      status: "Draft",
      period: "Last 30 days",
      deliveredAt: null,
      summary:
        "Draft report is collecting Base DEX volume, fee output, weak-market signals and source quality notes before client delivery.",
      metrics: [
        { label: "Scope", value: "Base" },
        { label: "Files", value: "3" },
        { label: "Report status", value: "Draft" },
      ],
      files: [
        {
          id: "file-preview-md",
          name: "base-liquidity-impact-preview.md",
          type: "Markdown",
          sizeLabel: "18 KB",
          access: "Operator only",
          href: "#",
        },
        {
          id: "file-preview-csv",
          name: "base-market-evidence.csv",
          type: "CSV",
          sizeLabel: "42 KB",
          access: "Operator only",
          href: "#",
        },
      ],
    },
  ],
  messages: [
    {
      id: "msg-1",
      organizationId: "org-aerodrome-growth",
      requestId: "req-base-impact",
      authorUserId: "user-client",
      visibility: "Client",
      body: "Please include fee-to-volume and at-risk market notes. We need this for an internal liquidity review.",
      createdAt: "2026-06-19T08:30:00.000Z",
    },
    {
      id: "msg-2",
      organizationId: "org-aerodrome-growth",
      requestId: "req-base-impact",
      authorUserId: "user-operator",
      visibility: "Client",
      body: "Confirmed. The first draft will separate public data, unavailable fields, and recommended next actions.",
      createdAt: "2026-06-19T09:00:00.000Z",
    },
  ],
  activity: [
    {
      id: "act-1",
      organizationId: "org-aerodrome-growth",
      actorUserId: "user-client",
      label: "Request created",
      detail: "7-day Liquidity Impact Report for Base markets.",
      createdAt: "2026-06-19T08:12:00.000Z",
    },
    {
      id: "act-2",
      organizationId: "org-aerodrome-growth",
      actorUserId: "user-operator",
      label: "Status moved",
      detail: "Request moved to In progress.",
      createdAt: "2026-06-19T09:20:00.000Z",
    },
    {
      id: "act-3",
      organizationId: "org-superchain-ops",
      actorUserId: "user-admin",
      label: "Workspace ready",
      detail: "Client portal, operator queue and admin readiness checks are enabled in demo mode.",
      createdAt: nowIso,
    },
  ],
};

export function loadWorkspaceState(): WorkspaceState {
  if (typeof window === "undefined") {
    return seedWorkspaceState;
  }

  try {
    const raw = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);

    if (!raw) {
      return seedWorkspaceState;
    }

    return sanitizeWorkspaceState(JSON.parse(raw));
  } catch {
    return seedWorkspaceState;
  }
}

export function saveWorkspaceState(state: WorkspaceState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(state));
}

export function resetWorkspaceState() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(WORKSPACE_STORAGE_KEY);
  }

  return seedWorkspaceState;
}

export function createWorkspaceRequest(
  state: WorkspaceState,
  input: NewWorkspaceRequestInput,
): WorkspaceState {
  const id = `req-${Date.now()}`;
  const request: WorkspaceReportRequest = {
    id,
    organizationId: input.organizationId,
    createdByUserId: input.createdByUserId,
    packageName: input.packageName,
    status: "New",
    priority: "Normal",
    protocol: input.protocol.trim() || "Unknown protocol",
    networkScope: input.networkScope.length > 0 ? input.networkScope : ["OP Mainnet"],
    marketScope: input.marketScope.trim() || "Protocol priority markets",
    budget: input.budget,
    deadline: input.deadline,
    goal: input.goal.trim() || "Measure DEX volume, fees, weak markets and source quality.",
    notes: input.notes.trim(),
    updatedAt: new Date().toISOString(),
  };

  return {
    ...state,
    requests: [request, ...state.requests],
    activity: [
      buildActivity(
        request.organizationId,
        request.createdByUserId,
        "Request created",
        `${request.packageName} for ${request.protocol}.`,
      ),
      ...state.activity,
    ],
  };
}

export function updateWorkspaceRequestStatus(
  state: WorkspaceState,
  requestId: string,
  status: ReportRequestStatus,
  actorUserId: string,
): WorkspaceState {
  const request = state.requests.find((item) => item.id === requestId);

  if (!request) {
    return state;
  }

  return {
    ...state,
    requests: state.requests.map((item) =>
      item.id === requestId
        ? {
            ...item,
            status,
            updatedAt: new Date().toISOString(),
          }
        : item,
    ),
    activity: [
      buildActivity(
        request.organizationId,
        actorUserId,
        "Request status updated",
        `${request.protocol} moved to ${status}.`,
      ),
      ...state.activity,
    ],
  };
}

export function createWorkspaceReport(
  state: WorkspaceState,
  input: NewWorkspaceReportInput,
  actorUserId: string,
): WorkspaceState {
  const report: WorkspaceReport = {
    id: `report-${Date.now()}`,
    requestId: input.requestId,
    organizationId: input.organizationId,
    title: input.title.trim() || "Liquidity Impact Report",
    status: "Ready for client",
    period: "Current snapshot",
    deliveredAt: new Date().toISOString(),
    summary:
      input.summary.trim() ||
      "Report package is ready for client review with source-backed metrics and delivery files.",
    metrics: [
      { label: "Delivery", value: "Ready" },
      { label: "Files", value: "1" },
      { label: "Source policy", value: "Public-source only" },
    ],
    files: [
      {
        id: `file-${Date.now()}`,
        name: input.fileName.trim() || "liquidity-impact-report.pdf",
        type: input.fileType,
        sizeLabel: "Client upload",
        access: "Client visible",
        href: "#",
      },
    ],
  };

  return {
    ...state,
    reports: [report, ...state.reports],
    requests: state.requests.map((request) =>
      request.id === input.requestId
        ? {
            ...request,
            status: "Delivered",
            updatedAt: new Date().toISOString(),
          }
        : request,
    ),
    activity: [
      buildActivity(
        input.organizationId,
        actorUserId,
        "Report delivered",
        `${report.title} was marked ready for client delivery.`,
      ),
      ...state.activity,
    ],
  };
}

export function buildWorkspaceSummary(state: WorkspaceState, organizationId?: string) {
  const requests = organizationId
    ? state.requests.filter((request) => request.organizationId === organizationId)
    : state.requests;
  const reports = organizationId
    ? state.reports.filter((report) => report.organizationId === organizationId)
    : state.reports;
  const activeRequests = requests.filter((request) => request.status !== "Delivered");
  const deliveredReports = reports.filter((report) => report.status === "Delivered");
  const clientVisibleFiles = reports.flatMap((report) =>
    report.files.filter((file) => file.access === "Client visible"),
  );

  return {
    activeRequests: activeRequests.length,
    deliveredReports: deliveredReports.length,
    clientVisibleFiles: clientVisibleFiles.length,
    organizations: organizationId ? 1 : state.organizations.length,
    revenueScope: requests
      .filter((request) => request.budget !== "Need quote")
      .map((request) => request.budget),
  };
}

export const supabaseWorkspaceSchema = `-- Superchain Liquidity Ops workspace schema
-- Full executable SQL is in SUPABASE_WORKSPACE_SCHEMA.sql.

Tables:
- organizations: protocol accounts and network focus
- profiles: Supabase Auth user id, organization, role
- report_requests: client/operator request pipeline
- reports: delivery records and metrics jsonb
- report_files: private Storage paths and client visibility
- workspace_messages: client/internal thread notes
- audit_log: request/report activity

Storage:
- private bucket: report-files
- object path: {organization_id}/{report_id}/{filename}
- signed URLs generated in the frontend

Required env:
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- VITE_SUPABASE_REPORT_BUCKET=report-files`;

function sanitizeWorkspaceState(value: unknown): WorkspaceState {
  if (!value || typeof value !== "object") {
    return seedWorkspaceState;
  }

  const candidate = value as Partial<WorkspaceState>;

  return {
    users: Array.isArray(candidate.users) ? candidate.users : seedWorkspaceState.users,
    organizations: Array.isArray(candidate.organizations)
      ? candidate.organizations
      : seedWorkspaceState.organizations,
    requests: Array.isArray(candidate.requests) ? candidate.requests : seedWorkspaceState.requests,
    reports: Array.isArray(candidate.reports) ? candidate.reports : seedWorkspaceState.reports,
    messages: Array.isArray(candidate.messages) ? candidate.messages : seedWorkspaceState.messages,
    activity: Array.isArray(candidate.activity) ? candidate.activity : seedWorkspaceState.activity,
  };
}

function buildActivity(
  organizationId: string,
  actorUserId: string,
  label: string,
  detail: string,
): WorkspaceActivity {
  return {
    id: `act-${Date.now()}`,
    organizationId,
    actorUserId,
    label,
    detail,
    createdAt: new Date().toISOString(),
  };
}
