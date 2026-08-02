import { z } from "zod";
import { getRequestContext, ok, routeError } from "@/lib/api/route";
import { PolicyDocumentSchema } from "@/lib/domain/schemas";

const Schema = z.object({ name: z.string().min(3), source: z.string().min(20), version: z.number().int().positive(), parsed: z.unknown().nullable() });
export async function POST(request: Request) {
  try {
    const context = await getRequestContext(); const input = Schema.parse(await request.json());
    if (context.role !== "admin") throw new Error("ADMIN_ACCESS_REQUIRED");
      const document = PolicyDocumentSchema.parse(input.parsed);
      const numeric = (field: string, fallback: number) => Number(document.rules.find((rule) => rule.field === field)?.value ?? fallback);
      const merchantValue = document.rules.find((rule) => rule.field === "merchant")?.value;
      const compiled = {
        approvedMerchants: Array.isArray(merchantValue) ? merchantValue.map(String) : [],
        maxBudgetCents: numeric("budget", 50000),
        maxQuantity: numeric("quantity", 12),
        minSellerRating: numeric("seller_rating", 4.2),
        approvalThresholdCents: numeric("approval_threshold", 25000),
        document,
      };
      await context.supabase.from("policies").update({ status: "archived" }).eq("organization_id", context.organizationId).eq("status", "active");
      const { data, error } = await context.supabase.from("policies").insert({ organization_id: context.organizationId, name: input.name, source_text: input.source, version: input.version, parsed_rules: compiled, status: "active", created_by: context.userId }).select("id").single();
      if (error) throw new Error(`DATABASE_POLICY_SAVE_FAILED:${error.code}`);
      return ok({ policyId: data.id, version: input.version }, "live", 201);
  } catch (error) { return routeError(error); }
}
