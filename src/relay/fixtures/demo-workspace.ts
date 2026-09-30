/**
 * Seeded demo workspace: a fictional Belgian bakery being handed over between
 * two payroll consultants. All names, figures and dates are invented for the demo.
 * Planted problems: a superseded meal-voucher policy (c2), a stale company-car
 * email (c6), a contradiction on the Sunday premium (c7), tacit knowledge with no
 * document (c3), and a claim that depends on regulation, not documents (c8).
 */
import type {
  Claim,
  ClaimReview,
  Client,
  KnowledgeDocument,
  Person,
  User,
  Workspace,
} from "../types";

export const WORKSPACE: Workspace = { id: "ws-demo", name: "SD Worx Antwerp, payroll team 3" };

export const USERS: User[] = [
  {
    id: "u-incoming",
    email: "incoming@relay.demo",
    name: "Jonas Vermeulen (incoming consultant)",
    workspaceIds: ["ws-demo"],
  },
  {
    id: "u-nadia",
    email: "nadia@relay.demo",
    name: "Nadia Haddad (outgoing consultant)",
    workspaceIds: ["ws-demo"],
  },
  {
    id: "u-outsider",
    email: "outsider@relay.demo",
    name: "Someone from another team",
    workspaceIds: ["ws-other"],
  },
];

export const PEOPLE: Person[] = [
  {
    id: "p-nadia",
    workspaceId: "ws-demo",
    name: "Nadia Haddad",
    email: "nadia@relay.demo",
    role: "Outgoing payroll consultant",
    topics: ["client-history", "contact", "13th-month", "meal-vouchers"],
    jurisdictions: ["BE"],
  },
  {
    id: "p-els",
    workspaceId: "ws-demo",
    name: "Els Peeters",
    email: "els@relay.demo",
    role: "Senior payroll expert, food industry (JC 118)",
    topics: ["joint-committee", "indexation", "sunday-work", "holiday-pay", "premium"],
    jurisdictions: ["BE"],
  },
  {
    id: "p-tom",
    workspaceId: "ws-demo",
    name: "Tom De Smet",
    email: "tom@relay.demo",
    role: "Legal advisor, Belgian social law",
    topics: ["indexation", "meal-vouchers", "benefit-in-kind", "company-car", "regulation"],
    jurisdictions: ["BE"],
  },
];

export const CLIENTS: Client[] = [
  {
    id: "cl-janssens",
    workspaceId: "ws-demo",
    name: "Bakkerij Janssens BV",
    sector: "Bakery, 14 staff",
    jurisdiction: { country: "BE", region: "Flanders", jointCommittee: "118" },
  },
];

export const DOCUMENTS: KnowledgeDocument[] = [
  {
    id: "doc-client-file",
    workspaceId: "ws-demo",
    clientId: "cl-janssens",
    kind: "client-file",
    title: "Client file: Bakkerij Janssens BV",
    updatedAt: "2026-03-12",
    ownerId: "p-nadia",
    topics: ["13th-month", "joint-committee", "sunday-work", "premium", "contact", "holiday-pay"],
    jurisdiction: { country: "BE", region: "Flanders", jointCommittee: "118" },
    content: [
      "Bakkerij Janssens BV, Antwerp. Family bakery with two shops and a small production unit.",
      "Staff: 12 blue-collar workers under Joint Committee 118 (food industry) and 2 office employees under Joint Committee 220.",
      "Company agreement, §4: a 13th-month premium is paid together with the December payroll to all staff with at least six months of service.",
      "Company agreement, §7: work on Sundays is paid with a 100% premium on top of the normal hourly wage.",
      "Contacts: Peter Janssens (owner) and Sofie Janssens (bookkeeper, day-to-day payroll questions).",
    ].join("\n"),
  },
  {
    id: "doc-mealvoucher-2024",
    workspaceId: "ws-demo",
    clientId: "cl-janssens",
    kind: "policy",
    title: "Meal voucher arrangement (2024)",
    updatedAt: "2024-01-15",
    effectiveFrom: "2024-01-01",
    ownerId: "p-nadia",
    topics: ["meal-vouchers"],
    content:
      "From 1 January 2024 every employee receives one meal voucher per day worked with a face value of 7.00 euro: employer contribution 5.91 euro, employee contribution 1.09 euro.",
  },
  {
    id: "doc-mealvoucher-2026",
    workspaceId: "ws-demo",
    clientId: "cl-janssens",
    kind: "policy",
    title: "Meal voucher arrangement (2026)",
    updatedAt: "2026-01-08",
    effectiveFrom: "2026-01-01",
    supersedes: "doc-mealvoucher-2024",
    ownerId: "p-nadia",
    topics: ["meal-vouchers"],
    content:
      "From 1 January 2026 the face value of the daily meal voucher is raised to 8.00 euro: employer contribution 6.91 euro, employee contribution 1.09 euro. This arrangement replaces the 2024 arrangement.",
  },
  {
    id: "doc-company-car-email",
    workspaceId: "ws-demo",
    clientId: "cl-janssens",
    kind: "email",
    title: "Email from Sofie Janssens: delivery vans",
    updatedAt: "2023-05-04",
    ownerId: "p-nadia",
    topics: ["company-car", "benefit-in-kind"],
    content:
      "Hi Nadia, to confirm: we have two delivery vans. They stay at the bakery overnight and are not used privately, so no benefit in kind needs to be calculated. Sofie",
  },
  {
    id: "doc-holiday-note",
    workspaceId: "ws-demo",
    clientId: "cl-janssens",
    kind: "note",
    title: "Note: annual holiday for Bakkerij Janssens staff",
    updatedAt: "2025-04-20",
    ownerId: "p-els",
    topics: ["holiday-pay"],
    content:
      "Blue-collar workers: holiday pay is paid by the holiday fund, normally in May; nothing to process in payroll except the attestation. Office employees: double holiday pay is paid with the May payroll.",
  },
  {
    id: "doc-transcript",
    workspaceId: "ws-demo",
    clientId: "cl-janssens",
    kind: "transcript",
    title: "Handover conversation, Nadia to Jonas (29 Sep 2026)",
    updatedAt: "2026-09-29",
    ownerId: "p-nadia",
    topics: ["client-history"],
    content: [
      "Nadia: So, Bakkerij Janssens. Nice family, easy client. The shop staff fall under joint committee 118, the two office people are 220.",
      "Jonas: Any extras I should know about?",
      "Nadia: They pay a thirteenth month, always with the December payroll. Meal vouchers are seven euro face value, one per day worked.",
      "Nadia: Sunday work happens a lot in a bakery. They pay a fifty percent premium for that, it's in the company agreement.",
      "Nadia: Holiday pay for the workers comes from the holiday fund in May, you only do the attestation.",
      "Nadia: They have two delivery vans, not used privately, so no benefit in kind.",
      "Nadia: And the wages in 118 get indexed every January, keep an eye on that.",
      "Jonas: Who do I call when something is urgent?",
      "Nadia: Peter, the owner. He prefers WhatsApp for urgent questions, don't email him.",
    ].join("\n"),
  },
];

const BE118 = { country: "BE", jointCommittee: "118" };

export const CLAIMS: Claim[] = [
  {
    id: "c1",
    workspaceId: "ws-demo",
    clientId: "cl-janssens",
    text: "The 13th-month premium is paid together with the December payroll.",
    speakerId: "p-nadia",
    saidAt: "2026-09-29",
    sourceDocumentId: "doc-transcript",
    quote: "They pay a thirteenth month, always with the December payroll.",
    topics: ["13th-month"],
    anchors: [],
  },
  {
    id: "c2",
    workspaceId: "ws-demo",
    clientId: "cl-janssens",
    text: "Meal vouchers have a face value of 7 euro per day worked.",
    speakerId: "p-nadia",
    saidAt: "2026-09-29",
    sourceDocumentId: "doc-transcript",
    quote: "Meal vouchers are seven euro face value, one per day worked.",
    topics: ["meal-vouchers"],
    anchors: [{ topic: "meal-vouchers", jurisdiction: { country: "BE" } }],
  },
  {
    id: "c3",
    workspaceId: "ws-demo",
    clientId: "cl-janssens",
    text: "The owner, Peter Janssens, prefers WhatsApp for urgent questions.",
    speakerId: "p-nadia",
    saidAt: "2026-09-29",
    sourceDocumentId: "doc-transcript",
    quote: "He prefers WhatsApp for urgent questions, don't email him.",
    topics: ["contact"],
    anchors: [],
  },
  {
    id: "c4",
    workspaceId: "ws-demo",
    clientId: "cl-janssens",
    text: "The shop staff fall under Joint Committee 118.",
    speakerId: "p-nadia",
    saidAt: "2026-09-29",
    sourceDocumentId: "doc-transcript",
    quote: "The shop staff fall under joint committee 118, the two office people are 220.",
    topics: ["joint-committee"],
    anchors: [{ topic: "joint-committee", jurisdiction: BE118 }],
  },
  {
    id: "c5",
    workspaceId: "ws-demo",
    clientId: "cl-janssens",
    text: "Holiday pay for the blue-collar workers is paid by the holiday fund in May.",
    speakerId: "p-nadia",
    saidAt: "2026-09-29",
    sourceDocumentId: "doc-transcript",
    quote: "Holiday pay for the workers comes from the holiday fund in May, you only do the attestation.",
    topics: ["holiday-pay"],
    anchors: [{ topic: "holiday-pay", jurisdiction: { country: "BE" } }],
  },
  {
    id: "c6",
    workspaceId: "ws-demo",
    clientId: "cl-janssens",
    text: "The two delivery vans are not used privately, so no benefit in kind applies.",
    speakerId: "p-nadia",
    saidAt: "2026-09-29",
    sourceDocumentId: "doc-transcript",
    quote: "They have two delivery vans, not used privately, so no benefit in kind.",
    topics: ["company-car", "benefit-in-kind"],
    anchors: [{ topic: "benefit-in-kind", jurisdiction: { country: "BE" } }],
  },
  {
    id: "c7",
    workspaceId: "ws-demo",
    clientId: "cl-janssens",
    text: "Sunday work is paid with a 50% premium.",
    speakerId: "p-nadia",
    saidAt: "2026-09-29",
    sourceDocumentId: "doc-transcript",
    quote: "They pay a fifty percent premium for that, it's in the company agreement.",
    topics: ["sunday-work", "premium"],
    anchors: [{ topic: "sunday-work", jurisdiction: BE118 }],
  },
  {
    id: "c8",
    workspaceId: "ws-demo",
    clientId: "cl-janssens",
    text: "Wages under Joint Committee 118 are indexed every January.",
    speakerId: "p-nadia",
    saidAt: "2026-09-29",
    sourceDocumentId: "doc-transcript",
    quote: "The wages in 118 get indexed every January, keep an eye on that.",
    topics: ["indexation", "joint-committee"],
    anchors: [{ topic: "indexation", jurisdiction: BE118 }],
  },
];

export const REVIEWS: ClaimReview[] = [];
