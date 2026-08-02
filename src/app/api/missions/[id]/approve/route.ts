import { z } from "zod";
import { getRequestContext, ok, routeError, RouteError } from "@/lib/api/route";
import { transitionMission } from "@/lib/api/persistence";
import { MissionRequirementsSchema } from "@/lib/domain/schemas";

const Schema = z.object({ amountCapCents: z.number().int().positive(), hours: z.number().int().min(1).max(72), cardId: z.string().min(3), note: z.string().trim().max(1000).optional() });
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getRequestContext(); const { id } = await params; const input = Schema.parse(await request.json());
    if (!["admin", "manager"].includes(context.role)) throw new RouteError("MANAGER_ACCESS_REQUIRED", "Only an organization manager can approve spending.", 403, false);
    const [{ data: decision }, { data: requirementsRow }] = await Promise.all([
      context.supabase.from("decisions").select("selected_offer_id").eq("mission_id", id).maybeSingle(),
      context.supabase.from("mission_requirements").select("requirements").eq("mission_id", id).maybeSingle(),
    ]);
    if (!decision || !requirementsRow) throw new RouteError("DECISION_REQUIRED", "A persisted decision is required before approval.", 409, true);
    const { data: offer } = await context.supabase.from("offers").select("unit_price_cents,quantity,shipping_cents").eq("id", decision.selected_offer_id).maybeSingle();
    if (!offer) throw new RouteError("SELECTED_OFFER_REQUIRED", "The selected offer is no longer available.", 409, true);
    const requirements = MissionRequirementsSchema.parse(requirementsRow.requirements);
    const offerTotal = Number(offer.unit_price_cents) * requirements.quantity + Number(offer.shipping_cents);
    if (input.amountCapCents < offerTotal || input.amountCapCents > requirements.budgetCents) throw new RouteError("INVALID_APPROVAL_CAP", "The cap must cover the selected offer without exceeding the mission budget.", 400, false);
    const { error } = await context.supabase.from("approvals").insert({ organization_id: context.organizationId, mission_id: id, approver_id: context.userId, status: "approved", note: input.note ?? null, amount_cap_cents: input.amountCapCents, expires_at: new Date(Date.now() + input.hours * 3_600_000).toISOString(), safe_card_id: input.cardId, decided_at: new Date().toISOString() });
    if (error) throw new Error(`DATABASE_APPROVAL_FAILED:${error.code}`);
    await transitionMission(context, id, "AUTHORIZED", "approval.approved", "Manager approval recorded", `Approved a one-charge contract capped at ${(input.amountCapCents / 100).toFixed(2)} USD.`);
    return ok({ missionId: id }, "live");
  } catch (error) { return routeError(error); }
}
