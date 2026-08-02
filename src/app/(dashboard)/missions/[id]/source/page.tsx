import { OfferSourcing } from "@/components/offer-sourcing";
import { PageHeader } from "@/components/page-header";
import { WorkflowStepper } from "@/components/workflow-stepper";
import { getRequestContext } from "@/lib/api/route";
import { getMissionProcurementData } from "@/lib/data/mission";

const evaluatedStatuses = new Set(["POLICY_REVIEW", "AWAITING_APPROVAL", "AUTHORIZED", "PURCHASING", "COMPLETED", "BLOCKED"]);

export default async function SourceMissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getRequestContext();
  const data = await getMissionProcurementData(context, id);
  const initialEvaluated = evaluatedStatuses.has(data.mission.status);
  return <div className="page-enter"><PageHeader eyebrow={`Mission ${id.slice(0, 8)}`} title="Source compliant offers" description="Your organization catalog is evaluated against policy before deterministic ranking begins." /><WorkflowStepper current={2} /><OfferSourcing missionId={id} requirements={data.requirements} initialOffers={data.offers} initialEvaluations={initialEvaluated ? data.evaluations : []} initialDecision={data.decision} /></div>;
}
