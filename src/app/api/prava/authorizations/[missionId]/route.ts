import { getRequestContext, ok, routeError, RouteError } from "@/lib/api/route";
import { getPravaProvider } from "@/lib/providers/prava";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(_: Request, { params }: { params: Promise<{ missionId: string }> }) {
  try {
    const context = await getRequestContext();
    const { missionId } = await params;
    const resolvedProvider = await getPravaProvider(context.organizationId);
    const provider = resolvedProvider.provider;
    if (context.mode === "demo" || !context.supabase) {
      return ok(await provider.resolveActiveMandate("Merchant A", 30800), "demo");
    }
    const { data: authorization, error } = await context.supabase
      .from("prava_authorizations")
      .select("id, session_id, mandate_id, merchant, amount_cap_cents, status, created_at")
      .eq("mission_id", missionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !authorization) throw new RouteError("AUTHORIZATION_NOT_FOUND", "No persisted Prava session was found for this mission.", 404, true);
    if (authorization.mandate_id) return ok(await provider.getMandate(String(authorization.mandate_id)), resolvedProvider.live ? "live" : "demo");

    const resolved = await provider.resolveActiveMandate(String(authorization.merchant), Number(authorization.amount_cap_cents), String(authorization.created_at));
    const { error: updateError } = await createAdminClient()
      .from("prava_authorizations")
      .update({ mandate_id: resolved.mandateId, status: resolved.status, response_id: resolved.responseId, updated_at: new Date().toISOString() })
      .eq("id", authorization.id);
    if (updateError) throw new Error(`DATABASE_AUTHORIZATION_RESUME_FAILED:${updateError.code}`);
    return ok(resolved, resolvedProvider.live ? "live" : "demo");
  } catch (error) { return routeError(error); }
}
