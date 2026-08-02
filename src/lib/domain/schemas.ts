import { z } from "zod";

export const missionStatuses = [
  "DRAFT",
  "ANALYZING",
  "SOURCING",
  "POLICY_REVIEW",
  "AWAITING_APPROVAL",
  "AUTHORIZED",
  "PURCHASING",
  "COMPLETED",
  "BLOCKED",
  "REJECTED",
  "FAILED",
  "CANCELLED",
  "EXPIRED",
] as const;

export const MissionStatusSchema = z.enum(missionStatuses);
export type MissionStatus = z.infer<typeof MissionStatusSchema>;

export const MissionRequirementsSchema = z.object({
  title: z.string().min(3),
  category: z.string().min(2),
  quantity: z.number().int().positive(),
  budgetCents: z.number().int().positive(),
  neededBy: z.string(),
  specification: z.object({
    ports: z.array(z.string()).min(1),
    powerDeliveryWatts: z.number().int().nonnegative(),
    display: z.string(),
    compatibility: z.array(z.string()),
  }),
  preferredMerchants: z.array(z.string()).default([]),
  notes: z.string().default(""),
  confidence: z.number().min(0).max(1),
});
export type MissionRequirements = z.infer<typeof MissionRequirementsSchema>;

export const PolicyRuleSchema = z.object({
  id: z.string(),
  field: z.enum([
    "category",
    "merchant",
    "budget",
    "quantity",
    "delivery",
    "seller_rating",
    "approval_threshold",
  ]),
  operator: z.enum(["equals", "in", "lte", "gte", "before"]),
  value: z.union([z.string(), z.number(), z.array(z.string())]),
  effect: z.enum(["allow", "block", "require_approval"]),
  description: z.string(),
});
export type PolicyRule = z.infer<typeof PolicyRuleSchema>;

export const PolicyDocumentSchema = z.object({
  name: z.string(),
  summary: z.string(),
  rules: z.array(PolicyRuleSchema).min(1),
  confidence: z.number().min(0).max(1),
  ambiguities: z.array(z.string()),
});
export type PolicyDocument = z.infer<typeof PolicyDocumentSchema>;

export const OfferSchema = z.object({
  id: z.string(),
  merchant: z.string(),
  seller: z.string(),
  productName: z.string(),
  unitPriceCents: z.number().int().nonnegative(),
  quantity: z.number().int().positive(),
  shippingCents: z.number().int().nonnegative(),
  deliveryDate: z.string(),
  approvedMerchant: z.boolean(),
  sellerRating: z.number().min(0).max(5),
  returnDays: z.number().int().nonnegative(),
  requirementMatch: z.number().min(0).max(1),
  imageHint: z.string().optional(),
});
export type Offer = z.infer<typeof OfferSchema>;

export const PolicyEvaluationSchema = z.object({
  offerId: z.string(),
  compliant: z.boolean(),
  requiresApproval: z.boolean(),
  violations: z.array(z.string()),
  warnings: z.array(z.string()),
});
export type PolicyEvaluation = z.infer<typeof PolicyEvaluationSchema>;

export const DecisionSchema = z.object({
  selectedOfferId: z.string(),
  totalScore: z.number(),
  scoreBreakdown: z.object({
    requirementMatch: z.number(),
    cost: z.number(),
    delivery: z.number(),
    merchantApproval: z.number(),
    sellerTrust: z.number(),
    returnFlexibility: z.number(),
  }),
  explanation: z.string(),
});
export type Decision = z.infer<typeof DecisionSchema>;

export const AuthorizationContractSchema = z.object({
  missionId: z.string(),
  merchant: z.string(),
  cardId: z.string(),
  amountCapCents: z.number().int().positive(),
  allowedCharges: z.number().int().positive(),
  expiresAt: z.string(),
  itemDescription: z.string(),
});
export type AuthorizationContract = z.infer<typeof AuthorizationContractSchema>;

export const SafePravaMetadataSchema = z.object({
  sessionId: z.string().optional(),
  mandateId: z.string().optional(),
  responseId: z.string().optional(),
  status: z.string(),
  failureCode: z.string().optional(),
  hostedApprovalUrl: z.string().url().optional(),
});
export type SafePravaMetadata = z.infer<typeof SafePravaMetadataSchema>;

export const TransactionResultSchema = z.object({
  id: z.string(),
  missionId: z.string(),
  amountCents: z.number().int().nonnegative(),
  merchant: z.string(),
  status: z.enum(["pending", "blocked", "succeeded", "failed", "cancelled"]),
  idempotencyReference: z.string(),
  checkoutReference: z.string().optional(),
  failureCode: z.string().optional(),
  createdAt: z.string(),
});
export type TransactionResult = z.infer<typeof TransactionResultSchema>;

export const ActivityEventSchema = z.object({
  id: z.string(),
  missionId: z.string(),
  type: z.string(),
  title: z.string(),
  detail: z.string(),
  actor: z.string(),
  createdAt: z.string(),
  tone: z.enum(["neutral", "info", "success", "warning", "danger"]),
});
export type ActivityEvent = z.infer<typeof ActivityEventSchema>;

export type ApiSuccess<T> = { ok: true; data: T; mode: "live" | "demo" };
export type ApiFailure = {
  ok: false;
  error: { code: string; message: string; recoverable: boolean };
};
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export function success<T>(data: T, mode: "live" | "demo" = "live"): ApiSuccess<T> {
  return { ok: true, data, mode };
}

export function failure(code: string, message: string, recoverable = true): ApiFailure {
  return { ok: false, error: { code, message, recoverable } };
}
