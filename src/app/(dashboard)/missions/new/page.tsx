import { PageHeader } from "@/components/page-header";
import { MissionCreateForm } from "@/components/mission-create-form";
import { WorkflowStepper } from "@/components/workflow-stepper";

export default function NewMissionPage() {
  return <div className="page-enter"><PageHeader eyebrow="New mission" title="Create a purchasing mission" description="Start with the business outcome. You will verify every constraint before sourcing begins." /><WorkflowStepper current={0} /><MissionCreateForm /></div>;
}
