import { z } from "zod";

function credential(prefix?: string) {
  return z
    .string()
    .trim()
    .min(8, "Enter the complete key")
    .max(1000, "This key is unexpectedly long")
    .refine((value) => !/\s/.test(value), "Keys cannot contain spaces or line breaks")
    .refine((value) => !prefix || value.startsWith(prefix), prefix ? `This key must begin with ${prefix}` : "Invalid key");
}

export const SupabaseSchema = z.object({
  url: z
    .string()
    .trim()
    .url("Enter a valid Supabase project URL")
    .refine((value) => value.startsWith("https://"), "Use an HTTPS Supabase URL")
    .transform((value) => value.replace(/\/+$/, "")),
  publishableKey: credential(),
  serviceRoleKey: credential(),
  demoEmail: z.string().trim().toLowerCase().email("Enter a valid judge email"),
  demoPassword: z.string().min(10, "Judge password must be at least 10 characters").max(200),
});

export const OpenAiSchema = z.object({
  apiKey: credential("sk-"),
  model: z.string().trim().min(2, "Enter an OpenAI model ID").max(100),
});

export const PravaSchema = z.object({
  baseUrl: z
    .string()
    .trim()
    .url("Enter a valid Prava sandbox URL")
    .transform((value) => value.replace(/\/+$/, ""))
    .refine((value) => value === "https://sandbox.api.prava.space", "Use https://sandbox.api.prava.space"),
  secretKey: credential("sk_test_"),
  publishableKey: credential("pk_test_"),
  customerId: z.string().trim().min(2, "Enter the sandbox customer ID").max(255),
});

export const SetupRequestSchema = z.union([
  z.object({ action: z.literal("test"), service: z.literal("supabase"), values: SupabaseSchema }),
  z.object({ action: z.literal("test"), service: z.literal("openai"), values: OpenAiSchema }),
  z.object({ action: z.literal("test"), service: z.literal("prava"), values: PravaSchema }),
  z.object({
    action: z.literal("save"),
    values: z.object({ supabase: SupabaseSchema, openai: OpenAiSchema, prava: PravaSchema }),
  }),
]);

const fieldLabels: Record<string, string> = {
  url: "Supabase project URL",
  publishableKey: "Publishable key",
  serviceRoleKey: "Service-role key",
  demoEmail: "Judge email",
  demoPassword: "Judge password",
  apiKey: "OpenAI API key",
  model: "OpenAI model",
  baseUrl: "Prava sandbox URL",
  secretKey: "Prava secret key",
  customerId: "Prava customer ID",
};

export function setupIssueMessage(issue: z.core.$ZodIssue) {
  const field = [...issue.path].reverse().find((part) => typeof part === "string" && part in fieldLabels);
  const label = typeof field === "string" ? fieldLabels[field] : "Setup values";
  return `${label}: ${issue.message}`;
}

export type SupabaseSetup = z.infer<typeof SupabaseSchema>;
export type OpenAiSetup = z.infer<typeof OpenAiSchema>;
export type PravaSetup = z.infer<typeof PravaSchema>;
export type SetupRequest = z.infer<typeof SetupRequestSchema>;
