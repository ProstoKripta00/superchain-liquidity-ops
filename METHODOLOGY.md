# Superchain Liquidity Ops Methodology

This document defines the measurement model for the live public dashboard.

## Current Data Sources

The app does not load a local metric dataset. Current public dashboard source:

- DefiLlama: DEX market volume, chain-level TVL, protocol/chain fee totals, and protocol source links for OP Mainnet, Base, Unichain, Mode, and Zora.

Pool-level adapters such as GeckoTerminal can be added through a backend or scheduled static ingestion job. They are not used as the browser-first public source because the public API is not reliable from GitHub Pages browser fetches.

Each exported market row includes the source URL and refresh timestamp.

## Data Engine

The app now separates data processing from the React UI.

`src/dataEngine.ts` is responsible for:

- numeric normalization from public API payloads
- nullable metric handling
- sum aggregation without fake replacements
- fee-to-volume ratio calculation
- weighted 7d trend calculation
- market health labels
- outcome target labels
- protocol health score components
- network-scoped totals
- chain coverage rows

This matters because reports, protocol scanner output, CSV exports, and future automation should use the same calculation rules. The UI should not become the source of truth for analytics logic.

## Core Metrics

### TVL

For network rows, the app displays DefiLlama chain TVL.

Production sources may include:

- DEX subgraphs
- DefiLlama adapters
- indexed pool reserves
- onchain token balances plus USD oracle/pricing data

### Market Movement

Weighted DEX market movement over 1-day, 7-day, and 30-day public windows when exposed by DefiLlama.

Used to detect:

- growing markets
- declining DEX activity
- markets that need incentive review

### Volume

Market table: 24-hour, 7-day, and 30-day DEX volume from DefiLlama protocol rows.

Network coverage: 24h, 7d, and 30d DEX volume from DefiLlama.

Used to evaluate whether liquidity is actually being used.

### Fees

Network coverage uses DefiLlama fee totals. Market rows use protocol fee attribution when the fee feed exposes the same protocol.

If protocol-level fee attribution is unavailable, the UI marks the value as unavailable instead of inserting a manual assumption.

### Fee Efficiency

Fee efficiency compares fees generated against liquidity supplied:

```text
fee_efficiency = 30d_fees / TVL
```

This helps reviewers distinguish underused liquidity from markets that generate meaningful activity.

In the live app this concept is represented as 30d fee-to-volume:

```text
fee_to_volume_30d = 30d_fees / 30d_dex_volume
```

### Liquidity Depth

Approximate depth available around active price ranges.

Production implementation can refine pool depth by pool type:

- concentrated liquidity pools: active tick/range analysis
- stable pools: reserves and slippage simulation
- volatile pools: reserve depth and route simulation

## Market Health Labels

### Strong

Market has healthy volume, positive or stable trend, reasonable fee output, and no obvious activity issue.

### Watch

Market has mixed signals, such as meaningful volume with weaker fees, rising activity with low fee capture, or negative short-term movement.

### At Risk

Market has low volume, declining activity, weak fee output, or signs that incentives may not be producing measurable impact.

## Protocol Scanner

The protocol scanner groups live DEX market rows by tracked protocol slug. It is designed to answer a commercial question before manual research starts:

```text
Is this protocol active enough on the Superchain to justify a paid report or outreach?
```

Current tracked profiles include Uniswap, Aerodrome, Velodrome, Curve, PancakeSwap, SushiSwap, Balancer, and KIM Exchange.

## Protocol Health Score

The protocol scanner includes a protocol health score. It is not a security audit, investment rating, or promise that a protocol will pay. It is an operational signal for deciding whether a protocol is worth deeper testing, a mini-report, or outreach.

The score is expressed as:

- total score from `0` to `100`
- grade: `A`, `B`, `C`, or `D`
- data confidence from `0` to `100`
- component breakdown
- strengths
- risks
- recommendation

Components:

| Component | Weight | Signal |
| --- | ---: | --- |
| DEX activity | 30% | 30d matched DEX volume |
| Fee capture | 20% | 30d fees and 30d fee-to-volume |
| Short-term trend | 15% | weighted 7d change |
| Superchain coverage | 15% | matched networks and market count |
| Market quality | 10% | Strong vs At Risk market mix |
| Data confidence | 10% | availability of fee and trend fields |

Grades:

- `A`: 80+
- `B`: 65-79
- `C`: 45-64
- `D`: below 45

Scanner statuses:

- `Ready for report`: enough visible activity and data confidence to prepare a public mini-report and outreach.
- `Monitor`: visible activity, but weak trends, incomplete fee data, or mixed market quality.
- `Low signal`: not enough public activity to justify manual sales effort yet.

The score is intentionally conservative when public data is incomplete. Missing values are not replaced by manual assumptions.

## Reviewer Outputs

The MVP should produce grant-review artifacts:

- CSV export by market
- protocol scanner and health score summary for outreach and report preparation
- Markdown mini-report for a selected protocol
- reports workspace for selecting, previewing, copying, and downloading generated reports
- public sample reports for client-facing proof-of-work across diagnostic, monitoring, and grant-evidence services
- static sample files for stable Markdown, CSV, JSON, and manifest links that do not depend on live data
- trust / proof section that links to the public repository, live app, methodology, sample manifest, reviewer pack, source audit, and delivery boundaries
- offer / pricing page with fixed-scope packages, price ranges, timelines, deliverables, and buyer brief actions
- payment / terms block with payment structure, manual payment methods, delivery gates, client-ready terms copy, and Markdown export
- launch desk with proposal, onboarding email, delivery checklist, buyer FAQ, terms, and sales-kit export
- contact / request report intake with editable client scope, copy-ready request text, GitHub issue link, Markdown export, and JSON export
- intake form with client scope fields, chain and metric selection, local saved intake records, public issue consent, Markdown export, JSON export, and saved-record export
- export pack containing Markdown, CSV, structured JSON, and a manifest-style JSON handoff package
- automation runbook with report, export-pack, watchlist, source-audit, and scope-refresh jobs
- service layer with client-ready package briefs, deliverables, acceptance criteria, and service JSON
- lead target list with A/B/C priority tiers, urgency score, cash angle, next action, Markdown copy, CSV export and JSON export
- outreach pipeline with protocol leads, contact enrichment, persistent local CRM fields, generated DM/email/follow-up pitches, CSV export and JSON export
- chain-level TVL and fee summaries
- watchlist of underperforming markets
- 7d/30d trend reports
- notes explaining why a market is marked Strong, Watch, or At Risk

## Mini Report Generator

The mini-report generator converts the selected protocol scan into a Markdown artifact. It includes:

- executive summary
- protocol snapshot
- health score breakdown
- strengths and risks
- matched Superchain market table
- outreach angle
- recommendation
- next actions
- methodology notes

The generated report is intended for outreach, public examples, grant updates, and protocol growth conversations. It uses the same live scanner output and matched market rows shown in the dashboard.

## Reports Workspace

The Reports workspace turns the highest-signal protocol scans into a working report queue on the dashboard.

Current selection rule:

- prefer protocols marked `Ready for report`
- fall back to the top scanner scores when fewer than three protocols are ready
- generate each report from the same live protocol scan and matched markets used by the selected mini-report workflow

Each report can be selected, previewed as Markdown, copied, or downloaded as an `.md` file. These reports are examples for outreach and reviewer inspection. They are not manually curated endorsements, and they regenerate when the live snapshot changes.

## Public Sample Reports

Public Sample Reports convert the scanner and mini-report output into client-facing proof-of-work examples.

Current sample types:

- Protocol Diagnostic Sprint sample
- Liquidity Monitoring Retainer sample
- Grant Evidence Pack sample

When a matching live protocol scan exists, each sample is generated from current scanner data and matched Superchain markets. When live data is unavailable, the sample remains visible as a template fallback and clearly marks unavailable values. This keeps the sales artifact honest while still showing the report structure.

Each sample includes:

- service type and intended audience
- summary and key scanner metrics
- commercial use case
- Markdown report output
- JSON bundle export for the full public sample library

These samples are designed for public portfolio, outbound sales, and grant/product-review conversations. They are not security audits, investment recommendations, or manually curated endorsements.

## Static Sample Files

Static Sample Files are stable public artifacts served directly from `public/samples/` on GitHub Pages. They complement the generated sample reports.

The generated sample reports are live and can change when public data changes. Static sample files are intentionally fixed so they can be linked in outreach, grant drafts, README documentation, and client calls without requiring the live dashboard to finish loading.

Current files:

- protocol diagnostic Markdown sample
- liquidity monitoring Markdown sample
- grant evidence pack Markdown sample
- client intake Markdown sample
- request report Markdown sample
- market impact CSV sample
- source audit JSON sample
- `index.json` manifest

The static files are not live measurements. They are examples of structure, delivery boundaries, and expected artifact formats. Final paid delivery should still refresh live data, regenerate current reports, and disclose unavailable values.

## Trust / Proof Section

The Trust / Proof section is designed for buyers, grant reviewers, and protocol operators who need to verify the project before responding to an outreach message.

It uses the current app state plus fixed public links to show:

- public GitHub repository
- live GitHub Pages dashboard
- documented methodology
- static sample manifest
- grant reviewer pack
- source audit trail
- delivery boundaries

The section deliberately avoids fake credibility signals. It does not display invented client logos, testimonials, audits, paid users, or guarantees. If the product has not earned a proof point yet, the section should show a boundary or future upgrade instead of implying traction.

Current trust boundaries:

- the product is not a smart-contract security audit
- reports are liquidity and fee intelligence, not financial advice
- unavailable public metrics remain visible
- browser-saved CRM and intake records are local storage, not shared backend storage

This proof layer supports sales conversations by reducing the risk of being a new builder. A buyer can inspect the code, open the live dashboard, review sample artifacts, and check how missing data is handled before ordering a report.

## Offer / Pricing Page

The Offer / Pricing page converts the Service Layer into a public sales surface.

Current packages:

- Protocol Diagnostic Sprint
- Liquidity Monitoring Retainer
- Grant Evidence Pack

Each package includes:

- price range
- timeline
- audience
- readiness status
- fit score
- deliverables
- buyer brief copy
- pricing sheet export

The pricing page is not a payment processor and does not create a binding contract. It is a manual sales page designed to make the service understandable before outreach starts. The pricing ranges are intentionally fixed-scope so the seller can avoid custom unpaid analysis before a client confirms interest.

## Payment / Terms Block

The Payment / Terms block converts the selected service package into client-ready payment and delivery terms.

It is intentionally manual. It does not collect payment, connect wallets, create invoices, or store private payment details in the public app. Its job is to make the first paid engagement easier to agree before the seller moves the conversation to email, Telegram, invoice tooling, or another private channel.

Current payment logic:

- one-off packages use `50% upfront to start, 50% before final handoff`
- monthly monitoring uses `monthly upfront before each monitoring cycle`
- final report, CSV and JSON artifacts are released only after the relevant payment gate is confirmed
- USDC is listed as an optional agreed transfer route, not as in-app custody
- bank transfer, invoice route or another method can be agreed outside the dashboard

Current delivery gates:

- scope confirmed
- payment route confirmed
- work starts after initial payment
- draft review with source notes and unavailable values
- final handoff after the payment gate is satisfied

The block also lists boundaries for fixed scope, one included revision, missing public data, non-audit/non-advice status, refund or re-scope before work starts, and manual agreement handling. These boundaries are designed to keep early sales conversations specific without pretending the static dashboard is a payment processor or legal contract system.

## Launch Desk

The Launch Desk is the final sales-readiness layer. It combines the selected service offer, sample report, export pack, outreach lead, and service-layer state into a single closing and delivery workspace.

Current outputs:

- sales-readiness score
- launch status: `Launch ready`, `Needs review`, or `Blocked`
- proposal Markdown
- onboarding email
- delivery checklist Markdown
- sales-kit JSON
- buyer FAQ
- terms and delivery boundaries
- client intake questions

The readiness score is operational, not legal or financial. It checks whether the current workflow has enough proof and delivery structure to ask for payment without inventing missing evidence.

Readiness inputs:

- selected sellable package
- public proof sample
- export pack availability
- outreach lead route
- lead/contact enrichment status
- service-layer readiness

The Launch Desk is intentionally manual. It does not send messages, collect payment, or sign contracts. Its purpose is to make the project usable for a real first client: copy the proposal, confirm scope, agree payment method outside the app, deliver the report and exports, then save follow-up state in the CRM.

## Contact / Request Report

The Contact / Request Report section turns the selected package and lead context into a client intake surface. It is designed to make the public demo usable as a service entry point without requiring a backend.

Current outputs:

- editable protocol/project field
- editable contact route field
- request type selector
- deadline field
- budget selector
- notes field
- copy-ready Markdown request
- short Telegram/DM request text
- prefilled GitHub issue link
- request JSON export
- delivery guardrails

The section does not submit private data to a server. It generates text, files, and a public GitHub issue URL in the browser. A real client can copy the request into a private channel, open a GitHub issue for public scope discussion, or download the request pack for handoff.

This keeps the sales workflow honest: the app can receive a scoped request, but payment, contracts, sensitive documents, and final delivery terms remain manual until a backend and secure intake process exist.

## Intake Form

The Intake Form is a local client-scope capture workflow. It is meant for the moment after a prospect shows interest and before any unpaid custom analysis starts.

Current fields:

- protocol / project
- team / company
- contact name
- contact route
- role
- decision being supported
- Superchain networks in scope
- metric focus
- deliverable format
- budget
- deadline
- source links
- notes
- public GitHub issue consent

Current outputs:

- intake Markdown
- short Telegram/DM intake text
- intake JSON
- local saved intake queue
- saved-record JSON export
- prefilled public GitHub issue URL

Saved intake forms are stored in the browser's local storage. They are not synced across devices and are not submitted to a server. This is deliberate for the current static GitHub Pages deployment.

The public GitHub issue action is locked until the user checks that a public issue is acceptable. Private contact details, sensitive commercial terms, and non-public documents should stay outside the public issue workflow.

## Export Pack

The Export Pack packages the selected protocol report into a practical handoff bundle.

Current artifacts:

- Markdown report for human review and outreach
- protocol markets CSV containing only markets matched to the selected scanner target
- current scope CSV using the active network and outcome filters
- protocol summary JSON with score, health components, metrics, recommendation, and source audit context
- full JSON handoff pack containing the manifest and embedded artifact contents

The pack is generated in the browser from the same live snapshot as the dashboard. It is not a signed audit file or a permanent archive. The purpose is to make protocol outreach, reviewer updates, and later automation easier to hand off without manually copying several screens.

## Automation

The Automation workspace turns the current live dashboard state into a repeatable operating queue.

Current job types:

- scope refresh: confirms that the selected network and outcome filters have live markets
- report generation: queues the strongest scanner targets for mini-report output
- export pack: packages the selected protocol report into Markdown, CSV and JSON artifacts
- watchlist: flags markets that are not classified as Strong
- source audit: checks whether public data endpoints are OK, degraded, or blocking

Each automation run generates a Markdown runbook with status, scope, job counts, outputs, next-run instructions, and the reason for each job. Browser automation is intentionally conservative: a blocked source or missing selection stays visible instead of being hidden behind a successful-looking export.

## Service Layer

The Service Layer turns the evidence system into client packages. It does not invent results or guarantee sales. It packages the current scanner, report, export and automation state into offers that can be sent to a protocol, grants team, or ecosystem operator.

Current service offers:

- Protocol Diagnostic Sprint: a fixed-scope report using the selected protocol mini-report and matched market exports
- Liquidity Monitoring Retainer: weekly runbook, watchlist and source-health monitoring for the selected Superchain scope
- Grant Evidence Pack: reviewer-ready package for teams that need public evidence around liquidity, volume, fees and source limitations

Each offer includes:

- suggested quote range and timeline
- target audience
- problem statement and sales angle
- deliverables
- acceptance criteria
- included artifacts
- client brief export
- structured service JSON

The layer is intentionally scoped to services that can be delivered from the available product outputs. If an offer depends on a selected export pack or a clean source audit, it is marked `Needs review` or `Blocked` instead of being presented as ready.

## Lead Target List

The Lead Target List turns the broader Outreach Pipeline into a shorter action list for manual sales work.

It does not invent buyers or verified contacts. It ranks the existing scanner-derived leads and tells the operator whether to pitch now, enrich the contact first, or keep monitoring.

Current tiers:

- `A - pitch now`: lead is ready to contact, scanner score is strong enough, and contact enrichment is not marked as needing verification
- `B - enrich next`: lead is new, contact research has not started, contact research is in progress, or the contact route needs verification
- `C - monitor`: lead is already contacted, lower urgency, or better handled through follow-up/monitoring

The urgency score combines:

- scanner score
- tier weight
- CRM status weight
- contact enrichment state

Each target includes:

- rank
- tier
- urgency score
- protocol name
- current lead status
- recommended service package
- suggested price range
- source-backed value signal
- cash angle
- contact route
- contact URL when confirmed
- next action
- source URLs

Exports:

- Markdown target list for quick planning or outreach notes
- CSV target list for spreadsheets
- JSON target list for later automation or backend handoff

The target list is a decision aid, not an automated outreach sender. The next step still happens manually inside Outreach Pipeline, where the user can enrich contacts, choose a pitch, save CRM notes, and track follow-up dates.

## Outreach Pipeline

The Outreach Pipeline turns scanner output into a practical lead list. It is not an automated spam system. It produces a prioritized workspace for manual outreach, with status tracking and copy-ready pitch variants.

Current lead states:

- New
- Ready to contact
- Contacted
- Replied
- Won
- Lost

Current pitch variants:

- DM: short message for X, Discord, Telegram, or ecosystem chats
- Email: longer business-development pitch with subject line
- Follow-up: short second-touch message

Each lead includes:

- scanner score and health grade
- recommended service package
- suggested price range from the Service Layer
- source-backed value signal
- reason for outreach
- next step
- contact target guidance
- contact enrichment status
- preferred contact channel
- contact owner or handle
- contact URL
- enrichment confidence
- research links for X, docs/search, Discord, GitHub, and metric sources
- selected pitch variant
- CRM notes
- last contacted date
- next follow-up date
- public source links

Contact enrichment does not invent private emails or verified contacts. It provides a structured research workflow and stores only user-entered contact data plus suggested public research links. This keeps outreach honest while making it faster to move a protocol from scanner lead to contacted lead.

The current CRM is persisted in browser `localStorage`. Exported CSV and JSON include the saved status, contact enrichment fields, selected pitch, notes, last contacted date, and next follow-up date. Backend or shared multi-device CRM persistence remains a later storage step.

## Initial Live Data Scope

Current adapters cover:

- OP Mainnet
- Base
- Unichain
- Mode
- Zora
- live DEX market volume, protocol fee attribution when available, source URLs, chain TVL, chain DEX volume, chain fees, and basic health scoring

Later phases can add more Superchain networks, DEXs, alerting, APIs, and automated reviewer reports.
