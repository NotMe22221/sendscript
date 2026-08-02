import { z } from "zod";
import { getRequestContext, ok, routeError, RouteError } from "@/lib/api/route";
import { persistTransaction, transitionMission } from "@/lib/api/persistence";
import { ControlledMerchantCheckout } from "@/lib/providers/checkout";
import { getPravaProvider } from "@/lib/providers/prava";

const Schema = z.object({ mandateId: z.string().min(3), merchant: z.string().min(2), amountCents: z.number().int().positive(), reference: z.string().min(8).max(255) });

export async function POST(request: Request, { params }: { params: Promise<{ missionId: string }> }) {
  try {
    const context = await getRequestContext(); const { missionId } = await params; const input = Schema.parse(await request.json());
    {
      const { data: authorization, error: authorizationError } = await context.supabase.from("prava_authorizations").select("merchant,amount_cap_cents,allowed_charges,status,expires_at").eq("mission_id", missionId).eq("mandate_id", input.mandateId).maybeSingle();
      if (authorizationError || !authorization) throw new RouteError("MANDATE_ACCESS_REQUIRED", "This mandate does not belong to the mission.", 403, false);
      if (String(authorization.status) !== "active") throw new RouteError("MANDATE_NOT_ACTIVE", "Complete Prava hosted approval before checkout.", 409, true);
      if (String(authorization.merchant) !== input.merchant) throw new RouteError("MERCHANT_MISMATCH", "A merchant change requires a new authorization.", 409, false);
      if (input.amountCents > Number(authorization.amount_cap_cents)) throw new RouteError("AMOUNT_MISMATCH", "Checkout exceeds the approved amount cap.", 409, false);
      if (new Date(String(authorization.expires_at)).getTime() <= Date.now()) throw new RouteError("MANDATE_EXPIRED", "This mandate has expired.", 409, false);
      const { data: decision } = await context.supabase.from("decisions").select("selected_offer_id").eq("mission_id", missionId).maybeSingle();
      const [{ data: offer }, { data: requirementRow }] = decision ? await Promise.all([
        context.supabase.from("offers").select("merchant,unit_price_cents,shipping_cents").eq("id", decision.selected_offer_id).maybeSingle(),
        context.supabase.from("mission_requirements").select("requirements").eq("mission_id", missionId).maybeSingle(),
      ]) : [{ data: null }, { data: null }];
      const quantity = Number((requirementRow?.requirements as { quantity?: number } | null)?.quantity ?? 0);
      const expectedTotal = offer ? Number(offer.unit_price_cents) * quantity + Number(offer.shipping_cents) : 0;
      if (!offer || String(offer.merchant) !== input.merchant || expectedTotal !== input.amountCents) throw new RouteError("OFFER_CHANGED", "The selected offer changed after approval and requires a new decision.", 409, false);
      const { count: successfulCharges } = await context.supabase.from("transactions").select("id", { count: "exact", head: true }).eq("mission_id", missionId).eq("status", "succeeded");
      if ((successfulCharges ?? 0) >= Number(authorization.allowed_charges)) throw new RouteError("CHARGE_COUNT_EXCEEDED", "The authorization has no charges remaining.", 409, false);
      const { data: existing } = await context.supabase.from("transactions").select("*").eq("idempotency_reference", input.reference).maybeSingle();
      if (existing) throw new RouteError("DUPLICATE_EXECUTION", "This checkout reference has already been executed.", 409, false);
      await transitionMission(context, missionId, "PURCHASING", "checkout.started", "Checkout started", "Authorized mission locked for execution.");
    }

    const resolvedProvider = await getPravaProvider(context.organizationId);
    const provider = resolvedProvider.provider;
    const charge = await provider.chargeMandate(input.mandateId, input.amountCents, input.reference);
    if (charge.safeMetadata.status === "failed" || !charge.credential) {
      throw new RouteError(charge.safeMetadata.failureCode ?? "PRAVA_CREDENTIAL_MISSING", "Prava did not issue a scoped checkout credential.", 422, true);
    }

    // The credential remains in this server request and is passed directly to the checkout adapter.
    const result = await new ControlledMerchantCheckout().complete({ missionId, merchant: input.merchant, amountCents: input.amountCents, credential: charge.credential, idempotencyReference: input.reference });
    await persistTransaction(context, result, charge.safeMetadata);
    if (charge.safeMetadata.responseId) await provider.reportMandateCharge(input.mandateId, charge.safeMetadata.responseId, true, input.amountCents);
    await transitionMission(context, missionId, "COMPLETED", "transaction.succeeded", "Purchase completed", `${(input.amountCents / 100).toFixed(2)} USD captured by ${input.merchant}.`);
    return ok(result, "live", 201);
  } catch (error) { return routeError(error); }
}
