import { getRequestContext, ok, routeError } from "@/lib/api/route";
import { transitionMission } from "@/lib/api/persistence";
import { MissionRequirementsSchema } from "@/lib/domain/schemas";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getRequestContext();
    const { id } = await params;
    const requirements = MissionRequirementsSchema.parse(await request.json());
    if (context.mode === "live" && context.supabase) {
      const { error } = await context.supabase.from("mission_requirements").upsert({ mission_id: id, organization_id: context.organizationId, requirements, confirmed_at: new Date().toISOString() });
      if (error) throw new Error(`DATABASE_REQUIREMENTS_FAILED:${error.code}`);
      await transitionMission(context, id, "SOURCING", "requirements.confirmed", "Requirements confirmed", `${requirements.quantity} units with a ${(requirements.budgetCents / 100).toFixed(2)} USD budget.`);
    }
    return ok({ missionId: id }, context.mode);
  } catch (error) { return routeError(error); }
}
