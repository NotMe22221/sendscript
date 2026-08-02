"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, Check, CheckCircle2, Clock3, CreditCard, LoaderCircle, LockKeyhole, Pencil, Save, ShieldCheck, Star, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { demoDecision, selectedOffer } from "@/lib/domain/demo";
import type { ApiResponse } from "@/lib/domain/schemas";
import { formatMoney } from "@/lib/format";
import type { SafeCard } from "@/lib/providers/types";

export function PurchaseReview({ missionId }: { missionId: string }) {
  const router = useRouter();
  const [cap, setCap] = useState(308);
  const [hours, setHours] = useState(24);
  const [cards, setCards] = useState<SafeCard[]>([]);
  const [cardId, setCardId] = useState("");
  const [cardMode, setCardMode] = useState<"live" | "demo">("demo");
  const [cardsLoading, setCardsLoading] = useState(true);
  const [cardError, setCardError] = useState("");
  const [pending, setPending] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [approvalNote, setApprovalNote] = useState("");
  const [editingContract, setEditingContract] = useState(false);
  const minTotal = 308;
  const contractValid = cap >= minTotal && cap <= 350 && hours > 0 && hours <= 72 && Boolean(cardId);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/prava/cards").then((response) => response.json()).then((payload: ApiResponse<SafeCard[]>) => {
      if (cancelled) return;
      if (!payload.ok) {
        setCardError(payload.error.message);
        toast.error("Could not load safe card metadata");
        return;
      }
      setCards(payload.data);
      setCardMode(payload.mode);
      setCardId(payload.data.find((card) => card.isDefault)?.id ?? payload.data[0]?.id ?? "");
      if (payload.data.length === 0) setCardError("No active Prava sandbox cards were found.");
    }).catch(() => {
      if (!cancelled) {
        setCardError("The payment source could not be loaded.");
        toast.error("Could not load safe card metadata");
      }
    }).finally(() => { if (!cancelled) setCardsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const expiry = useMemo(() => new Date(Date.now() + hours * 3_600_000).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }), [hours]);

  async function approve() {
    if (!contractValid) return;
    setPending(true);
    try {
      const response = await fetch(`/api/missions/${missionId}/approve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amountCapCents: Math.round(cap * 100), hours, cardId, note: approvalNote.trim() || undefined }) });
      const payload = (await response.json()) as ApiResponse<{ missionId: string }>;
      if (!payload.ok) throw new Error(payload.error.message);
      toast.success("Manager approval recorded");
      router.push(`/missions/${payload.data.missionId}/execute`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Approval failed"); setPending(false); }
  }

  async function reject() {
    if (rejectReason.trim().length < 4) return;
    setPending(true);
    const response = await fetch(`/api/missions/${missionId}/reject`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: rejectReason }) });
    const payload = await response.json();
    setPending(false);
    if (!payload.ok) return toast.error(payload.error.message);
    toast.success("Mission rejected and owner notified");
    router.push("/missions");
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
      <div className="space-y-5">
        <Card className="overflow-hidden">
          <CardHeader><div><Badge tone="info" className="mb-2">Selected offer · {demoDecision.totalScore}/100</Badge><CardTitle>{selectedOffer.productName}</CardTitle><p className="mt-1 text-sm text-[#667085]">8 units from an approved controlled-catalog merchant</p></div><p className="tabular text-[28px] font-semibold tracking-[-.04em]">$308.00</p></CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-4">{[[Building2,"Merchant",selectedOffer.merchant],[Clock3,"Delivery","Aug 12"],[Star,"Seller",`${selectedOffer.sellerRating} / 5`],[ShieldCheck,"Returns",`${selectedOffer.returnDays} days`]].map(([Icon,label,value]) => { const I = Icon as typeof Building2; return <div key={String(label)} className="rounded-lg bg-[#f9fafb] p-3"><I className="mb-2 size-4 text-[#667085]" /><p className="text-[10px] font-semibold uppercase tracking-[.05em] text-[#98a2b3]">{String(label)}</p><p className="mt-1 text-sm font-medium">{String(value)}</p></div>; })}</div>
            <div className="mt-5 rounded-lg border border-[#abefc6] bg-[#ecfdf3] p-4"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[#067647]" /><div><p className="text-sm font-semibold text-[#05603a]">Passes Hardware Procurement Policy v3</p><p className="mt-1 text-xs leading-5 text-[#067647]">Approved category and merchant · within $350 mission budget · delivery 6 days early · seller rating above 4.2.</p></div></div></div>
            <div className="mt-5"><p className="mb-3 text-xs font-semibold uppercase tracking-[.05em] text-[#667085]">Why this won</p><div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">{Object.entries(demoDecision.scoreBreakdown).map(([key,value]) => <div key={key}><div className="mb-1 flex items-center justify-between text-[11px]"><span className="capitalize text-[#667085]">{key.replace(/([A-Z])/g," $1")}</span><span className="tabular font-semibold">{value}</span></div><div className="h-1.5 rounded-full bg-[#eaecf0]"><div className="h-full rounded-full bg-[#155eef]" style={{ width: `${value}%` }} /></div></div>)}</div></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><div><CardTitle>Manager decision</CardTitle><p className="mt-1 text-xs text-[#667085]">Your name and any edits become part of the immutable audit trail.</p></div></CardHeader>
          <CardContent><Label htmlFor="note">Approval note <span className="font-normal text-[#98a2b3]">(optional)</span></Label><Textarea id="note" className="min-h-20" value={approvalNote} onChange={(event) => setApprovalNote(event.target.value)} placeholder="Add context for the requester or finance team…" /><div className="mt-5 flex flex-wrap justify-end gap-2">
            <Dialog><DialogTrigger asChild><Button variant="secondary"><XCircle />Reject</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Reject this mission?</DialogTitle><DialogDescription>The mission will move to Rejected and Maya will need to create or revise the request.</DialogDescription></DialogHeader><Label htmlFor="reject">Reason for rejection</Label><Textarea id="reject" value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} placeholder="Explain what needs to change…" /><DialogFooter><Button variant="danger" onClick={reject} disabled={pending || rejectReason.trim().length < 4}>{pending && <LoaderCircle className="animate-spin" />}Reject mission</Button></DialogFooter></DialogContent></Dialog>
            <Dialog><DialogTrigger asChild><Button disabled={!contractValid}><Check />Approve & continue<ArrowRight /></Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Approve this spending contract?</DialogTitle><DialogDescription>You are approving one purchase from {selectedOffer.merchant} up to {formatMoney(Math.round(cap * 100))}. Prava authorization happens separately on the next screen.</DialogDescription></DialogHeader><div className="rounded-lg bg-[#f9fafb] p-4 text-sm"><div className="flex justify-between py-1"><span className="text-[#667085]">Merchant</span><strong>{selectedOffer.merchant}</strong></div><div className="flex justify-between py-1"><span className="text-[#667085]">Maximum</span><strong>{formatMoney(Math.round(cap * 100))}</strong></div><div className="flex justify-between py-1"><span className="text-[#667085]">Charges</span><strong>1</strong></div><div className="flex justify-between py-1"><span className="text-[#667085]">Expires</span><strong>{expiry}</strong></div></div><DialogFooter><Button onClick={approve} disabled={pending}>{pending ? <LoaderCircle className="animate-spin" /> : <Check />}Record approval</Button></DialogFooter></DialogContent></Dialog>
          </div></CardContent>
        </Card>
      </div>

      <Card className="self-start border-[#b2ccff]">
        <CardHeader><div><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.06em] text-[#3157f6]"><LockKeyhole className="size-3.5" />Spending contract</div><CardTitle>Define the authorization envelope</CardTitle></div><Button variant={editingContract ? "soft" : "ghost"} size="sm" disabled={editingContract && !contractValid} onClick={() => { if (editingContract) toast.success("Contract edits saved", { description: "The authorization envelope is ready for manager approval." }); setEditingContract((current) => !current); }}>{editingContract ? <Save /> : <Pencil />}{editingContract ? "Save changes" : "Edit"}</Button></CardHeader>
        <CardContent className="space-y-5">
          <div><Label htmlFor="cap">Amount cap</Label><div className="relative"><span className="absolute left-3 top-2.5 text-sm text-[#667085]">$</span><Input id="cap" type="number" className="pl-7" min="308" max="350" step="1" value={cap} disabled={!editingContract} onChange={(event) => setCap(Number(event.target.value))} /></div>{cap < minTotal && <p className="mt-1.5 text-xs text-[#b42318]">Cap cannot be lower than the selected offer.</p>}<p className="mt-1.5 text-xs text-[#98a2b3]">Mission budget ceiling: $350.00</p></div>
          <div><Label htmlFor="validity">Authorization validity</Label><select id="validity" disabled={!editingContract} className="focus-ring h-10 w-full rounded-[10px] border border-[#cfd5cc] bg-white px-3 text-sm disabled:bg-[#f0f2ee] disabled:text-[#687386]" value={hours} onChange={(event) => setHours(Number(event.target.value))}><option value={8}>8 hours</option><option value={24}>24 hours</option><option value={48}>48 hours</option><option value={72}>72 hours</option></select><p className="mt-1.5 text-xs text-[#98a2b3]">Expires {expiry}</p></div>
          <div><div className="mb-1 flex items-center justify-between gap-2"><Label>Payment source</Label><Badge tone={cardMode === "live" ? "success" : "warning"}>{cardMode === "live" ? "Prava sandbox live" : "Simulated sandbox fallback"}</Badge></div><div className="space-y-2">{cardsLoading ? <div className="flex items-center gap-2 rounded-lg border border-[#e4e7ec] p-3 text-sm text-[#667085]"><LoaderCircle className="size-4 animate-spin" />Loading safe card metadata…</div> : cardError ? <div className="rounded-lg border border-[#fedf89] bg-[#fffaeb] p-3 text-sm text-[#93370d]">{cardError}</div> : cards.map((card) => <button type="button" key={card.id} disabled={!editingContract} onClick={() => setCardId(card.id)} className={`focus-ring flex w-full items-center gap-3 rounded-lg border p-3 text-left disabled:cursor-not-allowed disabled:opacity-70 ${cardId === card.id ? "border-[#3157f6] bg-[#f4f6ff] ring-1 ring-[#3157f6]" : "border-[#e4e7ec] hover:bg-[#f9fafb]"}`}><span className="grid size-9 place-items-center rounded-md bg-[#102a56] text-white"><CreditCard className="size-4" /></span><span className="flex-1"><span className="block text-sm font-semibold capitalize">{card.brand} •••• {card.last4}</span><span className="text-xs text-[#667085]">Expires {card.expiryMonth}/{card.expiryYear}</span></span>{cardId === card.id && <Check className="size-4 text-[#3157f6]" />}</button>)}</div>{cardMode === "demo" && !cardsLoading && !cardError && <p className="mt-2 text-xs leading-5 text-[#93370d]">No enrolled live card was available. These test cards simulate Prava mandate enforcement and are never presented as a verified live charge.</p>}</div>
          <div className="space-y-3 rounded-lg bg-[#f9fafb] p-4 text-sm"><div className="flex justify-between"><span className="text-[#667085]">Merchant</span><strong>Merchant A only</strong></div><div className="flex justify-between"><span className="text-[#667085]">Allowed charges</span><strong>1</strong></div><div className="flex justify-between"><span className="text-[#667085]">Category</span><strong>Computer accessories</strong></div></div>
          <p className="flex gap-2 text-xs leading-5 text-[#667085]"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#155eef]" />The merchant, limit, count, and expiry are enforced by policy and passed into the Prava mandate. Changing merchants requires a new authorization.</p>
        </CardContent>
      </Card>
    </div>
  );
}
