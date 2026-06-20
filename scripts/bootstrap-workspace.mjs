import { createClient } from "@supabase/supabase-js";
import { Buffer } from "node:buffer";
import { randomBytes } from "node:crypto";

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Set SUPABASE_URL or VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
}

const adminEmail = process.env.ADMIN_EMAIL ?? "dzmitru.papkou@gmail.com";
const adminPassword = process.env.ADMIN_PASSWORD ?? makePassword("Admin");
const clientEmail = process.env.CLIENT_EMAIL ?? "demo.client@superchainops.local";
const clientPassword = process.env.CLIENT_PASSWORD ?? makePassword("Client");

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const adminUser = await getOrCreateUser(adminEmail, adminPassword, {
  name: "Workspace Admin",
  role: "admin",
});
const clientUser = await getOrCreateUser(clientEmail, clientPassword, {
  name: "Demo Client",
  role: "client",
});

const internalOrg = await getOrCreateOrganization({
  name: "Superchain Liquidity Ops",
  protocol: "Internal",
  website: "https://prostokripta00.github.io/superchain-liquidity-ops/",
  network_focus: ["OP Mainnet", "Base", "Unichain", "Mode", "Zora"],
  plan: "Enterprise",
  status: "Active",
  owner_user_id: adminUser.id,
});

const demoOrg = await getOrCreateOrganization({
  name: "Aerodrome Demo Growth Workspace",
  protocol: "Aerodrome",
  website: "https://aerodrome.finance",
  network_focus: ["Base", "OP Mainnet"],
  plan: "Pilot",
  status: "Active",
  owner_user_id: clientUser.id,
});

await upsertProfile({
  id: adminUser.id,
  organization_id: internalOrg.id,
  name: "Workspace Admin",
  email: adminEmail,
  role: "admin",
  title: "Platform owner",
});

await upsertProfile({
  id: clientUser.id,
  organization_id: demoOrg.id,
  name: "Demo Client",
  email: clientEmail,
  role: "client",
  title: "Growth lead",
});

const request = await getOrCreateRequest({
  organization_id: demoOrg.id,
  created_by: clientUser.id,
  package_name: "7-day Liquidity Impact Report",
  status: "Review",
  priority: "High",
  protocol: "Aerodrome",
  network_scope: ["Base", "OP Mainnet"],
  market_scope: "WETH/USDC, cbBTC/USDC, USDC/USDT",
  budget: "$500 pilot",
  deadline: "2026-06-28",
  goal:
    "Measure whether Aerodrome priority liquidity is producing enough DEX volume, fees and capital efficiency to justify the next incentive action.",
  notes:
    "Demo workspace for buyer walkthroughs. Includes client-visible files, operator-only notes and payment-gated delivery.",
  payment_status: "Paid",
  payment_method: "USDC",
  invoice_url: "https://example.com/invoice/superchain-demo-aerodrome",
  updated_at: new Date().toISOString(),
});

const report = await getOrCreateReport({
  request_id: request.id,
  organization_id: demoOrg.id,
  title: "Aerodrome Base Liquidity Impact Report",
  status: "Ready for client",
  period: "Latest public snapshot",
  delivered_at: new Date().toISOString(),
  summary:
    "Demo client package with source-backed liquidity, fee and weak-market evidence. This is seeded sample data for production QA and sales walkthroughs.",
  metrics: [
    { label: "Network", value: "Base / OP Mainnet" },
    { label: "Payment", value: "Paid" },
    { label: "Client-visible files", value: "3" },
  ],
});

const files = [
  {
    name: "aerodrome-demo-client-memo.md",
    type: "Markdown",
    mimeType: "text/markdown;charset=utf-8",
    access: "Client visible",
    content: `# Aerodrome Liquidity Impact Demo

## Scope
- Networks: Base, OP Mainnet
- Markets: WETH/USDC, cbBTC/USDC, USDC/USDT
- Package: 7-day Liquidity Impact Report

## Executive note
This seeded package demonstrates how a protocol team receives a concise liquidity impact readout, source notes and next-action recommendations.
`,
  },
  {
    name: "aerodrome-demo-evidence.csv",
    type: "CSV",
    mimeType: "text/csv;charset=utf-8",
    access: "Client visible",
    content:
      "market,network,signal,recommendation\nWETH/USDC,Base,strong fee depth,maintain monitoring\ncbBTC/USDC,Base,watchlist volatility,review weekly\nUSDC/USDT,OP Mainnet,stable baseline,compare incentives\n",
  },
  {
    name: "aerodrome-demo-manifest.json",
    type: "JSON",
    mimeType: "application/json;charset=utf-8",
    access: "Client visible",
    content: JSON.stringify(
      {
        package: "7-day Liquidity Impact Report",
        protocol: "Aerodrome",
        organizationId: demoOrg.id,
        requestId: request.id,
        generatedFor: "production QA",
      },
      null,
      2,
    ),
  },
  {
    name: "aerodrome-operator-notes.md",
    type: "Markdown",
    mimeType: "text/markdown;charset=utf-8",
    access: "Operator only",
    content:
      "# Operator Notes\n\nThis file should not be visible as a client-facing delivery asset. It validates file access labeling and operator workflow separation.\n",
  },
];

for (const file of files) {
  await uploadReportFile(demoOrg.id, report.id, file);
}

await insertIfMissing("workspace_messages", {
  organization_id: demoOrg.id,
  request_id: request.id,
  author_id: clientUser.id,
  visibility: "Client",
  body:
    "Please make the first demo report client-readable and include weak-market notes before we send this style to a real protocol lead.",
});

await insertIfMissing("workspace_messages", {
  organization_id: demoOrg.id,
  request_id: request.id,
  author_id: adminUser.id,
  visibility: "Client",
  body:
    "Confirmed. This demo workspace now includes paid request state, client-visible files, private Storage paths and audit activity.",
});

await insertIfMissing("audit_log", {
  organization_id: demoOrg.id,
  actor_id: adminUser.id,
  label: "Production demo seeded",
  detail:
    "Admin, client profile, paid request, report package, private files and messages were created for RLS QA.",
});

console.log(
  JSON.stringify(
    {
      admin: { email: adminEmail, password: process.env.ADMIN_PASSWORD ? "provided" : adminPassword },
      client: { email: clientEmail, password: process.env.CLIENT_PASSWORD ? "provided" : clientPassword },
      organizationId: demoOrg.id,
      requestId: request.id,
      reportId: report.id,
    },
    null,
    2,
  ),
);

async function getOrCreateUser(email, password, metadata) {
  const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();

  if (listError) {
    throw listError;
  }

  const existing = existingUsers.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());

  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      email,
      password,
      email_confirm: true,
      user_metadata: metadata,
    });

    if (error) {
      throw error;
    }

    return data.user;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  });

  if (error) {
    throw error;
  }

  return data.user;
}

async function getOrCreateOrganization(input) {
  const { data: existing, error: lookupError } = await supabase
    .from("organizations")
    .select("*")
    .eq("name", input.name)
    .eq("protocol", input.protocol)
    .limit(1);

  if (lookupError) {
    throw lookupError;
  }

  if (existing?.[0]) {
    const { data, error } = await supabase
      .from("organizations")
      .update(input)
      .eq("id", existing[0].id)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  const { data, error } = await supabase.from("organizations").insert(input).select("*").single();

  if (error) {
    throw error;
  }

  return data;
}

async function upsertProfile(input) {
  const { error } = await supabase.from("profiles").upsert(input, { onConflict: "id" });

  if (error) {
    throw error;
  }
}

async function getOrCreateRequest(input) {
  const { data: existing, error: lookupError } = await supabase
    .from("report_requests")
    .select("*")
    .eq("organization_id", input.organization_id)
    .eq("protocol", input.protocol)
    .eq("package_name", input.package_name)
    .limit(1);

  if (lookupError) {
    throw lookupError;
  }

  if (existing?.[0]) {
    const { data, error } = await supabase
      .from("report_requests")
      .update(input)
      .eq("id", existing[0].id)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  const { data, error } = await supabase.from("report_requests").insert(input).select("*").single();

  if (error) {
    throw error;
  }

  return data;
}

async function getOrCreateReport(input) {
  const { data: existing, error: lookupError } = await supabase
    .from("reports")
    .select("*")
    .eq("request_id", input.request_id)
    .eq("title", input.title)
    .limit(1);

  if (lookupError) {
    throw lookupError;
  }

  if (existing?.[0]) {
    const { data, error } = await supabase
      .from("reports")
      .update(input)
      .eq("id", existing[0].id)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  const { data, error } = await supabase.from("reports").insert(input).select("*").single();

  if (error) {
    throw error;
  }

  return data;
}

async function uploadReportFile(organizationId, reportId, file) {
  const storagePath = `${organizationId}/${reportId}/seed-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from("report-files")
    .upload(storagePath, Buffer.from(file.content, "utf8"), {
      cacheControl: "3600",
      contentType: file.mimeType,
      upsert: true,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data: existing, error: lookupError } = await supabase
    .from("report_files")
    .select("id")
    .eq("report_id", reportId)
    .eq("storage_path", storagePath)
    .limit(1);

  if (lookupError) {
    throw lookupError;
  }

  const payload = {
    report_id: reportId,
    organization_id: organizationId,
    name: file.name,
    type: file.type,
    size_label: `${Math.max(1, Math.round(file.content.length / 1024))} KB`,
    access: file.access,
    storage_path: storagePath,
  };

  if (existing?.[0]) {
    const { error } = await supabase.from("report_files").update(payload).eq("id", existing[0].id);

    if (error) {
      throw error;
    }

    return;
  }

  const { error } = await supabase.from("report_files").insert(payload);

  if (error) {
    throw error;
  }
}

async function insertIfMissing(table, input) {
  const { data: existing, error: lookupError } = await supabase
    .from(table)
    .select("id")
    .eq("organization_id", input.organization_id)
    .eq("body" in input ? "body" : "label", "body" in input ? input.body : input.label)
    .limit(1);

  if (lookupError) {
    throw lookupError;
  }

  if (existing?.[0]) {
    return;
  }

  const { error } = await supabase.from(table).insert(input);

  if (error) {
    throw error;
  }
}

function makePassword(label) {
  return `SLO-${label}-26!${randomBytes(9).toString("base64url")}`;
}
