import { requireSupabase, supabaseReportBucket } from "./supabaseClient";
import {
  seedWorkspaceState,
  type NewWorkspaceReportInput,
  type NewWorkspaceRequestInput,
  type ReportPackage,
  type ReportRequestPriority,
  type ReportRequestStatus,
  type WorkspaceActivity,
  type WorkspaceOrganization,
  type WorkspaceReport,
  type WorkspaceReportFile,
  type WorkspaceReportRequest,
  type WorkspaceRole,
  type WorkspaceState,
  type WorkspaceUser,
} from "./workspaceData";

type OrganizationRow = {
  id: string;
  name: string;
  protocol: string;
  website: string | null;
  network_focus: string[] | null;
  plan: WorkspaceOrganization["plan"];
  status: WorkspaceOrganization["status"];
  owner_user_id: string | null;
};

type ProfileRow = {
  id: string;
  organization_id: string | null;
  name: string;
  email: string;
  role: WorkspaceRole;
  title: string | null;
};

type RequestRow = {
  id: string;
  organization_id: string;
  created_by: string | null;
  package_name: ReportPackage;
  status: ReportRequestStatus;
  priority: ReportRequestPriority;
  protocol: string;
  network_scope: string[] | null;
  market_scope: string | null;
  budget: string | null;
  deadline: string | null;
  goal: string | null;
  notes: string | null;
  updated_at: string;
};

type ReportRow = {
  id: string;
  request_id: string | null;
  organization_id: string;
  title: string;
  status: WorkspaceReport["status"];
  period: string | null;
  delivered_at: string | null;
  summary: string | null;
  metrics: WorkspaceReport["metrics"] | null;
};

type ReportFileRow = {
  id: string;
  report_id: string;
  name: string;
  type: WorkspaceReportFile["type"];
  size_label: string | null;
  access: WorkspaceReportFile["access"];
  storage_path: string;
};

type MessageRow = {
  id: string;
  organization_id: string;
  request_id: string | null;
  author_id: string | null;
  visibility: WorkspaceState["messages"][number]["visibility"];
  body: string;
  created_at: string;
};

type ActivityRow = {
  id: string;
  organization_id: string | null;
  actor_id: string | null;
  label: string;
  detail: string | null;
  created_at: string;
};

export type WorkspaceBackendMode = "local" | "supabase";

export type WorkspaceLoadResult = {
  mode: WorkspaceBackendMode;
  state: WorkspaceState;
};

export async function loadSupabaseWorkspaceState(): Promise<WorkspaceLoadResult> {
  const client = requireSupabase();
  const [
    organizationsResult,
    profilesResult,
    requestsResult,
    reportsResult,
    filesResult,
    messagesResult,
    activityResult,
  ] = await Promise.all([
    client.from("organizations").select("*").order("created_at", { ascending: false }),
    client.from("profiles").select("*").order("created_at", { ascending: true }),
    client.from("report_requests").select("*").order("updated_at", { ascending: false }),
    client.from("reports").select("*").order("created_at", { ascending: false }),
    client.from("report_files").select("*").order("created_at", { ascending: false }),
    client.from("workspace_messages").select("*").order("created_at", { ascending: false }),
    client.from("audit_log").select("*").order("created_at", { ascending: false }),
  ]);

  throwIfSupabaseError(organizationsResult.error);
  throwIfSupabaseError(profilesResult.error);
  throwIfSupabaseError(requestsResult.error);
  throwIfSupabaseError(reportsResult.error);
  throwIfSupabaseError(filesResult.error);
  throwIfSupabaseError(messagesResult.error);
  throwIfSupabaseError(activityResult.error);

  const fileRows = (filesResult.data ?? []) as ReportFileRow[];
  const fileUrlMap = await buildSignedFileUrlMap(fileRows);

  const state: WorkspaceState = {
    users: ((profilesResult.data ?? []) as ProfileRow[]).map(profileFromRow),
    organizations: ((organizationsResult.data ?? []) as OrganizationRow[]).map(organizationFromRow),
    requests: ((requestsResult.data ?? []) as RequestRow[]).map(requestFromRow),
    reports: ((reportsResult.data ?? []) as ReportRow[]).map((report) =>
      reportFromRow(
        report,
        fileRows.filter((file) => file.report_id === report.id),
        fileUrlMap,
      ),
    ),
    messages: ((messagesResult.data ?? []) as MessageRow[]).map(messageFromRow),
    activity: ((activityResult.data ?? []) as ActivityRow[]).map(activityFromRow),
  };

  return {
    mode: "supabase",
    state: hydrateEmptyState(state),
  };
}

export async function createSupabaseWorkspaceRequest(input: NewWorkspaceRequestInput) {
  const client = requireSupabase();
  const now = new Date().toISOString();
  const insertPayload = {
    organization_id: input.organizationId,
    created_by: input.createdByUserId,
    package_name: input.packageName,
    status: "New",
    priority: "Normal",
    protocol: input.protocol.trim() || "Unknown protocol",
    network_scope: input.networkScope.length > 0 ? input.networkScope : ["OP Mainnet"],
    market_scope: input.marketScope.trim() || "Protocol priority markets",
    budget: input.budget,
    deadline: normalizeOptionalDate(input.deadline),
    goal: input.goal.trim() || "Measure DEX volume, fees, weak markets and source quality.",
    notes: input.notes.trim(),
    updated_at: now,
  };

  const { data, error } = await client
    .from("report_requests")
    .insert(insertPayload)
    .select("id, organization_id, package_name, protocol")
    .single();

  throwIfSupabaseError(error);

  if (data) {
    await insertActivity(
      data.organization_id,
      input.createdByUserId,
      "Request created",
      `${data.package_name} for ${data.protocol}.`,
    );
  }
}

export async function updateSupabaseWorkspaceRequestStatus(
  requestId: string,
  status: ReportRequestStatus,
  actorUserId: string,
) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("report_requests")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .select("organization_id, protocol")
    .single();

  throwIfSupabaseError(error);

  if (data) {
    await insertActivity(
      data.organization_id,
      actorUserId,
      "Request status updated",
      `${data.protocol} moved to ${status}.`,
    );
  }
}

export async function createSupabaseWorkspaceReport(
  input: NewWorkspaceReportInput,
  actorUserId: string,
  file: File | null,
) {
  const client = requireSupabase();
  const deliveredAt = new Date().toISOString();
  const { data: report, error } = await client
    .from("reports")
    .insert({
      request_id: input.requestId,
      organization_id: input.organizationId,
      title: input.title.trim() || "Liquidity Impact Report",
      status: "Ready for client",
      period: "Current snapshot",
      delivered_at: deliveredAt,
      summary:
        input.summary.trim() ||
        "Report package is ready for client review with source-backed metrics and delivery files.",
      metrics: [
        { label: "Delivery", value: "Ready" },
        { label: "Files", value: "1" },
        { label: "Source policy", value: "Public-source only" },
      ],
    })
    .select("id, title")
    .single();

  throwIfSupabaseError(error);

  if (!report) {
    return;
  }

  const fallbackName = input.fileName.trim() || "liquidity-impact-report.pdf";
  const storagePath = `${input.organizationId}/${report.id}/${Date.now()}-${safeFileName(
    file?.name || fallbackName,
  )}`;
  const sizeLabel = file ? formatFileSize(file.size) : "Registered file";

  if (file) {
    const { error: uploadError } = await client.storage
      .from(supabaseReportBucket)
      .upload(storagePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    throwIfSupabaseError(uploadError);
  }

  const { error: fileError } = await client.from("report_files").insert({
    report_id: report.id,
    organization_id: input.organizationId,
    name: file?.name || fallbackName,
    type: input.fileType,
    size_label: sizeLabel,
    access: "Client visible",
    storage_path: storagePath,
  });

  throwIfSupabaseError(fileError);

  const { error: requestError } = await client
    .from("report_requests")
    .update({
      status: "Delivered",
      updated_at: deliveredAt,
    })
    .eq("id", input.requestId);

  throwIfSupabaseError(requestError);

  await insertActivity(
    input.organizationId,
    actorUserId,
    "Report delivered",
    `${report.title} was marked ready for client delivery.`,
  );
}

export async function signInWorkspaceUser(email: string, password: string) {
  const client = requireSupabase();
  const { error } = await client.auth.signInWithPassword({ email, password });

  throwIfSupabaseError(error);
}

export async function signUpWorkspaceUser(email: string, password: string) {
  const client = requireSupabase();
  const { error } = await client.auth.signUp({ email, password });

  throwIfSupabaseError(error);
}

export async function signOutWorkspaceUser() {
  const client = requireSupabase();
  const { error } = await client.auth.signOut();

  throwIfSupabaseError(error);
}

async function insertActivity(
  organizationId: string,
  actorUserId: string,
  label: string,
  detail: string,
) {
  const client = requireSupabase();
  const { error } = await client.from("audit_log").insert({
    organization_id: organizationId,
    actor_id: actorUserId,
    label,
    detail,
  });

  throwIfSupabaseError(error);
}

async function buildSignedFileUrlMap(files: ReportFileRow[]) {
  const client = requireSupabase();
  const entries = await Promise.all(
    files.map(async (file) => {
      if (!file.storage_path || file.storage_path === "#") {
        return [file.id, "#"] as const;
      }

      const { data, error } = await client.storage
        .from(supabaseReportBucket)
        .createSignedUrl(file.storage_path, 60 * 60);

      if (error || !data?.signedUrl) {
        return [file.id, "#"] as const;
      }

      return [file.id, data.signedUrl] as const;
    }),
  );

  return new Map(entries);
}

function organizationFromRow(row: OrganizationRow): WorkspaceOrganization {
  return {
    id: row.id,
    name: row.name,
    protocol: row.protocol,
    website: row.website ?? "",
    networkFocus: row.network_focus ?? ["OP Mainnet"],
    plan: row.plan,
    status: row.status,
    ownerUserId: row.owner_user_id ?? "",
  };
}

function profileFromRow(row: ProfileRow): WorkspaceUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    organizationId: row.organization_id ?? "",
    title: row.title ?? "",
  };
}

function requestFromRow(row: RequestRow): WorkspaceReportRequest {
  return {
    id: row.id,
    organizationId: row.organization_id,
    createdByUserId: row.created_by ?? "",
    packageName: row.package_name,
    status: row.status,
    priority: row.priority,
    protocol: row.protocol,
    networkScope: row.network_scope ?? ["OP Mainnet"],
    marketScope: row.market_scope ?? "",
    budget: row.budget ?? "Need quote",
    deadline: row.deadline ?? "",
    goal: row.goal ?? "",
    notes: row.notes ?? "",
    updatedAt: row.updated_at,
  };
}

function reportFromRow(
  row: ReportRow,
  files: ReportFileRow[],
  fileUrlMap: Map<string, string>,
): WorkspaceReport {
  return {
    id: row.id,
    requestId: row.request_id ?? "",
    organizationId: row.organization_id,
    title: row.title,
    status: row.status,
    period: row.period ?? "Current snapshot",
    deliveredAt: row.delivered_at,
    summary: row.summary ?? "",
    metrics: row.metrics ?? [],
    files: files.map((file) => ({
      id: file.id,
      name: file.name,
      type: file.type,
      sizeLabel: file.size_label ?? "Uploaded file",
      access: file.access,
      href: fileUrlMap.get(file.id) ?? "#",
    })),
  };
}

function messageFromRow(row: MessageRow): WorkspaceState["messages"][number] {
  return {
    id: row.id,
    organizationId: row.organization_id,
    requestId: row.request_id ?? undefined,
    authorUserId: row.author_id ?? "",
    visibility: row.visibility,
    body: row.body,
    createdAt: row.created_at,
  };
}

function activityFromRow(row: ActivityRow): WorkspaceActivity {
  return {
    id: row.id,
    organizationId: row.organization_id ?? "",
    actorUserId: row.actor_id ?? "",
    label: row.label,
    detail: row.detail ?? "",
    createdAt: row.created_at,
  };
}

function hydrateEmptyState(state: WorkspaceState): WorkspaceState {
  return {
    users: state.users.length > 0 ? state.users : seedWorkspaceState.users,
    organizations:
      state.organizations.length > 0 ? state.organizations : seedWorkspaceState.organizations,
    requests: state.requests,
    reports: state.reports,
    messages: state.messages,
    activity: state.activity,
  };
}

function normalizeOptionalDate(value: string) {
  const trimmed = value.trim();

  if (!trimmed || !/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null;
  }

  return trimmed;
}

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
}

function throwIfSupabaseError(error: unknown) {
  if (!error) {
    return;
  }

  if (typeof error === "object" && "message" in error) {
    throw new Error(String((error as { message: unknown }).message));
  }

  throw new Error(String(error));
}
