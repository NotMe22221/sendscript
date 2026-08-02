import { PurchaseReview } from "@/components/purchase-review";
import { PageHeader } from "@/components/page-header";
import { WorkflowStepper } from "@/components/workflow-stepper";

export default async function ReviewMissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <div className="page-enter"><PageHeader eyebrow={`Manager approval · ${id.slice(0, 8)}`} title="Review purchase decision" description="Verify the selected offer and tighten the spending contract before Prava authorization." /><WorkflowStepper current={3} /><PurchaseReview missionId={id} /></div>;
}
