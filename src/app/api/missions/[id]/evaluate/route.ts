import { getRequestContext, ok, routeError } from "@/lib/api/route";
import { transitionMission } from "@/lib/api/persistence";
import { getMissionProcurementData } from "@/lib/data/mission";
import { DeterministicPolicyEngine } from "@/lib/domain/policy-engine";
import { WeightedDecisionEngine } from "@/lib/domain/decision-engine";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getRequestContext();
    const { id } = await params;
    const data = await getMissionProcurementData(context, id);
    const engine = new DeterministicPolicyEngine();
    const evaluations = data.offers.map((offer) => engine.evaluate(offer, data.requirements, data.policy.config));
    const rows = evaluations.map((evaluation) => ({ organization_id: context.organizationId, mission_id: id, offer_id: evaluation.offerId, policy_id: data.policy.id, compliant: evaluation.compliant, requires_approval: evaluation.requiresApproval, violations: evaluation.violations, warnings: evaluation.warnings }));
    const { error } = await context.supabase.from("policy_evaluations").upsert(rows, { onConflict: "mission_id,offer_id" });
    if (error) throw new Error(`DATABASE_EVALUATION_FAILED:${error.code}`);
    const decision = new WeightedDecisionEngine().decide(data.offers, evaluations, data.requirements.neededBy);
    if (data.mission.status === "SOURCING") await transitionMission(context, id, "POLICY_REVIEW", "policy.evaluated", "Offers evaluated", `${data.offers.length} organization offers evaluated against ${data.policy.name} v${data.policy.version}.`);
    return ok({ evaluations, decision }, "live");
  } catch (error) { return routeError(error); }
}
