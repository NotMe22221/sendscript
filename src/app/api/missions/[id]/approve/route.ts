import { z } from "zod";
import { getRequestContext, ok, routeError } from "@/lib/api/route";
import { transitionMission } from "@/lib/api/persistence";

const Schema = z.object({ amountCapCents: z.number().int().min(30800).max(35000), hours: z.number().int().min(1).max(72), cardId: z.string().min(3), note: z.string().trim().max(1000).optional() });
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getRequestContext(); const { id } = await params; const input = Schema.parse(await request.json());
    if (context.mode === "live" && context.supabase) {
      const { error } = await context.supabase.from("approvals").insert({ organization_id: context.organizationId, mission_id: id, approver_id: context.userId, status: "approved", note: input.note ?? null, amount_cap_cents: input.amountCapCents, expires_at: new Date(Date.now() + input.hours * 3_600_000).toISOString(), safe_card_id: input.cardId, decided_at: new Date().toISOString() });
      if (error) throw new Error(`DATABASE_APPROVAL_FAILED:${error.code}`);
      await transitionMission(context, id, "AUTHORIZED", "approval.approved", "Manager approval recorded", `Approved a one-charge contract capped at ${(input.amountCapCents / 100).toFixed(2)} USD.`);
    }
    return ok({ missionId: id }, context.mode);
  } catch (error) { return routeError(error); }
}
