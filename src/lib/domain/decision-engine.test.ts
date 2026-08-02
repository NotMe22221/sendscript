import { describe, expect, it } from "vitest";
import { WeightedDecisionEngine, SCORE_WEIGHTS } from "./decision-engine";
import { demoEvaluations, demoOffers, demoRequirements } from "./demo";

describe("WeightedDecisionEngine", () => {
  it("uses the PRD scoring weights exactly", () => {
    expect(SCORE_WEIGHTS).toEqual({ requirementMatch: .35, cost: .25, delivery: .15, merchantApproval: .1, sellerTrust: .1, returnFlexibility: .05 });
    expect(Object.values(SCORE_WEIGHTS).reduce((sum, value) => sum + value, 0)).toBe(1);
  });

  it("selects the best compliant offer and excludes rejected offers", () => {
    const decision = new WeightedDecisionEngine().decide(demoOffers, demoEvaluations, demoRequirements.neededBy);
    expect(decision.selectedOfferId).toBe("offer-01");
    expect(demoEvaluations.find((item) => item.offerId === decision.selectedOfferId)?.compliant).toBe(true);
  });

  it("breaks exact score ties by stable offer id", () => {
    const offers = [{ ...demoOffers[0], id: "offer-b" }, { ...demoOffers[0], id: "offer-a" }];
    const evaluations = offers.map((offer) => ({ offerId: offer.id, compliant: true, requiresApproval: true, violations: [], warnings: [] }));
    expect(new WeightedDecisionEngine().decide(offers, evaluations, demoRequirements.neededBy).selectedOfferId).toBe("offer-a");
  });
});
