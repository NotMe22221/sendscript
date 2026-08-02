import { describe, expect, it } from "vitest";
import { redactPaymentData } from "./redaction";

describe("payment redaction", () => {
  it("removes credentials recursively while retaining safe response metadata", () => {
    const input = { transactionId: "txn_123", status: "authorized", credentials: { pan: "4242424242424242", cvv: "123", token: "secret" }, nested: [{ dynamic_cvv: "999", last4: "4242" }] };
    const output = redactPaymentData(input) as Record<string, unknown>;
    expect(JSON.stringify(output)).not.toContain("4242424242424242");
    expect(JSON.stringify(output)).not.toContain("999");
    expect(output.transactionId).toBe("txn_123");
    expect(JSON.stringify(output)).toContain("4242");
  });
});
