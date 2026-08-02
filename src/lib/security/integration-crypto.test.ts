import { describe, expect, it } from "vitest";
import { decryptIntegrationCredentials, encryptIntegrationCredentials } from "./integration-crypto";

const key = "test-only-integration-key-material-that-is-long-enough";

describe("integration credential encryption", () => {
  it("round-trips credentials without deterministic ciphertext", () => {
    const credentials = { apiKey: "sk-test-secret", model: "gpt-test" };
    const first = encryptIntegrationCredentials(credentials, key);
    const second = encryptIntegrationCredentials(credentials, key);
    expect(first).not.toBe(second);
    expect(first).not.toContain(credentials.apiKey);
    expect(decryptIntegrationCredentials(first, key)).toEqual(credentials);
  });

  it("rejects tampered ciphertext", () => {
    const encrypted = encryptIntegrationCredentials({ secretKey: "sk_test_secret" }, key);
    expect(() => decryptIntegrationCredentials(`${encrypted.slice(0, -1)}x`, key)).toThrow("INTEGRATION_CREDENTIALS_INVALID");
  });
});

