"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Ban, Check, CheckCircle2, CircleDot, ExternalLink, KeyRound, LoaderCircle, LockKeyhole, Play, RotateCcw, ShieldAlert, ShieldCheck, ShoppingBag, XCircle } from "lucide-react";
import { toast } from "sonner";
import { ActivityTimeline } from "@/components/activity-timeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DEMO_TRANSACTION_ID } from "@/lib/domain/demo";
import type { ActivityEvent, ApiResponse, SafePravaMetadata, TransactionResult } from "@/lib/domain/schemas";

export type RunState = "approved" | "authorizing" | "authorized" | "testing" | "blocked" | "purchasing" | "completed" | "cancelled";

export interface MissionControlInitialData {
  state: RunState;
  mandateId?: string;
  blockedTransaction?: TransactionResult;
  successTransaction?: TransactionResult;
  executionMode: "live" | "demo";
  events: ActivityEvent[];
}

const stateIndex: Record<RunState, number> = { approved: 0, authorizing: 0, authorized: 1, testing: 1, blocked: 2, purchasing: 2, completed: 3, cancelled: 0 };

export function MissionControl({ missionId, initial }: { missionId: string; initial?: MissionControlInitialData }) {
  const searchParams = useSearchParams();
  const returnedFromPrava = searchParams.get("authorization") === "returned";
  const [state, setState] = useState<RunState>(returnedFromPrava ? "authorizing" : initial?.state ?? "approved");
  const [mandateId, setMandateId] = useState(initial?.mandateId ?? "mandate_demo_4d91");
  const [, setBlockedTransaction] = useState<TransactionResult | null>(initial?.blockedTransaction ?? null);
  const [successTransaction, setSuccessTransaction] = useState<TransactionResult | null>(initial?.successTransaction ?? null);
  const [executionMode, setExecutionMode] = useState<"live" | "demo">(initial?.executionMode ?? "demo");
  const [persistedEvents, setPersistedEvents] = useState<ActivityEvent[]>(initial?.events ?? []);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!returnedFromPrava) return;
    let cancelled = false;
    fetch(`/api/prava/authorizations/${missionId}`).then((response) => response.json()).then((payload: ApiResponse<SafePravaMetadata>) => {
      if (cancelled) return;
      if (!payload.ok || !payload.data.mandateId || payload.data.status !== "active") throw new Error(payload.ok ? "Mandate is not active yet." : payload.error.message);
      setExecutionMode(payload.mode);
      setMandateId(payload.data.mandateId);
      setState("authorized");
      toast.success("Prava mandate is active", { description: "Hosted passkey approval was confirmed synchronously." });
    }).catch((error) => {
      if (!cancelled) {
        setState("approved");
        toast.error("Authorization could not be confirmed", { description: error instanceof Error ? error.message : "Try again." });
      }
    });
    return () => { cancelled = true; };
  }, [missionId, returnedFromPrava]);

  const timeline = persistedEvents;

  async function refreshTimeline(showToast = false) {
    try {
      const response = await fetch(`/api/missions/${missionId}/timeline`, { cache: "no-store" });
      const payload = (await response.json()) as ApiResponse<{ events: ActivityEvent[] }>;
      if (!payload.ok) throw new Error(payload.error.message);
      setPersistedEvents(payload.data.events);
      if (showToast) toast.success("Timeline refreshed");
    } catch (error) {
      if (showToast) toast.error(error instanceof Error ? error.message : "Timeline refresh failed");
    }
  }

  async function authorize() {
    setState("authorizing");
    try {
      const response = await fetch("/api/prava/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ missionId, merchant: "Merchant A", cardId: "card_demo_4242", amountCapCents: 30800, allowedCharges: 1, expiresAt: new Date(Date.now() + 86_400_000).toISOString(), itemDescription: "8 × ApexLink Pro USB-C Hub" }) });
      const payload = (await response.json()) as ApiResponse<SafePravaMetadata>;
      if (!payload.ok) throw new Error(payload.error.message);
      setExecutionMode(payload.mode);
      if (payload.data.mandateId) setMandateId(payload.data.mandateId);
      if (payload.data.hostedApprovalUrl) {
        toast.info("Opening Prava hosted approval…");
        window.location.assign(payload.data.hostedApprovalUrl);
        return;
      }
      setState("authorized");
      await refreshTimeline();
      toast.success("Simulated mandate activated", { description: "No enrolled Prava card was available; this run remains clearly labelled." });
    } catch (error) { setState("approved"); toast.error(error instanceof Error ? error.message : "Authorization failed"); }
  }

  async function testViolation() {
    if (paused) return toast.error("Resume the authorization before testing a charge.");
    setState("testing");
    try {
      const response = await fetch(`/api/prava/mandates/${mandateId}/charge`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ missionId, merchant: "Merchant A", amountCents: 35800, reference: `mission-${missionId}-violation-001` }) });
      const payload = (await response.json()) as ApiResponse<TransactionResult>;
      if (!payload.ok) throw new Error(payload.error.message);
      setExecutionMode(payload.mode);
      setBlockedTransaction(payload.data);
      setState("blocked");
      await refreshTimeline();
      toast.error("Charge blocked exactly as designed", { description: "THRESHOLD_EXCEEDED · no funds moved" });
    } catch (error) { setState("authorized"); toast.error(error instanceof Error ? error.message : "Block test failed"); }
  }

  async function purchase() {
    if (paused) return toast.error("Resume the authorization before purchasing.");
    setState("purchasing");
    try {
      const response = await fetch(`/api/checkout/${missionId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mandateId, merchant: "Merchant A", amountCents: 30800, reference: `mission-${missionId}-valid-001` }) });
      const payload = (await response.json()) as ApiResponse<TransactionResult>;
      if (!payload.ok) throw new Error(payload.error.message);
      setExecutionMode(payload.mode);
      setSuccessTransaction(payload.data);
      setState("completed");
      await refreshTimeline();
      toast.success("Purchase completed", { description: "Checkout and audit records are ready." });
    } catch (error) { setState("blocked"); toast.error(error instanceof Error ? error.message : "Checkout failed"); }
  }

  async function revoke() {
    const response = await fetch(`/api/prava/mandates/${mandateId}/revoke`, { method: "POST" });
    const payload = await response.json();
    if (!payload.ok) return toast.error(payload.error.message);
    setState("cancelled");
    setPaused(false);
    toast.success("Authorization revoked");
  }

  function togglePause() {
    setPaused((current) => !current);
    toast.info(paused ? "Authorization resumed" : "Authorization paused", { description: paused ? "The mandate can execute its one approved charge." : "SpendScript will not execute a charge until you resume." });
  }

  const steps = [
    { title: "Create authorization", detail: "Hosted passkey approval", icon: KeyRound },
    { title: "Prove the guardrail", detail: "Attempt $358 against $308 cap", icon: ShieldAlert },
    { title: "Execute checkout", detail: "One-time $308 purchase", icon: ShoppingBag },
    { title: "Close the loop", detail: "Persist transaction and audit", icon: CheckCircle2 },
  ];

  return (
    <div className="grid gap-5 xl:grid-cols-[1.12fr_.88fr]">
      <div className="space-y-5">
        <Card>
          <CardHeader><div><div className="mb-2"><Badge tone={executionMode === "live" ? "success" : "warning"}>{executionMode === "live" ? "Live Prava sandbox" : "Simulated sandbox fallback"}</Badge></div><CardTitle>Execution run</CardTitle><p className="mt-1 text-xs text-[#667085]">One judge-ready path with every control and response visible.</p></div><Badge tone={state === "completed" ? "success" : state === "cancelled" ? "danger" : state === "blocked" ? "warning" : "info"}><CircleDot className="size-3" />{paused ? "paused" : state.replaceAll("_", " ")}</Badge></CardHeader>
          <CardContent>
            <div className="space-y-1">{steps.map((step, index) => { const done = index < stateIndex[state] || state === "completed"; const active = index === stateIndex[state] && state !== "completed" && state !== "cancelled"; return <div key={step.title} className={`relative flex gap-4 rounded-xl p-4 ${active ? "bg-[#f8faff] ring-1 ring-[#b2ccff]" : ""}`}>{index < steps.length - 1 && <span className="absolute left-[29px] top-12 h-[calc(100%-1.5rem)] w-px bg-[#e4e7ec]" />}<span className={`relative grid size-8 shrink-0 place-items-center rounded-full ${done ? "bg-[#12b76a] text-white" : active ? "bg-[#155eef] text-white" : "bg-[#f2f4f7] text-[#98a2b3]"}`}>{done ? <Check className="size-4" /> : <step.icon className="size-4" />}</span><div className="flex-1"><p className={`text-sm font-semibold ${active ? "text-[#1849a9]" : done ? "text-[#344054]" : "text-[#98a2b3]"}`}>{step.title}</p><p className="mt-1 text-xs text-[#667085]">{step.detail}</p>{active && index === 0 && <Button className="mt-3" size="sm" onClick={authorize} disabled={state === "authorizing"}>{state === "authorizing" ? <LoaderCircle className="animate-spin" /> : <LockKeyhole />}Create secure authorization</Button>}{active && index === 1 && <Button className="mt-3" variant="danger" size="sm" onClick={testViolation} disabled={state === "testing"}>{state === "testing" ? <LoaderCircle className="animate-spin" /> : <ShieldAlert />}Test $358 violation</Button>}{active && index === 2 && <Button className="mt-3" size="sm" onClick={purchase} disabled={state === "purchasing"}>{state === "purchasing" ? <LoaderCircle className="animate-spin" /> : <Play />}Purchase for $308</Button>}</div>{done && <span className="text-xs font-semibold text-[#067647]">Complete</span>}</div>; })}</div>
          </CardContent>
        </Card>

        {state === "blocked" && <div className="rounded-xl border border-[#fecdca] bg-[#fef3f2] p-5"><div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-[#d92d20] ring-1 ring-[#fecdca]"><Ban className="size-5" /></span><div className="flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold text-[#912018]">Violation blocked at the authorization layer</h2><code className="rounded bg-white px-2 py-1 text-[11px] font-semibold text-[#b42318]">THRESHOLD_EXCEEDED</code></div><p className="mt-2 text-sm leading-6 text-[#b42318]">The attempted $358.00 charge exceeded the $308.00 mandate. No credentials were issued, no checkout ran, and no funds moved.</p><Button className="mt-4" size="sm" onClick={purchase}>Continue with valid $308 purchase<ArrowRight /></Button></div></div></div>}

        {state === "completed" && <div className="rounded-xl border border-[#abefc6] bg-[#ecfdf3] p-5"><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#12b76a] text-white"><Check className="size-5" /></span><div className="flex-1"><h2 className="text-lg font-semibold text-[#05603a]">Mission completed safely</h2><p className="mt-1 text-sm leading-6 text-[#067647]">Merchant A accepted the valid $308.00 charge. Safe response metadata and the full activity trail are ready for inspection.</p><Button asChild className="mt-4" variant="secondary" size="sm"><Link href={`/transactions/${successTransaction?.id ?? DEMO_TRANSACTION_ID}`}>Open transaction record<ArrowRight /></Link></Button></div></div></div>}
      </div>

      <div className="space-y-5">
        <Card className="border-[#b2ccff]"><CardHeader><div><p className="mb-1 text-xs font-semibold uppercase tracking-[.06em] text-[#155eef]">Active contract</p><CardTitle>Merchant-scoped payment control</CardTitle></div><ShieldCheck className="size-5 text-[#155eef]" /></CardHeader><CardContent><div className="space-y-3 text-sm">{[["Merchant","Merchant A only"],["Amount cap","$308.00"],["Allowed charges","1"],["Validity","24 hours"],["Card","Visa •••• 4242"]].map(([label,value]) => <div key={label} className="flex justify-between gap-4 border-b border-[#eaecf0] pb-3 last:border-0 last:pb-0"><span className="text-[#667085]">{label}</span><strong className="text-right">{value}</strong></div>)}</div><div className="mt-5 flex gap-2"><Button variant={paused ? "soft" : "secondary"} size="sm" className="flex-1" onClick={togglePause}><XCircle />{paused ? "Resume" : "Pause"}</Button><Dialog><DialogTrigger asChild><Button variant="ghost" size="sm">Revoke</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Revoke this authorization?</DialogTitle><DialogDescription>This permanently cancels the mandate. The mission would need a new manager approval and Prava passkey authorization.</DialogDescription></DialogHeader><DialogFooter><Button variant="danger" onClick={revoke}>Revoke authorization</Button></DialogFooter></DialogContent></Dialog></div></CardContent></Card>
        <Card><CardHeader><CardTitle>Persisted audit trail</CardTitle><Button variant="ghost" size="sm" onClick={() => void refreshTimeline(true)}><RotateCcw />Refresh</Button></CardHeader><CardContent>{timeline.length ? <ActivityTimeline events={timeline.slice(0, 7)} /> : <p className="py-4 text-sm text-[#667085]">No persisted events are available yet.</p>}</CardContent></Card>
        <a href="https://docs.prava.space/api-reference/testing" target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-[#e4e7ec] bg-white px-4 py-3 text-xs text-[#667085] shadow-sm hover:border-[#b2ccff]"><span>Prava sandbox flow and real WebAuthn details</span><ExternalLink className="size-3.5" /></a>
      </div>
    </div>
  );
}
