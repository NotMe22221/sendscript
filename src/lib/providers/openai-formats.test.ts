import { describe, expect, it } from "vitest";
import { zodTextFormat } from "openai/helpers/zod";
import { MissionRequirementsSchema, PolicyDocumentSchema } from "@/lib/domain/schemas";

describe("OpenAI structured-output formats", () => {
  it.each([
    ["mission_requirements", MissionRequirementsSchema],
    ["policy_document", PolicyDocumentSchema],
  ] as const)("converts %s to an object JSON schema", (name, schema) => {
    const format = zodTextFormat(schema, name);
    expect(format.schema).toMatchObject({ type: "object", additionalProperties: false });
  });
});
