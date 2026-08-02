import { OfferSourcing } from "@/components/offer-sourcing";
import { PageHeader } from "@/components/page-header";
import { WorkflowStepper } from "@/components/workflow-stepper";
import { getRequestContext } from "@/lib/api/route";

const evaluatedStatuses = new Set(["POLICY_REVIEW", "AWAITING_APPROVAL", "AUTHORIZED", "PURCHASING", "COMPLETED", "BLOCKED"]);

export default async function SourceMissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getRequestContext();
  let initialEvaluated = false;
  if (context.mode === "live" && context.supabase) {
    const { data: mission } = await context.supabase.from("missions").select("status").eq("id", id).maybeSingle();
    initialEvaluated = evaluatedStatuses.has(String(mission?.status ?? ""));
  }
  return <div className="page-enter"><PageHeader eyebrow={`Mission ${id.slice(0, 8)}`} title="Source compliant offers" description="The controlled catalog is evaluated against policy before deterministic ranking begins." /><WorkflowStepper current={2} /><OfferSourcing missionId={id} initialEvaluated={initialEvaluated} /></div>;
}
