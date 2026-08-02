import { Suspense } from "react";
import { MissionControl, type MissionControlInitialData } from "@/components/mission-control";
import { PageHeader } from "@/components/page-header";
import { WorkflowStepper } from "@/components/workflow-stepper";
import { Skeleton } from "@/components/ui/skeleton";
import { getRequestContext } from "@/lib/api/route";
import { getWorkspaceSnapshot, type WorkspaceTransaction } from "@/lib/data/workspace";

function transactionResult(transaction: WorkspaceTransaction | undefined) {
  if (!transaction) return undefined;
  return {
    id: transaction.id,
    missionId: transaction.missionId,
    amountCents: transaction.amountCents,
    merchant: transaction.merchant,
    status: transaction.status,
    idempotencyReference: transaction.idempotencyReference,
    checkoutReference: transaction.checkoutReference,
    failureCode: transaction.failureCode,
    createdAt: transaction.createdAt,
  };
}

export default async function ExecuteMissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getRequestContext();
  const snapshot = await getWorkspaceSnapshot(context);
  const missionTransactions = snapshot.transactions.filter((transaction) => transaction.missionId === id);
  const succeeded = missionTransactions.find((transaction) => transaction.status === "succeeded");
  const blocked = missionTransactions.find((transaction) => transaction.status === "blocked");
  let mandateId = String(succeeded?.safeMetadata.mandateId ?? succeeded?.safeMetadata.mandate_id ?? blocked?.safeMetadata.mandateId ?? blocked?.safeMetadata.mandate_id ?? "");
  let authorizationActive = false;
  if (context.mode === "live" && context.supabase) {
    const { data: authorization } = await context.supabase.from("prava_authorizations").select("mandate_id,status").eq("mission_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    mandateId ||= authorization?.mandate_id ? String(authorization.mandate_id) : "";
    authorizationActive = String(authorization?.status ?? "") === "active";
  }
  const initial: MissionControlInitialData = {
    state: succeeded ? "completed" : blocked ? "blocked" : authorizationActive ? "authorized" : "approved",
    mandateId: mandateId || undefined,
    blockedTransaction: transactionResult(blocked),
    successTransaction: transactionResult(succeeded),
    executionMode: !mandateId || mandateId.startsWith("mandate_demo_") ? "demo" : "live",
    events: snapshot.events.filter((event) => event.missionId === id),
  };
  return <div className="page-enter"><PageHeader eyebrow={`Mission control · ${id.slice(0, 8)}`} title="Authorize, prove, and execute" description="Create a narrowly scoped mandate, show the required violation block, then complete the valid purchase." /><WorkflowStepper current={4} /><Suspense fallback={<Skeleton className="h-[520px] w-full" />}><MissionControl missionId={id} initial={initial} /></Suspense></div>;
}
