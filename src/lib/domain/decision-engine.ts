import type { Decision, Offer, PolicyEvaluation } from "./schemas";

export const SCORE_WEIGHTS = {
  requirementMatch: 0.35,
  cost: 0.25,
  delivery: 0.15,
  merchantApproval: 0.1,
  sellerTrust: 0.1,
  returnFlexibility: 0.05,
} as const;

export interface DecisionEngine {
  decide(offers: Offer[], evaluations: PolicyEvaluation[], neededBy: string): Decision;
}

function daysBetween(a: string, b: string) {
  return Math.max(0, (new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

export class WeightedDecisionEngine implements DecisionEngine {
  decide(offers: Offer[], evaluations: PolicyEvaluation[], neededBy: string): Decision {
    const compliantIds = new Set(evaluations.filter((item) => item.compliant).map((item) => item.offerId));
    const eligible = offers.filter((offer) => compliantIds.has(offer.id));
    if (eligible.length === 0) throw new Error("NO_COMPLIANT_OFFERS");

    const totals = eligible.map((offer) => offer.unitPriceCents * offer.quantity + offer.shippingCents);
    const low = Math.min(...totals);
    const high = Math.max(...totals);

    const ranked = eligible.map((offer) => {
      const total = offer.unitPriceCents * offer.quantity + offer.shippingCents;
      const cost = high === low ? 1 : 1 - (total - low) / (high - low);
      const delivery = Math.min(1, daysBetween(offer.deliveryDate, neededBy) / 7 + 0.55);
      const merchantApproval = offer.approvedMerchant ? 1 : 0;
      const sellerTrust = Math.min(1, offer.sellerRating / 5);
      const returnFlexibility = Math.min(1, offer.returnDays / 60);
      const parts = {
        requirementMatch: offer.requirementMatch,
        cost,
        delivery,
        merchantApproval,
        sellerTrust,
        returnFlexibility,
      };
      const score = Object.entries(parts).reduce(
        (sum, [key, value]) => sum + value * SCORE_WEIGHTS[key as keyof typeof SCORE_WEIGHTS],
        0,
      );
      return { offer, score, parts };
    });

    ranked.sort((a, b) => b.score - a.score || a.offer.id.localeCompare(b.offer.id));
    const best = ranked[0];
    return {
      selectedOfferId: best.offer.id,
      totalScore: Math.round(best.score * 1000) / 10,
      scoreBreakdown: {
        requirementMatch: Math.round(best.parts.requirementMatch * 100),
        cost: Math.round(best.parts.cost * 100),
        delivery: Math.round(best.parts.delivery * 100),
        merchantApproval: Math.round(best.parts.merchantApproval * 100),
        sellerTrust: Math.round(best.parts.sellerTrust * 100),
        returnFlexibility: Math.round(best.parts.returnFlexibility * 100),
      },
      explanation: `${best.offer.productName} is the highest-scoring compliant offer, balancing full requirement coverage with an approved merchant and on-time delivery.`,
    };
  }
}
