import "server-only";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { config } from "@/lib/config";
import { MissionRequirementsSchema, PolicyDocumentSchema } from "@/lib/domain/schemas";
import type { OpenAiCredentials } from "@/lib/integrations/shared";

export { PolicyDocumentSchema } from "@/lib/domain/schemas";
export type { PolicyDocument } from "@/lib/domain/schemas";

const transientStatus = new Set([408, 409, 429, 500, 502, 503, 504]);

async function withRetry<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const status = typeof error === "object" && error && "status" in error ? Number(error.status) : 0;
    if (!transientStatus.has(status)) throw error;
    return operation();
  }
}

function connection(credentials?: OpenAiCredentials): OpenAiCredentials {
  if (credentials) return credentials;
  if (!config.openAiKey) throw new Error("OPENAI_NOT_CONFIGURED");
  return { apiKey: config.openAiKey, model: config.openAiModel };
}

function client(credentials: OpenAiCredentials) {
  return new OpenAI({ apiKey: credentials.apiKey, timeout: 20_000, maxRetries: 0 });
}

export async function extractMission(input: string, configured?: OpenAiCredentials) {
  const credentials = connection(configured);
  return withRetry(async () => {
    const response = await client(credentials).responses.parse({
      model: credentials.model,
      input: [
        {
          role: "system",
          content:
            "Extract a corporate procurement request. Never invent requirements. Put uncertainty in notes and lower confidence. Dates must be YYYY-MM-DD and money must be integer cents.",
        },
        { role: "user", content: input },
      ],
      text: { format: zodTextFormat(MissionRequirementsSchema, "mission_requirements") },
    });
    if (response.output_parsed) {
      const parsed = MissionRequirementsSchema.parse(response.output_parsed);
      if (parsed.confidence < 0.65) throw new Error("OPENAI_LOW_CONFIDENCE");
      return parsed;
    }
    const refusal = response.output.find((item) => item.type === "message")?.content.find((part) => part.type === "refusal");
    if (refusal && "refusal" in refusal) throw new Error("OPENAI_REFUSAL");
    throw new Error("OPENAI_MISSING_OUTPUT");
  });
}

export async function parsePolicy(input: string, configured?: OpenAiCredentials) {
  const credentials = connection(configured);
  return withRetry(async () => {
    const response = await client(credentials).responses.parse({
      model: credentials.model,
      input: [
        {
          role: "system",
          content:
            "Convert procurement policy prose into explicit rules. Preserve monetary and approval thresholds exactly. Flag ambiguity rather than guessing.",
        },
        { role: "user", content: input },
      ],
      text: { format: zodTextFormat(PolicyDocumentSchema, "policy_document") },
    });
    if (response.output_parsed) return PolicyDocumentSchema.parse(response.output_parsed);
    const refusal = response.output.find((item) => item.type === "message")?.content.find((part) => part.type === "refusal");
    if (refusal && "refusal" in refusal) throw new Error("OPENAI_REFUSAL");
    throw new Error("OPENAI_MISSING_OUTPUT");
  });
}
