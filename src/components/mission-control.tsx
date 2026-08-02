"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Check, CircleDot, KeyRound, LoaderCircle, Play, RotateCcw, ShieldAlert, ShoppingBag, XCircle } from "lucide-react";
import { toast } from "sonner";
import { ActivityTimeline } from "@/components/activity-timeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ActivityEvent, ApiResponse, SafePravaMetadata, TransactionResult } from "@/lib/domain/schemas";
import { formatMoney } from "@/lib/format";

export type RunState = "approved" | "authorizing" | "authorized" | "testing" | "blocked" | "purchasing" | "completed" | "cancelled";

export interface MissionControlInitialData {
  state: RunState;
  mandateId?: string;
  blockedTransaction?: TransactionResult;
  successTransaction?: TransactionResult;
  merchant: string;
  amountCents: number;
  amountCapCents: number;
  itemDescription: string;
  cardLabel: string;
  events: ActivityEvent[];
}

const stateIndex: Record<RunState, number> = { approved: 0, authorizing: 0, authorized: 1, testing: 1, blocked: 2, purchasing: 2, completed: 3, cancelled: 0 };

export function MissionControl({ missionId, initial }: { missionId: string; initial: MissionControlInitialData }) {
  const returned = useSearchParams().get("authorization") === "returned";
  const [state, setState] = useState<RunState>(returned ? "authorizing" : initial.state);
  const [mandateId, setMandateId] = useState(initial.mandateId ?? "");
  const [successTransaction, setSuccessTransaction] = useState<TransactionResult | null>(initial.successTransaction ?? null);
  const [events, setEvents] = useState(initial.events);
  const [paused, setPaused] = useState(false);
  const violationCents = initial.amountCapCents + 5000;

  async function refreshTimeline(showToast = false) {
    const response = await fetch(`/api/missions/${missionId}/timeline`, { cache: "no-store" });
    const payload = await response.json();
    if (!payload.ok) throw new Error(payload.error.message);
    setEvents(payload.data.events);
    if (showToast) toast.success("Timeline refreshed");
  }

  useEffect(() => {
    if (!returned) return;
    const controller = new AbortController();
    fetch(`/api/prava/authorizations/${missionId}`, { signal: controller.signal }).then((response) => response.json()).then((payload: ApiResponse<SafePravaMetadata>) => {
      if (!payload.ok || !payload.data.mandateId || payload.data.status !== "active") throw new Error(payload.ok ? "Mandate is not active yet." : payload.error.message);
      setMandateId(payload.data.mandateId);
      setState("authorized");
      toast.success("Prava mandate is active");
    }).catch((error) => {
      if (error instanceof Error && error.name !== "AbortError") { setState("approved"); toast.error(error.message); }
    });
    return () => controller.abort();
  }, [missionId, returned]);

  async function authorize() {
    setState("authorizing");
    try {
      const response = await fetch("/api/prava/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ missionId, merchant: initial.merchant, cardId: "persisted-approved-card", amountCapCents: initial.amountCapCents, allowedCharges: 1, expiresAt: new Date(Date.now() + 86_400_000).toISOString(), itemDescription: initial.itemDescription }) });
      const payload = await response.json();
      if (!payload.ok) throw new Error(payload.error.message);
      if (payload.data.hostedApprovalUrl) { window.location.assign(payload.data.hostedApprovalUrl); return; }
      if (!payload.data.mandateId) throw new Error("Prava did not return an active mandate.");
      setMandateId(payload.data.mandateId);
      setState("authorized");
      await refreshTimeline();
    } catch (error) { setState("approved"); toast.error(error instanceof Error ? error.message : "Authorization failed"); }
  }

  async function testViolation() {
    if (paused) return toast.error("Resume execution first.");
    setState("testing");
    try {
      const response = await fetch(`/api/prava/mandates/${mandateId}/charge`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ missionId, merchant: initial.merchant, amountCents: violationCents, reference: `mission-${missionId}-violation-001` }) });
      const payload = await response.json();
      if (!payload.ok) throw new Error(payload.error.message);
      setState("blocked");
      await refreshTimeline();
      toast.error("Over-limit charge blocked", { description: "No checkout credential was issued." });
    } catch (error) { setState("authorized"); toast.error(error instanceof Error ? error.message : "Guardrail test failed"); }
  }

  async function purchase() {
    if (paused) return toast.error("Resume execution first.");
    setState("purchasing");
    try {
      const response = await fetch(`/api/checkout/${missionId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mandateId, merchant: initial.merchant, amountCents: initial.amountCents, reference: `mission-${missionId}-valid-001` }) });
      const payload = await response.json();
      if (!payload.ok) throw new Error(payload.error.message);
      setSuccessTransaction(payload.data);
      setState("completed");
      await refreshTimeline();
      toast.success("Purchase completed and persisted");
    } catch (error) { setState("blocked"); toast.error(error instanceof Error ? error.message : "Checkout failed"); }
  }

  const steps = [
    [KeyRound, "Create authorization", "Complete Prava hosted approval"],
    [ShieldAlert, "Prove the guardrail", `Attempt ${formatMoney(violationCents)} against the ${formatMoney(initial.amountCapCents)} cap`],
    [ShoppingBag, "Execute checkout", `Purchase for ${formatMoney(initial.amountCents)}`],
    [Check, "Close the loop", "Persist transaction and audit event"],
  ] as const;

  return <div className="grid gap-5 xl:grid-cols-[1.12fr_.88fr]">
    <div className="space-y-5"><Card><CardHeader><div><Badge tone="success" className="mb-2">Prava sandbox connected</Badge><CardTitle>Execution run</CardTitle><p className="mt-1 text-xs text-[#667085]">{initial.itemDescription} from {initial.merchant}</p></div><Badge tone={state === "completed" ? "success" : state === "blocked" ? "warning" : "info"}><CircleDot className="size-3" />{paused ? "paused" : state}</Badge></CardHeader><CardContent><div className="space-y-2">{steps.map(([Icon,title,detail], index) => {
      const active = index === stateIndex[state] && state !== "completed";
      const done = index < stateIndex[state] || state === "completed";
      return <div key={title} className={`rounded-xl p-4 ${active ? "bg-[#f8faff] ring-1 ring-[#b2ccff]" : "bg-[#fafafa]"}`}><div className="flex gap-3"><span className={`grid size-8 place-items-center rounded-full ${done ? "bg-[#12b76a] text-white" : active ? "bg-[#155eef] text-white" : "bg-[#e4e7ec] text-[#667085]"}`}>{done ? <Check className="size-4" /> : <Icon className="size-4" />}</span><div><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs text-[#667085]">{detail}</p>{active && index === 0 ? <Button className="mt-3" size="sm" onClick={authorize} disabled={state === "authorizing"}>{state === "authorizing" ? <LoaderCircle className="animate-spin" /> : <KeyRound />}Authorize</Button> : null}{active && index === 1 ? <Button className="mt-3" size="sm" variant="danger" onClick={testViolation}>Test over-limit charge</Button> : null}{active && index === 2 ? <Button className="mt-3" size="sm" onClick={purchase}><Play />Complete purchase</Button> : null}</div></div></div>;
    })}</div></CardContent></Card>
    {state === "blocked" ? <div className="rounded-xl border border-[#fecdca] bg-[#fef3f2] p-5"><h2 className="font-semibold text-[#912018]">Authorization blocked the violation</h2><p className="mt-2 text-sm text-[#b42318]">{formatMoney(violationCents)} exceeded the {formatMoney(initial.amountCapCents)} cap. No checkout ran.</p><Button className="mt-4" size="sm" onClick={purchase}>Continue with {formatMoney(initial.amountCents)} purchase<ArrowRight /></Button></div> : null}
    {state === "completed" ? <div className="rounded-xl border border-[#abefc6] bg-[#ecfdf3] p-5"><h2 className="font-semibold text-[#05603a]">Mission completed safely</h2><p className="mt-2 text-sm text-[#067647]">{initial.merchant} accepted the authorized {formatMoney(initial.amountCents)} purchase.</p><Button asChild className="mt-4" variant="secondary" size="sm"><Link href={successTransaction ? `/transactions/${successTransaction.id}` : "/transactions"}>Open transaction<ArrowRight /></Link></Button></div> : null}</div>
    <div className="space-y-5"><Card className="border-[#b2ccff]"><CardHeader><CardTitle>Approved contract</CardTitle></CardHeader><CardContent><div className="space-y-3 text-sm">{[["Merchant",initial.merchant],["Purchase",formatMoney(initial.amountCents)],["Amount cap",formatMoney(initial.amountCapCents)],["Card",initial.cardLabel],["Charges","1"]].map(([label,value]) => <div key={label} className="flex justify-between border-b pb-3 last:border-0"><span className="text-[#667085]">{label}</span><strong>{value}</strong></div>)}</div><Button className="mt-5 w-full" variant="secondary" onClick={() => setPaused((current) => !current)}><XCircle />{paused ? "Resume execution" : "Pause execution"}</Button></CardContent></Card>
    <Card><CardHeader><CardTitle>Persisted audit trail</CardTitle><Button variant="ghost" size="sm" onClick={() => void refreshTimeline(true)}><RotateCcw />Refresh</Button></CardHeader><CardContent>{events.length ? <ActivityTimeline events={events.slice(0, 7)} /> : <p className="text-sm text-[#667085]">No events yet.</p>}</CardContent></Card></div>
  </div>;
}
