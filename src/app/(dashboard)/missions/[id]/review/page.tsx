import { PurchaseReview } from "@/components/purchase-review";
import { PageHeader } from "@/components/page-header";
import { WorkflowStepper } from "@/components/workflow-stepper";
import { getRequestContext, RouteError } from "@/lib/api/route";
import { getMissionProcurementData } from "@/lib/data/mission";

export default async function ReviewMissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getMissionProcurementData(await getRequestContext(), id);
  if (!data.decision) throw new RouteError("DECISION_REQUIRED", "Evaluate and select an offer before approval.", 409, true);
  const selectedOffer = data.offers.find((offer) => offer.id === data.decision?.selectedOfferId);
  if (!selectedOffer) throw new RouteError("SELECTED_OFFER_REQUIRED", "The selected offer is no longer available.", 409, true);
  return <div className="page-enter"><PageHeader eyebrow={`Manager approval · ${id.slice(0, 8)}`} title="Review purchase decision" description="Verify the selected offer and tighten the spending contract before Prava authorization." /><WorkflowStepper current={3} /><PurchaseReview missionId={id} requirements={data.requirements} decision={data.decision} selectedOffer={selectedOffer} /></div>;
}
