import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, ExternalLink, FileCheck2, LockKeyhole, ShieldCheck } from "lucide-react";
import { ActivityTimeline } from "@/components/activity-timeline";
import { CopyTextButton } from "@/components/copy-text-button";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRequestContext } from "@/lib/api/route";
import { getWorkspaceTransaction } from "@/lib/data/workspace";
import { formatDateTime, formatMoney } from "@/lib/format";

function safeIdentifier(value: unknown) {
  if (typeof value !== "string" || !value) return "Not returned";
  return value.length <= 8 ? value : `${value.slice(0, 5)}••••${value.slice(-4)}`;
}

export default async function TransactionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const record = await getWorkspaceTransaction(await getRequestContext(), id);
  if (!record) notFound();
  const { transaction, mission, events, mode } = record;
  const succeeded = transaction.status === "succeeded";
  const metadata = transaction.safeMetadata;
  const session = metadata.sessionId ?? metadata.session_id;
  const mandate = metadata.mandateId ?? metadata.mandate_id;
  const response = metadata.responseId ?? metadata.response_id;
  const simulated = String(session ?? "").startsWith("sess_demo_") || String(mandate ?? "").startsWith("mandate_demo_");
  return <div className="page-enter"><Button asChild variant="ghost" size="sm" className="mb-4 -ml-2"><Link href="/transactions"><ArrowLeft />All transactions</Link></Button><PageHeader eyebrow={simulated ? "Simulated sandbox transaction" : mode === "live" ? "Shared transaction record" : "Seeded transaction preview"} title={succeeded ? "Purchase completed" : transaction.status === "blocked" ? "Charge blocked" : "Transaction record"} description={simulated ? "A persisted simulation produced because no enrolled Prava sandbox card was available; no live funds moved." : succeeded ? "A safe, inspectable record of the final checkout and its authorization context." : "The authorization layer stopped this attempt before an unauthorized checkout could complete."} actions={<div className="flex items-center gap-2">{simulated && <Badge tone="warning">Simulation</Badge>}<Badge tone={succeeded ? "success" : "danger"}>{succeeded ? <Check className="size-3" /> : <ShieldCheck className="size-3" />}{transaction.status}</Badge></div>} />
    <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
      <div className="space-y-5"><Card><CardHeader><CardTitle>Transaction summary</CardTitle><CopyTextButton value={transaction.checkoutReference ?? transaction.idempotencyReference} /></CardHeader><CardContent><div className="grid gap-5 sm:grid-cols-2"><div><p className="text-xs font-medium text-[#667085]">Amount</p><p className="tabular mt-1 text-3xl font-semibold tracking-[-.04em]">{formatMoney(transaction.amountCents)}</p></div><div><p className="text-xs font-medium text-[#667085]">Merchant</p><p className="mt-1 text-lg font-semibold">{transaction.merchant}</p></div>{[["Created",formatDateTime(transaction.createdAt)],["Checkout reference",transaction.checkoutReference ?? "Not created"],["Failure code",transaction.failureCode ?? "None"],["Idempotency reference",transaction.idempotencyReference]].map(([label,value]) => <div key={label} className="border-t border-[#eaecf0] pt-4"><p className="text-xs text-[#667085]">{label}</p><p className="tabular mt-1 break-all text-sm font-medium">{value}</p></div>)}</div></CardContent></Card>
      <Card><CardHeader><CardTitle>Immutable activity</CardTitle></CardHeader><CardContent>{events.length ? <ActivityTimeline events={events} /> : <p className="py-4 text-sm text-[#667085]">No activity events are attached to this transaction yet.</p>}</CardContent></Card></div>
      <div className="space-y-5"><Card><CardHeader><div><p className="mb-1 text-xs font-semibold uppercase tracking-[.06em] text-[#155eef]">Prava authorization</p><CardTitle>Safe metadata only</CardTitle></div><LockKeyhole className="size-5 text-[#155eef]" /></CardHeader><CardContent><div className="space-y-3 text-sm">{[["Session",safeIdentifier(session)],["Mandate",safeIdentifier(mandate)],["Response",safeIdentifier(response)],["Status",String(metadata.status ?? transaction.status)]].map(([label,value]) => <div key={label} className="flex justify-between gap-3"><span className="text-[#667085]">{label}</span><strong className="font-mono text-xs">{value}</strong></div>)}</div><div className="mt-5 rounded-lg bg-[#f2f4f7] p-3 text-xs leading-5 text-[#667085]"><ShieldCheck className="mb-2 size-4 text-[#155eef]" />No PAN, CVV, API key, session token, or payment credential is stored or rendered.</div></CardContent></Card>{mission && <Card><CardHeader><CardTitle>Related mission</CardTitle></CardHeader><CardContent><div className="flex gap-3"><span className="grid size-10 place-items-center rounded-lg bg-[#eff4ff] text-[#155eef]"><FileCheck2 className="size-5" /></span><div><p className="text-sm font-semibold">{mission.title}</p><p className="mt-1 font-mono text-xs text-[#667085]">{mission.reference} · {mission.owner}</p></div></div><Button asChild variant="secondary" className="mt-4 w-full"><Link href={`/missions/${mission.id}/execute`}>Open mission control<ExternalLink /></Link></Button></CardContent></Card>}</div>
    </div></div>;
}
