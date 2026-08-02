import type { MissionRequirements, Offer, PolicyEvaluation } from "./schemas";

export interface PolicyConfig {
  approvedMerchants: string[];
  maxBudgetCents: number;
  maxQuantity: number;
  minSellerRating: number;
  approvalThresholdCents: number;
}

export const hardwarePolicy: PolicyConfig = {
  approvedMerchants: ["Merchant A", "CDW", "Staples Business"],
  maxBudgetCents: 50000,
  maxQuantity: 12,
  minSellerRating: 4.2,
  approvalThresholdCents: 25000,
};

export interface PolicyEngine {
  evaluate(offer: Offer, requirements: MissionRequirements, policy: PolicyConfig): PolicyEvaluation;
}

export class DeterministicPolicyEngine implements PolicyEngine {
  evaluate(offer: Offer, requirements: MissionRequirements, policy: PolicyConfig): PolicyEvaluation {
    const violations: string[] = [];
    const warnings: string[] = [];
    const total = offer.unitPriceCents * offer.quantity + offer.shippingCents;

    if (!policy.approvedMerchants.includes(offer.merchant)) violations.push("Merchant is not approved");
    if (total > Math.min(policy.maxBudgetCents, requirements.budgetCents)) violations.push("Total exceeds mission budget");
    if (offer.quantity > policy.maxQuantity || offer.quantity !== requirements.quantity) violations.push("Quantity is outside policy");
    if (offer.deliveryDate > requirements.neededBy) violations.push("Delivery misses the required date");
    if (offer.sellerRating < policy.minSellerRating) violations.push("Seller rating is below policy minimum");
    if (offer.returnDays < 30) warnings.push("Return window is shorter than 30 days");

    return {
      offerId: offer.id,
      compliant: violations.length === 0,
      requiresApproval: total >= policy.approvalThresholdCents,
      violations,
      warnings,
    };
  }
}
