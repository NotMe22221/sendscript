"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Bot, Check, CircleAlert, LoaderCircle, Plus, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ApiResponse, MissionRequirements } from "@/lib/domain/schemas";

const samplePrompt = "Buy 8 reliable USB-C hubs for the product team under $350 total. They need 4K HDMI, 100W power delivery, Ethernet, at least two USB-A ports, and must work with Mac and Windows. Deliver by August 18.";

export function MissionCreateForm() {
  const router = useRouter();
  const [phase, setPhase] = useState<"request" | "review">("request");
  const [prompt, setPrompt] = useState(samplePrompt);
  const [pending, setPending] = useState(false);
  const [missionId, setMissionId] = useState("");
  const [requirements, setRequirements] = useState<MissionRequirements | null>(null);
  const [newPort, setNewPort] = useState("");

  async function analyze() {
    setPending(true);
    try {
      const response = await fetch("/api/missions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt }) });
      const payload = (await response.json()) as ApiResponse<{ missionId: string; requirements: MissionRequirements }>;
      if (!payload.ok) throw new Error(payload.error.message);
      setMissionId(payload.data.missionId);
      setRequirements(payload.data.requirements);
      setPhase("review");
      toast.success("Request structured and saved", { description: "The mission is now persisted in your organization workspace." });
    } catch (error) {
      toast.error("Could not analyze the request", { description: error instanceof Error ? error.message : "Try again." });
    } finally { setPending(false); }
  }

  async function confirm() {
    if (!requirements || !missionId) return;
    setPending(true);
    try {
      const response = await fetch(`/api/missions/${missionId}/confirm`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(requirements) });
      const payload = (await response.json()) as ApiResponse<{ missionId: string }>;
      if (!payload.ok) throw new Error(payload.error.message);
      router.push(`/missions/${payload.data.missionId}/source`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not confirm requirements"); setPending(false); }
  }

  if (phase === "request") return (
    <div className="grid gap-5 xl:grid-cols-[1.3fr_.7fr]">
      <Card>
        <CardHeader><div><CardTitle>What should the agent buy?</CardTitle><p className="mt-1 text-sm text-[#667085]">Describe the outcome. SpendScript turns it into reviewable requirements before sourcing.</p></div><Badge tone="purple"><Sparkles className="size-3" />Structured AI</Badge></CardHeader>
        <CardContent>
          <Textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} className="min-h-[210px] text-[15px] leading-7" aria-label="Purchase request" />
          <div className="mt-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center"><p className="flex items-center gap-2 text-xs text-[#667085]"><CircleAlert className="size-3.5" />No payment or card data is sent to the model.</p><Button onClick={analyze} disabled={pending || prompt.trim().length < 12} size="lg">{pending ? <LoaderCircle className="animate-spin" /> : <Sparkles />}Analyze request<ArrowRight /></Button></div>
        </CardContent>
      </Card>
      <Card className="self-start bg-[#fbfcff]">
        <CardHeader><CardTitle>What happens next</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          {[["1","Extract","Turn the request into quantities, budget, specifications, and timing."],["2","Verify","You review every field before the agent searches the controlled catalog."],["3","Control","Policy—not the model—decides which offers are eligible."]].map(([n,title,detail]) => <div key={n} className="flex gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#eff4ff] text-xs font-semibold text-[#155eef]">{n}</span><div><p className="text-sm font-semibold text-[#344054]">{title}</p><p className="mt-1 text-xs leading-5 text-[#667085]">{detail}</p></div></div>)}
        </CardContent>
      </Card>
    </div>
  );

  if (!requirements) return null;
  const update = <K extends keyof MissionRequirements>(key: K, value: MissionRequirements[K]) => setRequirements((current) => current ? ({ ...current, [key]: value }) : current);
  return (
    <div className="grid gap-5 xl:grid-cols-[1.3fr_.7fr]">
      <Card>
        <CardHeader><div><CardTitle>Confirm structured requirements</CardTitle><p className="mt-1 text-sm text-[#667085]">Every field is editable. These become the sourcing and payment constraints.</p></div><Badge tone={requirements.confidence >= .9 ? "success" : "warning"}>{Math.round(requirements.confidence * 100)}% confidence</Badge></CardHeader>
        <CardContent className="space-y-5">
          <div><Label htmlFor="title">Mission title</Label><Input id="title" value={requirements.title} onChange={(event) => update("title", event.target.value)} /></div>
          <div className="grid gap-4 sm:grid-cols-3"><div><Label htmlFor="quantity">Quantity</Label><Input id="quantity" type="number" min="1" value={requirements.quantity} onChange={(event) => update("quantity", Number(event.target.value))} /></div><div><Label htmlFor="budget">Total budget (USD)</Label><Input id="budget" type="number" min="1" step=".01" value={requirements.budgetCents / 100} onChange={(event) => update("budgetCents", Math.round(Number(event.target.value) * 100))} /></div><div><Label htmlFor="needed">Needed by</Label><Input id="needed" type="date" value={requirements.neededBy} onChange={(event) => update("neededBy", event.target.value)} /></div></div>
          <div><Label>Required ports</Label><div className="flex flex-wrap gap-2 rounded-lg border border-[#d0d5dd] bg-white p-2.5">{requirements.specification.ports.map((port) => <button key={port} type="button" onClick={() => setRequirements((current) => current ? ({ ...current, specification: { ...current.specification, ports: current.specification.ports.filter((item) => item !== port) } }) : current)} className="focus-ring inline-flex items-center gap-1.5 rounded-md bg-[#f2f4f7] px-2.5 py-1.5 text-xs font-medium text-[#344054] hover:bg-[#eaecf0]">{port}<X className="size-3" /></button>)}<div className="flex min-w-[150px] flex-1"><input className="min-w-0 flex-1 bg-transparent px-1 text-xs outline-none" value={newPort} onChange={(event) => setNewPort(event.target.value)} placeholder="Add requirement" onKeyDown={(event) => { if (event.key === "Enter" && newPort.trim()) { event.preventDefault(); setRequirements((current) => current ? ({ ...current, specification: { ...current.specification, ports: [...current.specification.ports, newPort.trim()] } }) : current); setNewPort(""); } }} /><button type="button" aria-label="Add port" className="rounded p-1 text-[#155eef]" onClick={() => { if (newPort.trim()) { setRequirements((current) => current ? ({ ...current, specification: { ...current.specification, ports: [...current.specification.ports, newPort.trim()] } }) : current); setNewPort(""); } }}><Plus className="size-4" /></button></div></div></div>
          <div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="power">Power delivery</Label><div className="relative"><Input id="power" type="number" value={requirements.specification.powerDeliveryWatts} onChange={(event) => setRequirements((current) => current ? ({ ...current, specification: { ...current.specification, powerDeliveryWatts: Number(event.target.value) } }) : current)} /><span className="absolute right-3 top-2.5 text-sm text-[#98a2b3]">watts</span></div></div><div><Label htmlFor="display">Display output</Label><Input id="display" value={requirements.specification.display} onChange={(event) => setRequirements((current) => current ? ({ ...current, specification: { ...current.specification, display: event.target.value } }) : current)} /></div></div>
          <div><Label htmlFor="notes">Notes and flexibility</Label><Textarea id="notes" className="min-h-20" value={requirements.notes} onChange={(event) => update("notes", event.target.value)} /></div>
          <div className="flex items-center justify-between border-t border-[#eaecf0] pt-5"><Button variant="ghost" onClick={() => setPhase("request")}>Back to request</Button><Button size="lg" onClick={confirm} disabled={pending}>{pending ? <LoaderCircle className="animate-spin" /> : <Check />}Confirm & source offers<ArrowRight /></Button></div>
        </CardContent>
      </Card>
      <Card className="self-start"><CardHeader><CardTitle>AI checklist</CardTitle></CardHeader><CardContent className="space-y-3">{["Quantity and budget found","Delivery date resolved","Hardware specifications normalized","Compatibility captured","Payment data excluded"].map((item) => <div key={item} className="flex items-center gap-2.5 text-sm text-[#475467]"><span className="grid size-5 place-items-center rounded-full bg-[#ecfdf3] text-[#067647]"><Check className="size-3" /></span>{item}</div>)}<div className="mt-5 rounded-lg bg-[#eff4ff] p-3 text-xs leading-5 text-[#1849a9]"><Bot className="mb-2 size-4" />The model structures language only. All policy evaluation and offer ranking are deterministic.</div></CardContent></Card>
    </div>
  );
}
