# Superchain Liquidity Ops Production Runbook

## Recommended VPS

Start small. The app is static; the server is only needed for scheduled snapshots or private worker jobs.

```text
OS: Ubuntu 24.04 LTS
CPU: 1-2 vCPU
RAM: 2 GB recommended, 1 GB minimum
SSD: 30 GB
Network: 50 Mbps is enough
Region: Amsterdam / Frankfurt / Warsaw / any stable EU region
```

## Production Pieces

```text
GitHub Pages        public site and client portal
Supabase Auth       users and sessions
Supabase Postgres   workspace, reports, payments, snapshots
Supabase Storage    private report files
Node worker         scheduled public-data snapshots
```

## Supabase Setup

1. Create a Supabase project.
2. Run `SUPABASE_WORKSPACE_SCHEMA.sql`.
3. Create private bucket `report-files` if the SQL editor did not create it.
4. Create the first Auth user.
5. Insert first admin profile using the bootstrap SQL at the bottom of `SUPABASE_WORKSPACE_SCHEMA.sql`.
6. Add GitHub repository secrets:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_SUPABASE_REPORT_BUCKET=report-files
SUPABASE_SERVICE_ROLE_KEY
```

`SUPABASE_SERVICE_ROLE_KEY` is server-only. Never put it in frontend code.

## GitHub Actions Snapshots

The repository includes `.github/workflows/scheduled-snapshots.yml`.

It runs daily at `07:00 UTC`, generates:

```text
public/snapshots/latest/manifest.json
public/snapshots/latest/market-impact.csv
public/snapshots/latest/protocol-scores.json
public/snapshots/latest/source-audit.json
public/snapshots/latest/scope-summary.json
snapshots/YYYY/MM/DD/<run-id>/*
```

Then it commits the artifacts back to `main`, which triggers GitHub Pages deployment.

Manual run:

```bash
npm ci
npm run snapshot
```

Supabase metadata upload:

```bash
SUPABASE_URL=https://your-project-ref.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
npm run snapshot -- --supabase
```

## VPS Cron Option

Use this if GitHub Actions is not enough.

```bash
sudo apt update
sudo apt install -y git curl
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
git clone https://github.com/ProstoKripta00/superchain-liquidity-ops.git
cd superchain-liquidity-ops
npm ci
```

Cron:

```text
0 7 * * * cd /opt/superchain-liquidity-ops && npm run snapshot -- --supabase >> /var/log/superchain-snapshot.log 2>&1
```

## Payment Gate

Client-visible final delivery is enabled only when a request is:

```text
Paid
Comped
```

Unpaid or invoice-sent requests can still generate operator drafts, but files stay `Operator only`.

## QA Before Selling

1. Client A cannot read Client B rows.
2. Operator/admin can see all workspaces.
3. Report files use signed URLs from private Storage.
4. `npm run snapshot` creates latest public artifacts.
5. `npm run build` passes with Supabase env secrets.
6. First paid report package includes Markdown, CSV, JSON, and PDF-ready HTML.
