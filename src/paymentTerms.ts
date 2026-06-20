import type { SalesKit } from "./salesKit";
import type { ServiceOffer } from "./serviceLayer";

import { formatUtcDateTime } from "./dateFormat";

export type PaymentTermGate = {
  detail: string;
  id: string;
  title: string;
};

export type PaymentTermPolicy = {
  detail: string;
  title: string;
};

export type PaymentTermsPack = {
  clientMessage: string;
  generatedAt: string;
  gates: PaymentTermGate[];
  methods: string[];
  policies: PaymentTermPolicy[];
  summary: string;
  termsMarkdown: string;
  values: Array<{ label: string; value: string }>;
};

export function buildPaymentTermsPack({
  salesKit,
  selectedOffer,
}: {
  salesKit: SalesKit;
  selectedOffer: ServiceOffer | null;
}): PaymentTermsPack {
  const generatedAt = new Date().toISOString();
  const packageName = selectedOffer?.name ?? salesKit.packageName;
  const priceLabel = selectedOffer?.priceLabel ?? salesKit.priceLabel;
  const timeline = selectedOffer?.timeline ?? salesKit.timeline;
  const isRetainer = selectedOffer?.id === "monitoring-retainer";
  const paymentStructure = isRetainer
    ? "Monthly upfront before each monitoring cycle"
    : "50% upfront to start, 50% before final handoff";
  const finalHandoff = isRetainer
    ? "Weekly artifacts are released inside the paid monitoring month"
    : "Final report, CSV and JSON artifacts are released after the final payment is confirmed";

  const values = [
    { label: "Selected package", value: packageName },
    { label: "Price", value: priceLabel },
    { label: "Timeline", value: timeline },
    { label: "Payment structure", value: paymentStructure },
    { label: "Delivery gate", value: finalHandoff },
    { label: "Status", value: salesKit.status },
  ];

  const methods = [
    "OP transfer by agreed wallet and network",
    "USDT transfer by agreed wallet and network",
    "USDC transfer by agreed wallet and network",
    "No card checkout, wallet collection, or payment custody inside the public app",
  ];

  const gates = [
    {
      id: "scope",
      title: "Scope confirmed",
      detail:
        "Protocol, chain scope, metrics, deliverable format, deadline and contact route are agreed before work starts.",
    },
    {
      id: "payment-route",
      title: "Payment route confirmed",
      detail:
        "Client confirms OP, USDT or USDC payment method, payer identity, wallet details, network and any compliance notes outside the public dashboard.",
    },
    {
      id: "start",
      title: "Work starts after initial payment",
      detail: isRetainer
        ? "Monitoring starts after the first month is paid."
        : "Data refresh, report writing and export packaging start after the upfront payment is confirmed.",
    },
    {
      id: "draft",
      title: "Draft review",
      detail:
        "Client receives a draft or preview with source notes, unavailable values and one included revision pass.",
    },
    {
      id: "handoff",
      title: "Final handoff",
      detail: finalHandoff,
    },
  ];

  const policies = [
    {
      title: "Fixed scope",
      detail:
        "The package covers the agreed protocol, networks, metrics and artifact formats. New protocols, private data, custom dashboards or extra revisions are re-scoped.",
    },
    {
      title: "One revision included",
      detail:
        "One revision pass is included for wording, framing and clearly defined metric presentation. New analysis requests are separate scope.",
    },
    {
      title: "Source gaps disclosed",
      detail:
        "Unavailable public values stay marked as unavailable. Manual estimates are not added unless the client explicitly approves the method.",
    },
    {
      title: "No audit or advice claim",
      detail:
        "The deliverable is liquidity and fee intelligence. It is not financial advice, investment advice, tax advice or a smart-contract security audit.",
    },
    {
      title: "Refund or re-scope before work starts",
      detail:
        "If the agreed public data is unavailable before work begins, the package can be re-scoped or the unpaid work can be cancelled. Delivered analysis time is not treated as a free trial.",
    },
    {
      title: "Manual agreement",
      detail:
        "Payment, invoices, tax handling, wallet details, signatures and private documents are handled outside this static public dashboard.",
    },
  ];

  const clientMessage = [
    `For ${packageName}, the current quote is ${priceLabel} with ${timeline} delivery.`,
    `Payment terms: ${paymentStructure}.`,
    "Accepted payment: OP, USDT or USDC by agreed wallet and network.",
    "Before I start, we confirm the protocol scope, chains, metrics, deadline, deliverable format and payment route.",
    finalHandoff,
    "The work is source-backed analytics, not financial advice or a security audit.",
  ].join("\n");

  const termsMarkdown = buildTermsMarkdown({
    clientMessage,
    gates,
    generatedAt,
    methods,
    policies,
    values,
  });

  return {
    clientMessage,
    generatedAt,
    gates,
    methods,
    policies,
    summary:
      "Manual payment terms for selling a fixed-scope Superchain liquidity report without adding checkout, custody, unsupported guarantees, or hidden delivery conditions.",
    termsMarkdown,
    values,
  };
}

function buildTermsMarkdown({
  clientMessage,
  gates,
  generatedAt,
  methods,
  policies,
  values,
}: {
  clientMessage: string;
  gates: PaymentTermGate[];
  generatedAt: string;
  methods: string[];
  policies: PaymentTermPolicy[];
  values: Array<{ label: string; value: string }>;
}) {
  return [
    "# Superchain Liquidity Ops Payment Terms",
    "",
    `Generated: ${formatUtcDateTime(generatedAt)}`,
    "",
    "## Commercial Snapshot",
    "",
    ...values.map((item) => `- ${item.label}: ${item.value}`),
    "",
    "## Payment Methods",
    "",
    ...methods.map((item) => `- ${item}`),
    "",
    "## Delivery Gates",
    "",
    ...gates.map((gate) => `- ${gate.title}: ${gate.detail}`),
    "",
    "## Terms And Boundaries",
    "",
    ...policies.map((policy) => `- ${policy.title}: ${policy.detail}`),
    "",
    "## Client Message",
    "",
    clientMessage,
    "",
  ].join("\n");
}
