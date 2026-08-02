import { getRequestContext, ok, routeError } from "@/lib/api/route";
import { transitionMission } from "@/lib/api/persistence";
import { demoDecision, demoEvaluations, demoOffers } from "@/lib/domain/demo";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getRequestContext();
    const { id } = await params;
    if (context.mode === "live" && context.supabase) {
      const rows = demoEvaluations.map((evaluation) => ({ organization_id: context.organizationId, mission_id: id, offer_id: evaluation.offerId, compliant: evaluation.compliant, requires_approval: evaluation.requiresApproval, violations: evaluation.violations, warnings: evaluation.warnings }));
      const { error } = await context.supabase.from("policy_evaluations").upsert(rows, { onConflict: "mission_id,offer_id" });
      if (error) throw new Error(`DATABASE_EVALUATION_FAILED:${error.code}`);
      await transitionMission(context, id, "POLICY_REVIEW", "policy.evaluated", "Offers evaluated", `${demoOffers.length} controlled offers evaluated with deterministic rules.`);
    }
    return ok({ evaluations: demoEvaluations, decision: demoDecision }, context.mode);
  } catch (error) { return routeError(error); }
}
