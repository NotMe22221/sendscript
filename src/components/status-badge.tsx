import { Circle, CircleCheck, CircleX, Clock3, LoaderCircle, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { MissionStatus } from "@/lib/domain/schemas";

const labels: Record<MissionStatus, string> = {
  DRAFT: "Draft", ANALYZING: "Analyzing", SOURCING: "Sourcing", POLICY_REVIEW: "Policy review",
  AWAITING_APPROVAL: "Awaiting approval", AUTHORIZED: "Authorized", PURCHASING: "Purchasing", COMPLETED: "Completed",
  BLOCKED: "Blocked", REJECTED: "Rejected", FAILED: "Failed", CANCELLED: "Cancelled", EXPIRED: "Expired",
};

export function StatusBadge({ status }: { status: MissionStatus }) {
  const success = status === "COMPLETED" || status === "AUTHORIZED";
  const danger = ["BLOCKED", "REJECTED", "FAILED", "CANCELLED", "EXPIRED"].includes(status);
  const loading = ["ANALYZING", "SOURCING", "PURCHASING"].includes(status);
  const Icon = success ? CircleCheck : danger ? (status === "BLOCKED" ? ShieldAlert : CircleX) : loading ? LoaderCircle : status === "AWAITING_APPROVAL" ? Clock3 : Circle;
  const tone = success ? "success" : danger ? "danger" : status === "AWAITING_APPROVAL" ? "warning" : loading ? "info" : "neutral";
  return <Badge tone={tone}><Icon className={loading ? "size-3 animate-spin" : "size-3"} />{labels[status]}</Badge>;
}
