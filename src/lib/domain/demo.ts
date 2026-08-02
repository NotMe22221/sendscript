import { WeightedDecisionEngine } from "./decision-engine";
import { DeterministicPolicyEngine, hardwarePolicy } from "./policy-engine";
import type {
  ActivityEvent,
  Decision,
  MissionRequirements,
  MissionStatus,
  Offer,
  PolicyEvaluation,
  TransactionResult,
} from "./schemas";

export const DEMO_ORG_ID = "10000000-0000-4000-8000-000000000001";
export const DEMO_MISSION_ID = "20000000-0000-4000-8000-000000000001";
export const DEMO_POLICY_ID = "30000000-0000-4000-8000-000000000001";
export const DEMO_TRANSACTION_ID = "40000000-0000-4000-8000-000000000001";

export const demoRequirements: MissionRequirements = {
  title: "USB-C hubs for the product team",
  category: "Computer accessories",
  quantity: 8,
  budgetCents: 35000,
  neededBy: "2026-08-18",
  specification: {
    ports: ["HDMI 4K", "USB-C PD", "2× USB-A", "Ethernet"],
    powerDeliveryWatts: 100,
    display: "4K at 60 Hz",
    compatibility: ["macOS", "Windows 11"],
  },
  preferredMerchants: ["Merchant A", "CDW", "Staples Business"],
  notes: "Prioritize reliable chipsets and a minimum one-year warranty.",
  confidence: 0.96,
};

const offer = (
  id: number,
  merchant: string,
  productName: string,
  unitPriceCents: number,
  deliveryDate: string,
  approvedMerchant: boolean,
  sellerRating: number,
  returnDays: number,
  requirementMatch: number,
  shippingCents = 0,
): Offer => ({
  id: `offer-${id.toString().padStart(2, "0")}`,
  merchant,
  seller: merchant === "Amazon Marketplace" ? "Orbit Tech Supply" : merchant,
  productName,
  unitPriceCents,
  quantity: 8,
  shippingCents,
  deliveryDate,
  approvedMerchant,
  sellerRating,
  returnDays,
  requirementMatch,
});

export const demoOffers: Offer[] = [
  offer(1, "Merchant A", "ApexLink Pro 9-in-1 USB-C Hub", 3850, "2026-08-12", true, 4.8, 45, 0.99),
  offer(2, "CDW", "Belkin Connect 8-in-1 Hub", 4299, "2026-08-13", true, 4.7, 30, 0.98),
  offer(3, "Staples Business", "HyperDrive Next 10-Port Hub", 4199, "2026-08-15", true, 4.6, 30, 0.96),
  offer(4, "Merchant A", "Anker PowerExpand 8-in-1", 3999, "2026-08-16", true, 4.9, 45, 0.95),
  offer(5, "Amazon Marketplace", "NovaDock 12-Port USB-C Hub", 2999, "2026-08-11", false, 4.4, 30, 0.91),
  offer(6, "Best Buy Business", "j5create Multi-Port Adapter", 3699, "2026-08-14", false, 4.5, 15, 0.93),
  offer(7, "CDW", "Kensington UH1440P Hub", 4799, "2026-08-12", true, 4.8, 60, 0.94),
  offer(8, "Merchant A", "Twelve South StayGo Mini", 3499, "2026-08-20", true, 4.6, 45, 0.72),
  offer(9, "Staples Business", "StarTech 7-Port USB-C Hub", 4599, "2026-08-17", true, 4.9, 30, 0.92),
  offer(10, "Newegg Business", "Plugable 7-in-1 USB-C Hub", 3399, "2026-08-13", false, 4.7, 30, 0.9),
  offer(11, "Merchant A", "ApexLink Essential 6-in-1", 3299, "2026-08-12", true, 4.1, 30, 0.74),
  offer(12, "CDW", "Dell DA310 Mobile Adapter", 5199, "2026-08-15", true, 4.8, 30, 0.88),
  offer(13, "Amazon Marketplace", "DockForge USB-C Hub", 2499, "2026-08-10", false, 3.8, 14, 0.84),
  offer(14, "Staples Business", "Logitech Logi Dock Flex Hub", 4499, "2026-08-22", true, 4.6, 30, 0.97),
];

const policyEngine = new DeterministicPolicyEngine();
export const demoEvaluations: PolicyEvaluation[] = demoOffers.map((item) =>
  policyEngine.evaluate(item, demoRequirements, hardwarePolicy),
);
export const demoDecision: Decision = new WeightedDecisionEngine().decide(
  demoOffers,
  demoEvaluations,
  demoRequirements.neededBy,
);
export const selectedOffer = demoOffers.find((item) => item.id === demoDecision.selectedOfferId) ?? demoOffers[0];

export interface DemoMission {
  id: string;
  title: string;
  owner: string;
  department: string;
  status: MissionStatus;
  createdAt: string;
  totalCents: number;
  requirements: MissionRequirements;
}

export const demoMission: DemoMission = {
  id: DEMO_MISSION_ID,
  title: demoRequirements.title,
  owner: "Maya Chen",
  department: "Product & Design",
  status: "AWAITING_APPROVAL",
  createdAt: "2026-08-01T17:42:00.000Z",
  totalCents: 30800,
  requirements: demoRequirements,
};

export const demoTransactions: TransactionResult[] = [
  {
    id: DEMO_TRANSACTION_ID,
    missionId: DEMO_MISSION_ID,
    amountCents: 30800,
    merchant: "Merchant A",
    status: "succeeded",
    idempotencyReference: `mission-${DEMO_MISSION_ID}-valid-001`,
    checkoutReference: "MRA-88413",
    createdAt: "2026-08-01T18:18:40.000Z",
  },
  {
    id: "40000000-0000-4000-8000-000000000002",
    missionId: DEMO_MISSION_ID,
    amountCents: 35800,
    merchant: "Merchant A",
    status: "blocked",
    idempotencyReference: `mission-${DEMO_MISSION_ID}-violation-001`,
    failureCode: "THRESHOLD_EXCEEDED",
    createdAt: "2026-08-01T18:16:04.000Z",
  },
];

export const demoEvents: ActivityEvent[] = [
  {
    id: "event-8",
    missionId: DEMO_MISSION_ID,
    type: "transaction.succeeded",
    title: "Purchase completed",
    detail: "$308.00 captured by Merchant A; checkout MRA-88413.",
    actor: "SpendScript",
    createdAt: "2026-08-01T18:18:40.000Z",
    tone: "success",
  },
  {
    id: "event-7",
    missionId: DEMO_MISSION_ID,
    type: "transaction.blocked",
    title: "Out-of-policy charge blocked",
    detail: "$358.00 exceeded the $308.00 mandate cap. No funds moved.",
    actor: "Prava sandbox",
    createdAt: "2026-08-01T18:16:04.000Z",
    tone: "danger",
  },
  {
    id: "event-6",
    missionId: DEMO_MISSION_ID,
    type: "authorization.active",
    title: "Mandate activated",
    detail: "One charge at Merchant A, capped at $308.00 for 24 hours.",
    actor: "Maya Chen",
    createdAt: "2026-08-01T18:14:31.000Z",
    tone: "info",
  },
  {
    id: "event-5",
    missionId: DEMO_MISSION_ID,
    type: "approval.approved",
    title: "Manager approval recorded",
    detail: "Jordan Lee approved the selected offer and spending contract.",
    actor: "Jordan Lee",
    createdAt: "2026-08-01T18:09:12.000Z",
    tone: "success",
  },
  {
    id: "event-4",
    missionId: DEMO_MISSION_ID,
    type: "decision.created",
    title: "Best compliant offer selected",
    detail: "ApexLink Pro ranked first across six deterministic factors.",
    actor: "Decision engine",
    createdAt: "2026-08-01T17:55:48.000Z",
    tone: "info",
  },
  {
    id: "event-3",
    missionId: DEMO_MISSION_ID,
    type: "policy.evaluated",
    title: "14 offers evaluated",
    detail: "4 offers passed every policy rule; 10 were rejected or warned.",
    actor: "Policy engine v3",
    createdAt: "2026-08-01T17:54:19.000Z",
    tone: "neutral",
  },
  {
    id: "event-2",
    missionId: DEMO_MISSION_ID,
    type: "requirements.confirmed",
    title: "Requirements confirmed",
    detail: "8 hubs, $350 budget, required by August 18.",
    actor: "Maya Chen",
    createdAt: "2026-08-01T17:47:02.000Z",
    tone: "neutral",
  },
  {
    id: "event-1",
    missionId: DEMO_MISSION_ID,
    type: "mission.created",
    title: "Mission created",
    detail: "Natural-language request received from Product & Design.",
    actor: "Maya Chen",
    createdAt: "2026-08-01T17:42:00.000Z",
    tone: "neutral",
  },
];

export const demoPolicyRules = [
  { label: "Category", value: "Computer accessories", effect: "Allowed" },
  { label: "Approved merchants", value: "Merchant A, CDW, Staples Business", effect: "Required" },
  { label: "Mission ceiling", value: "$500.00", effect: "Block above" },
  { label: "Manager approval", value: "$250.00", effect: "Required above" },
  { label: "Seller rating", value: "4.2 / 5 minimum", effect: "Required" },
  { label: "Quantity", value: "12 units maximum", effect: "Block above" },
];
