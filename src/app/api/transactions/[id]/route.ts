import { getRequestContext, ok, routeError } from "@/lib/api/route";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getRequestContext(); const { id } = await params;
    const { data, error } = await context.supabase.from("transactions").select("id, mission_id, amount_cents, merchant, status, idempotency_reference, checkout_reference, failure_code, safe_prava_metadata, created_at").eq("organization_id", context.organizationId).eq("id", id).single();
    if (error) throw new Error(`TRANSACTION_NOT_FOUND:${error.code}`);
    return ok(data, "live");
  } catch (error) { return routeError(error); }
}
