import { z } from "zod";
import { getRequestContext, ok, routeError } from "@/lib/api/route";

const Schema = z.object({ name: z.string().min(3), source: z.string().min(20), version: z.number().int().positive(), parsed: z.unknown().nullable() });
export async function POST(request: Request) {
  try {
    const context = await getRequestContext(); const input = Schema.parse(await request.json());
    if (context.mode === "live" && context.supabase) {
      const { data, error } = await context.supabase.from("policies").insert({ organization_id: context.organizationId, name: input.name, source_text: input.source, version: input.version, parsed_rules: input.parsed ?? {}, status: "active", created_by: context.userId }).select("id").single();
      if (error) throw new Error(`DATABASE_POLICY_SAVE_FAILED:${error.code}`);
      return ok({ policyId: data.id, version: input.version }, "live", 201);
    }
    return ok({ policyId: "30000000-0000-4000-8000-000000000001", version: input.version }, "demo", 201);
  } catch (error) { return routeError(error); }
}
