"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, CreditCard, LoaderCircle, LockKeyhole, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ApiResponse, Decision, MissionRequirements, Offer } from "@/lib/domain/schemas";
import { formatMoney } from "@/lib/format";
import type { SafeCard } from "@/lib/providers/types";

export function PurchaseReview({ missionId, requirements, decision, selectedOffer }: {
  missionId: string;
  requirements: MissionRequirements;
  decision: Decision;
  selectedOffer: Offer;
}) {
  const router = useRouter();
  const offerTotalCents = selectedOffer.unitPriceCents * selectedOffer.quantity + selectedOffer.shippingCents;
  const [capCents, setCapCents] = useState(offerTotalCents);
  const [hours, setHours] = useState(24);
  const [cards, setCards] = useState<SafeCard[]>([]);
  const [cardId, setCardId] = useState("");
  const [cardsLoading, setCardsLoading] = useState(true);
  const [cardError, setCardError] = useState("");
  const [pending, setPending] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [approvalNote, setApprovalNote] = useState("");
  const contractValid = capCents >= offerTotalCents && capCents <= requirements.budgetCents && hours > 0 && hours <= 72 && Boolean(cardId);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/prava/cards", { signal: controller.signal }).then((response) => response.json()).then((payload: ApiResponse<SafeCard[]>) => {
      if (!payload.ok) throw new Error(payload.error.message);
      setCards(payload.data);
      setCardId(payload.data.find((card) => card.isDefault)?.id ?? payload.data[0]?.id ?? "");
      if (!payload.data.length) setCardError("No active Prava sandbox card is enrolled for this organization.");
    }).catch((error) => {
      if (error instanceof Error && error.name !== "AbortError") setCardError(error.message);
    }).finally(() => setCardsLoading(false));
    return () => controller.abort();
  }, []);

  const expiry = useMemo(() => new Date(Date.now() + hours * 3_600_000).toLocaleString(), [hours]);

  async function approve() {
    if (!contractValid) return;
    setPending(true);
    try {
      const response = await fetch(`/api/missions/${missionId}/approve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amountCapCents: capCents, hours, cardId, note: approvalNote.trim() || undefined }) });
      const payload = await response.json();
      if (!payload.ok) throw new Error(payload.error.message);
      toast.success("Manager approval recorded");
      router.push(`/missions/${missionId}/execute`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Approval failed"); setPending(false); }
  }

  async function reject() {
    if (rejectReason.trim().length < 4) return;
    setPending(true);
    try {
      const response = await fetch(`/api/missions/${missionId}/reject`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: rejectReason }) });
      const payload = await response.json();
      if (!payload.ok) throw new Error(payload.error.message);
      toast.success("Mission rejected");
      router.push("/missions");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Rejection failed"); setPending(false); }
  }

  return <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
    <div className="space-y-5">
      <Card><CardHeader><div><Badge tone="info" className="mb-2">Selected offer · {decision.totalScore}/100</Badge><CardTitle>{selectedOffer.productName}</CardTitle><p className="mt-1 text-sm text-[#667085]">{selectedOffer.quantity} units from {selectedOffer.merchant}</p></div><p className="tabular text-3xl font-semibold">{formatMoney(offerTotalCents)}</p></CardHeader><CardContent>
        <div className="rounded-lg border border-[#abefc6] bg-[#ecfdf3] p-4"><p className="flex items-center gap-2 text-sm font-semibold text-[#05603a]"><ShieldCheck className="size-5" />Passes the active organization policy</p><p className="mt-2 text-xs leading-5 text-[#067647]">{decision.explanation}</p></div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">{Object.entries(decision.scoreBreakdown).map(([key,value]) => <div key={key} className="rounded-lg bg-[#f9fafb] p-3"><p className="text-[10px] uppercase text-[#667085]">{key.replace(/([A-Z])/g," $1")}</p><p className="mt-1 font-semibold">{value}%</p></div>)}</div>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Manager decision</CardTitle></CardHeader><CardContent><Label htmlFor="note">Approval note</Label><Textarea id="note" value={approvalNote} onChange={(event) => setApprovalNote(event.target.value)} placeholder="Optional context for the requester" /><div className="mt-5 flex justify-end gap-2">
        <Dialog><DialogTrigger asChild><Button variant="secondary"><XCircle />Reject</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Reject this mission?</DialogTitle><DialogDescription>The reason becomes part of the audit trail.</DialogDescription></DialogHeader><Textarea value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} placeholder="What needs to change?" /><DialogFooter><Button variant="danger" onClick={reject} disabled={pending || rejectReason.trim().length < 4}>Reject mission</Button></DialogFooter></DialogContent></Dialog>
        <Button onClick={approve} disabled={!contractValid || pending}>{pending ? <LoaderCircle className="animate-spin" /> : <Check />}Approve & continue<ArrowRight /></Button>
      </div></CardContent></Card>
    </div>
    <Card className="self-start border-[#b2ccff]"><CardHeader><div><p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-[#3157f6]"><LockKeyhole className="size-4" />Spending contract</p><CardTitle>Authorization envelope</CardTitle></div></CardHeader><CardContent className="space-y-5">
      <div><Label htmlFor="cap">Amount cap</Label><Input id="cap" type="number" min={offerTotalCents / 100} max={requirements.budgetCents / 100} step=".01" value={capCents / 100} onChange={(event) => setCapCents(Math.round(Number(event.target.value) * 100))} /><p className="mt-1 text-xs text-[#667085]">Selected offer {formatMoney(offerTotalCents)} · budget ceiling {formatMoney(requirements.budgetCents)}</p></div>
      <div><Label htmlFor="validity">Validity</Label><select id="validity" className="h-10 w-full rounded-[10px] border px-3 text-sm" value={hours} onChange={(event) => setHours(Number(event.target.value))}><option value={8}>8 hours</option><option value={24}>24 hours</option><option value={48}>48 hours</option><option value={72}>72 hours</option></select><p className="mt-1 text-xs text-[#667085]">Expires {expiry}</p></div>
      <div><div className="mb-2 flex items-center justify-between"><Label>Payment source</Label><Badge tone="success">Prava sandbox</Badge></div>{cardsLoading ? <p className="text-sm text-[#667085]">Loading safe card metadata…</p> : cardError ? <p className="rounded-lg border border-[#fedf89] bg-[#fffaeb] p-3 text-sm text-[#93370d]">{cardError}</p> : <div className="space-y-2">{cards.map((card) => <button type="button" key={card.id} onClick={() => setCardId(card.id)} className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left ${cardId === card.id ? "border-[#3157f6] bg-[#f4f6ff]" : "border-[#e4e7ec]"}`}><CreditCard className="size-4" /><span className="flex-1 text-sm font-semibold capitalize">{card.brand} •••• {card.last4}</span>{cardId === card.id ? <Check className="size-4 text-[#3157f6]" /> : null}</button>)}</div>}</div>
      <div className="rounded-lg bg-[#f9fafb] p-4 text-sm"><div className="flex justify-between"><span className="text-[#667085]">Merchant</span><strong>{selectedOffer.merchant} only</strong></div><div className="mt-3 flex justify-between"><span className="text-[#667085]">Allowed charges</span><strong>1</strong></div></div>
    </CardContent></Card>
  </div>;
}
