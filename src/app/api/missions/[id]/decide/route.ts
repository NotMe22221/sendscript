import { getRequestContext, ok, routeError } from "@/lib/api/route";
import { transitionMission } from "@/lib/api/persistence";
import { getMissionProcurementData } from "@/lib/data/mission";
import { WeightedDecisionEngine } from "@/lib/domain/decision-engine";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getRequestContext();
    const { id } = await params;
    console.info("[mission.decide] started", { missionId: id });
    const data = await getMissionProcurementData(context, id);
    const decision = new WeightedDecisionEngine().decide(data.offers, data.evaluations, data.requirements.neededBy);
    const { error } = await context.supabase.from("decisions").upsert({
        organization_id: context.organizationId,
        mission_id: id,
        selected_offer_id: decision.selectedOfferId,
        total_score: decision.totalScore,
        score_breakdown: decision.scoreBreakdown,
        explanation: decision.explanation,
      }, { onConflict: "mission_id" });
    if (error) throw new Error(`DATABASE_DECISION_FAILED:${error.code}`);
    if (data.mission.status === "POLICY_REVIEW") await transitionMission(context, id, "AWAITING_APPROVAL", "decision.created", "Best compliant offer selected", decision.explanation);
    console.info("[mission.decide] completed", { missionId: id });
    return ok({ decision }, "live");
  } catch (error) {
    console.error("[mission.decide] failed", { code: error instanceof Error ? error.message.split(":")[0] : "UNKNOWN_ERROR" });
    return routeError(error);
  }
}
