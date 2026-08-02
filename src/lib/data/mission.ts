import "server-only";

import { RouteError, type RequestContext } from "@/lib/api/route";
import {
  DecisionSchema,
  MissionRequirementsSchema,
  OfferSchema,
  PolicyEvaluationSchema,
  type Decision,
  type MissionRequirements,
  type Offer,
  type PolicyEvaluation,
} from "@/lib/domain/schemas";
import { hardwarePolicy, type PolicyConfig } from "@/lib/domain/policy-engine";

function offerFromRow(row: Record<string, unknown>): Offer {
  return OfferSchema.parse({
    id: row.id,
    merchant: row.merchant,
    seller: row.seller,
    productName: row.product_name,
    unitPriceCents: row.unit_price_cents,
    quantity: row.quantity,
    shippingCents: row.shipping_cents,
    deliveryDate: row.delivery_date,
    approvedMerchant: row.approved_merchant,
    sellerRating: row.seller_rating,
    returnDays: row.return_days,
    requirementMatch: row.requirement_match,
  });
}

function policyConfig(value: unknown, approvedMerchants: string[]): PolicyConfig {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    approvedMerchants: approvedMerchants.length ? approvedMerchants : hardwarePolicy.approvedMerchants,
    maxBudgetCents: Number(input.maxBudgetCents ?? hardwarePolicy.maxBudgetCents),
    maxQuantity: Number(input.maxQuantity ?? hardwarePolicy.maxQuantity),
    minSellerRating: Number(input.minSellerRating ?? hardwarePolicy.minSellerRating),
    approvalThresholdCents: Number(input.approvalThresholdCents ?? hardwarePolicy.approvalThresholdCents),
  };
}

export interface MissionProcurementData {
  mission: { id: string; title: string; status: string };
  requirements: MissionRequirements;
  offers: Offer[];
  evaluations: PolicyEvaluation[];
  decision?: Decision;
  policy: { id: string; name: string; version: number; config: PolicyConfig };
}

export async function getMissionProcurementData(context: RequestContext, missionId: string): Promise<MissionProcurementData> {
  const supabase = context.supabase;
  const [missionResult, requirementsResult, offersResult, evaluationsResult, decisionResult, policyResult, merchantsResult] = await Promise.all([
    supabase.from("missions").select("id,title,status,policy_id").eq("organization_id", context.organizationId).eq("id", missionId).maybeSingle(),
    supabase.from("mission_requirements").select("requirements").eq("organization_id", context.organizationId).eq("mission_id", missionId).maybeSingle(),
    supabase.from("offers").select("*").eq("organization_id", context.organizationId).order("unit_price_cents"),
    supabase.from("policy_evaluations").select("offer_id,compliant,requires_approval,violations,warnings").eq("organization_id", context.organizationId).eq("mission_id", missionId),
    supabase.from("decisions").select("selected_offer_id,total_score,score_breakdown,explanation").eq("organization_id", context.organizationId).eq("mission_id", missionId).maybeSingle(),
    supabase.from("policies").select("id,name,version,parsed_rules").eq("organization_id", context.organizationId).eq("status", "active").order("version", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("approved_merchants").select("name").eq("organization_id", context.organizationId).eq("active", true),
  ]);

  if (missionResult.error || !missionResult.data) throw new RouteError("MISSION_NOT_FOUND", "This mission does not exist or is outside your organization.", 404, false);
  if (requirementsResult.error || !requirementsResult.data) throw new RouteError("REQUIREMENTS_REQUIRED", "Confirm mission requirements before sourcing.", 409, true);
  if (offersResult.error) throw new Error(`DATABASE_OFFERS_FAILED:${offersResult.error.code}`);
  if (policyResult.error || !policyResult.data) throw new RouteError("ACTIVE_POLICY_REQUIRED", "Create and activate a procurement policy before evaluating offers.", 409, true);

  const evaluations = (evaluationsResult.data ?? []).map((row) => PolicyEvaluationSchema.parse({
    offerId: row.offer_id,
    compliant: row.compliant,
    requiresApproval: row.requires_approval,
    violations: row.violations,
    warnings: row.warnings,
  }));
  const decision = decisionResult.data ? DecisionSchema.parse({
    selectedOfferId: decisionResult.data.selected_offer_id,
    totalScore: decisionResult.data.total_score,
    scoreBreakdown: decisionResult.data.score_breakdown,
    explanation: decisionResult.data.explanation,
  }) : undefined;
  const requirements = MissionRequirementsSchema.parse(requirementsResult.data.requirements);

  return {
    mission: { id: String(missionResult.data.id), title: String(missionResult.data.title), status: String(missionResult.data.status) },
    requirements,
    offers: (offersResult.data ?? []).map((row) => ({ ...offerFromRow(row as Record<string, unknown>), quantity: requirements.quantity })),
    evaluations,
    decision,
    policy: {
      id: String(policyResult.data.id),
      name: String(policyResult.data.name),
      version: Number(policyResult.data.version),
      config: policyConfig(policyResult.data.parsed_rules, (merchantsResult.data ?? []).map((row) => String(row.name))),
    },
  };
}
