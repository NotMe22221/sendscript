import { z } from "zod";
import { getRequestContext, ok, routeError, RouteError } from "@/lib/api/route";
import { appendActivityEvent, persistTransaction } from "@/lib/api/persistence";
import type { TransactionResult } from "@/lib/domain/schemas";
import { getPravaProvider } from "@/lib/providers/prava";

const Schema = z.object({ missionId: z.string(), merchant: z.string(), amountCents: z.number().int().positive(), reference: z.string().min(8).max(255) });
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getRequestContext(); const { id } = await params; const input = Schema.parse(await request.json());
    {
      const { data: authorization, error } = await context.supabase.from("prava_authorizations").select("mission_id,merchant,amount_cap_cents,status,expires_at").eq("mandate_id", id).eq("mission_id", input.missionId).maybeSingle();
      if (error || !authorization) throw new RouteError("MANDATE_ACCESS_REQUIRED", "This mandate does not belong to the mission.", 403, false);
      if (String(authorization.status) !== "active") throw new RouteError("MANDATE_NOT_ACTIVE", "Complete Prava hosted approval before testing the mandate.", 409, true);
      if (String(authorization.merchant) !== input.merchant) throw new RouteError("MERCHANT_MISMATCH", "A merchant change requires a new authorization.", 409, false);
      if (input.amountCents <= Number(authorization.amount_cap_cents)) {
        throw new RouteError("INVALID_VIOLATION_PROOF", "The guardrail proof must exceed the approved authorization cap.", 400, false);
      }
      if (new Date(String(authorization.expires_at)).getTime() <= Date.now()) throw new RouteError("MANDATE_EXPIRED", "This mandate has expired.", 409, false);
      const { data: existing } = await context.supabase.from("transactions").select("id").eq("idempotency_reference", input.reference).maybeSingle();
      if (existing) throw new RouteError("DUPLICATE_EXECUTION", "This violation proof has already been recorded.", 409, false);
    }
    const resolved = await getPravaProvider(context.organizationId);
    const charge = await resolved.provider.chargeMandate(id, input.amountCents, input.reference);
    const blocked = charge.safeMetadata.status === "failed";
    const result: TransactionResult = { id: crypto.randomUUID(), missionId: input.missionId, amountCents: input.amountCents, merchant: input.merchant, status: blocked ? "blocked" : "pending", idempotencyReference: input.reference, failureCode: charge.safeMetadata.failureCode, createdAt: new Date().toISOString() };
    await persistTransaction(context, result, charge.safeMetadata);
    if (blocked) await appendActivityEvent(context, input.missionId, "transaction.blocked", "Out-of-policy charge blocked", `${(input.amountCents / 100).toFixed(2)} USD exceeded the approved mandate cap. No checkout ran and no funds moved.`, "Prava sandbox");
    return ok(result, "live");
  } catch (error) { return routeError(error); }
}
