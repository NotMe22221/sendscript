import { Suspense } from "react";
import { MissionControl, type MissionControlInitialData } from "@/components/mission-control";
import { PageHeader } from "@/components/page-header";
import { WorkflowStepper } from "@/components/workflow-stepper";
import { Skeleton } from "@/components/ui/skeleton";
import { getRequestContext } from "@/lib/api/route";
import { getWorkspaceSnapshot, type WorkspaceTransaction } from "@/lib/data/workspace";
import { getMissionProcurementData } from "@/lib/data/mission";
import { RouteError } from "@/lib/api/route";

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
  const [snapshot, procurement] = await Promise.all([getWorkspaceSnapshot(context), getMissionProcurementData(context, id)]);
  const missionTransactions = snapshot.transactions.filter((transaction) => transaction.missionId === id);
  const succeeded = missionTransactions.find((transaction) => transaction.status === "succeeded");
  const blocked = missionTransactions.find((transaction) => transaction.status === "blocked");
  let mandateId = String(succeeded?.safeMetadata.mandateId ?? succeeded?.safeMetadata.mandate_id ?? blocked?.safeMetadata.mandateId ?? blocked?.safeMetadata.mandate_id ?? "");
  let authorizationActive = false;
  const [{ data: authorization }, { data: approval }] = await Promise.all([
    context.supabase.from("prava_authorizations").select("mandate_id,status").eq("mission_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    context.supabase.from("approvals").select("amount_cap_cents,safe_card_id,status").eq("mission_id", id).eq("status", "approved").order("decided_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
    mandateId ||= authorization?.mandate_id ? String(authorization.mandate_id) : "";
    authorizationActive = String(authorization?.status ?? "") === "active";
  if (!procurement.decision || !approval) throw new RouteError("APPROVED_CONTRACT_REQUIRED", "Approve the selected offer before execution.", 409, true);
  const selectedOffer = procurement.offers.find((offer) => offer.id === procurement.decision?.selectedOfferId);
  if (!selectedOffer) throw new RouteError("SELECTED_OFFER_REQUIRED", "The selected offer is unavailable.", 409, true);
  const amountCents = selectedOffer.unitPriceCents * selectedOffer.quantity + selectedOffer.shippingCents;
  const initial: MissionControlInitialData = {
    state: succeeded ? "completed" : blocked ? "blocked" : authorizationActive ? "authorized" : "approved",
    mandateId: mandateId || undefined,
    blockedTransaction: transactionResult(blocked),
    successTransaction: transactionResult(succeeded),
    merchant: selectedOffer.merchant,
    amountCents,
    amountCapCents: Number(approval.amount_cap_cents),
    itemDescription: `${selectedOffer.quantity} × ${selectedOffer.productName}`,
    cardLabel: `Prava card ${String(approval.safe_card_id).slice(-4).padStart(4, "•")}`,
    events: snapshot.events.filter((event) => event.missionId === id),
  };
  return <div className="page-enter"><PageHeader eyebrow={`Mission control · ${id.slice(0, 8)}`} title="Authorize, prove, and execute" description="Create a narrowly scoped mandate, show the required violation block, then complete the valid purchase." /><WorkflowStepper current={4} /><Suspense fallback={<Skeleton className="h-[520px] w-full" />}><MissionControl missionId={id} initial={initial} /></Suspense></div>;
}
