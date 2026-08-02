import { describe, expect, it } from "vitest";
import { SetupRequestSchema, setupIssueMessage } from "./environment-schema";

const supabase = {
  url: "https://demo.supabase.co/",
  publishableKey: "sb_publishable_valid-shaped-test-key",
  serviceRoleKey: "eyJhbGciOiJIUzI1NiJ9.valid-shaped-service-role-key.signature",
  demoEmail: "judge@spendscript.dev",
  demoPassword: "judge-password-123",
};

const openai = {
  apiKey: "sk-proj-valid-shaped-test-key",
  model: "gpt-5.6",
};

const prava = {
  baseUrl: "https://sandbox.api.prava.space/",
  secretKey: "sk_test_valid-shaped-test-key",
  publishableKey: "pk_test_valid-shaped-test-key",
  customerId: "customer_demo_01",
};

describe("setup environment validation", () => {
  it.each([
    ["supabase", supabase],
    ["openai", openai],
    ["prava", prava],
  ] as const)("accepts valid-shaped %s connection values", (service, values) => {
    const result = SetupRequestSchema.safeParse({ action: "test", service, values });
    expect(result.success).toBe(true);
  });

  it("accepts all providers in one save request", () => {
    const result = SetupRequestSchema.safeParse({ action: "save", values: { supabase, openai, prava } });
    expect(result.success).toBe(true);
  });

  it("normalizes pasted URLs without changing credential contents", () => {
    const result = SetupRequestSchema.parse({ action: "test", service: "supabase", values: supabase });
    if (result.action !== "test" || result.service !== "supabase") throw new Error("Unexpected schema result");
    expect(result.values.url).toBe("https://demo.supabase.co");
    expect(result.values.publishableKey).toBe(supabase.publishableKey);
  });

  it("returns a safe, field-specific message without echoing a credential", () => {
    const badKey = "sk-proj-do not echo this";
    const result = SetupRequestSchema.safeParse({ action: "test", service: "openai", values: { ...openai, apiKey: badKey } });
    expect(result.success).toBe(false);
    if (result.success) return;
    const message = setupIssueMessage(result.error.issues[0]);
    expect(message).toContain("OpenAI API key");
    expect(message).not.toContain(badKey);
  });
});
