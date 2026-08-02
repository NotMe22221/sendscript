import { describe, expect, it } from "vitest";
import { demoOffers, demoRequirements } from "./demo";
import { DeterministicPolicyEngine, hardwarePolicy } from "./policy-engine";

const engine = new DeterministicPolicyEngine();

describe("DeterministicPolicyEngine", () => {
  it("passes the selected $308 approved-merchant offer and requires approval", () => {
    const result = engine.evaluate(demoOffers[0], demoRequirements, hardwarePolicy);
    expect(result.compliant).toBe(true);
    expect(result.requiresApproval).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it("blocks unapproved merchants, excess budget, quantity, delivery, and trust failures", () => {
    const offer = { ...demoOffers[0], merchant: "Unknown", approvedMerchant: false, unitPriceCents: 7000, quantity: 13, deliveryDate: "2026-08-25", sellerRating: 3.5 };
    const result = engine.evaluate(offer, demoRequirements, hardwarePolicy);
    expect(result.compliant).toBe(false);
    expect(result.violations).toEqual(expect.arrayContaining(["Merchant is not approved", "Total exceeds mission budget", "Quantity is outside policy", "Delivery misses the required date", "Seller rating is below policy minimum"]));
  });

  it("warns on a short return window without letting AI alter the outcome", () => {
    const result = engine.evaluate({ ...demoOffers[0], returnDays: 14 }, demoRequirements, hardwarePolicy);
    expect(result.compliant).toBe(true);
    expect(result.warnings).toContain("Return window is shorter than 30 days");
  });
});
