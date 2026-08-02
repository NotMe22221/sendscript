import { getRequestContext, ok, routeError } from "@/lib/api/route";
import { transitionMission } from "@/lib/api/persistence";
import { demoDecision } from "@/lib/domain/demo";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getRequestContext();
    const { id } = await params;
    console.info("[mission.decide] started", { missionId: id, mode: context.mode });
    if (context.mode === "live" && context.supabase) {
      const { error } = await context.supabase.from("decisions").insert({
        organization_id: context.organizationId,
        mission_id: id,
        selected_offer_id: demoDecision.selectedOfferId,
        total_score: demoDecision.totalScore,
        score_breakdown: demoDecision.scoreBreakdown,
        explanation: demoDecision.explanation,
      });
      if (error && error.code !== "23505") throw new Error(`DATABASE_DECISION_FAILED:${error.code}`);
    }
    await transitionMission(context, id, "AWAITING_APPROVAL", "decision.created", "Best compliant offer selected", demoDecision.explanation);
    console.info("[mission.decide] completed", { missionId: id });
    return ok({ decision: demoDecision }, context.mode);
  } catch (error) {
    console.error("[mission.decide] failed", { code: error instanceof Error ? error.message.split(":")[0] : "UNKNOWN_ERROR" });
    return routeError(error);
  }
}
