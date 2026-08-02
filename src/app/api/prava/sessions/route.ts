import { getRequestContext, ok, routeError, RouteError } from "@/lib/api/route";
import { appendActivityEvent } from "@/lib/api/persistence";
import { AuthorizationContractSchema } from "@/lib/domain/schemas";
import { getPravaProvider } from "@/lib/providers/prava";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const context = await getRequestContext();
    const requestedContract = AuthorizationContractSchema.parse(await request.json());
    console.info("[prava.sessions] started", { missionId: requestedContract.missionId, mode: context.mode });
    let contract = requestedContract;
    if (context.mode === "live" && context.supabase) {
      const [{ data: approval, error: approvalError }, { data: decision, error: decisionError }, { data: mission, error: missionError }] = await Promise.all([
        context.supabase.from("approvals").select("amount_cap_cents,safe_card_id,expires_at,status").eq("mission_id", requestedContract.missionId).eq("status", "approved").order("decided_at", { ascending: false }).limit(1).maybeSingle(),
        context.supabase.from("decisions").select("selected_offer_id").eq("mission_id", requestedContract.missionId).maybeSingle(),
        context.supabase.from("missions").select("title,status").eq("id", requestedContract.missionId).maybeSingle(),
      ]);
      if (approvalError || !approval || decisionError || !decision || missionError || !mission) throw new RouteError("APPROVED_CONTRACT_REQUIRED", "A persisted approval and decision are required before authorization.", 409, false);
      if (!approval.amount_cap_cents || !approval.safe_card_id || !approval.expires_at) throw new RouteError("APPROVED_CONTRACT_INCOMPLETE", "The approved spending contract is incomplete.", 409, false);
      if (new Date(String(approval.expires_at)).getTime() <= Date.now()) throw new RouteError("APPROVAL_EXPIRED", "The manager approval has expired.", 409, true);
      const { data: offer, error: offerError } = await context.supabase.from("offers").select("merchant,product_name,quantity").eq("id", decision.selected_offer_id).maybeSingle();
      if (offerError || !offer) throw new RouteError("SELECTED_OFFER_REQUIRED", "The selected controlled-catalog offer is unavailable.", 409, true);
      const { data: existing } = await context.supabase.from("prava_authorizations").select("id").eq("mission_id", requestedContract.missionId).in("status", ["pending", "active"]).gt("expires_at", new Date().toISOString()).limit(1).maybeSingle();
      if (existing) throw new RouteError("AUTHORIZATION_ALREADY_EXISTS", "This mission already has a current authorization session.", 409, false);
      contract = {
        missionId: requestedContract.missionId,
        merchant: String(offer.merchant),
        cardId: String(approval.safe_card_id),
        amountCapCents: Number(approval.amount_cap_cents),
        allowedCharges: 1,
        expiresAt: String(approval.expires_at),
        itemDescription: `${Number(offer.quantity)} × ${String(offer.product_name)}`,
      };
    }
    const resolved = await getPravaProvider(context.organizationId);
    const result = await resolved.provider.createMandateSession(contract);
    if (context.mode === "live") {
      const { error } = await createAdminClient().from("prava_authorizations").insert({ organization_id: context.organizationId, mission_id: contract.missionId, session_id: result.sessionId, mandate_id: result.mandateId, status: result.status, merchant: contract.merchant, amount_cap_cents: contract.amountCapCents, allowed_charges: contract.allowedCharges, expires_at: contract.expiresAt, safe_card_id: contract.cardId });
      if (error) throw new Error(`DATABASE_AUTHORIZATION_FAILED:${error.code}`);
      await appendActivityEvent(context, contract.missionId, "authorization.active", "Mandate activated", `One charge at ${contract.merchant}, capped at ${(contract.amountCapCents / 100).toFixed(2)} USD for 24 hours.`, resolved.live ? "Prava sandbox" : "Prava simulation");
    }
    console.info("[prava.sessions] completed", { missionId: contract.missionId, providerMode: resolved.live ? "live" : "demo" });
    return ok(result, resolved.live && context.mode === "live" ? "live" : "demo", 201);
  } catch (error) {
    console.error("[prava.sessions] failed", { code: error instanceof Error ? error.message.split(":")[0] : "UNKNOWN_ERROR" });
    return routeError(error);
  }
}
