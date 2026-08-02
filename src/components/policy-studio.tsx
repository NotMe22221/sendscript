"use client";

import { useState } from "react";
import { Check, CheckCircle2, ChevronDown, Clock3, Code2, FlaskConical, History, LoaderCircle, Save, ShieldCheck, Sparkles, TriangleAlert, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { demoPolicyRules } from "@/lib/domain/demo";
import type { ApiResponse } from "@/lib/domain/schemas";
import type { PolicyDocument } from "@/lib/providers/openai";

const policyText = `Hardware purchases are allowed from Merchant A, CDW, and Staples Business. The total mission must not exceed $500 and no request may contain more than 12 units. Sellers require a rating of at least 4.2. Purchases at or above $250 require manager approval. Items must arrive by the mission's needed-by date.`;

export function PolicyStudio({ initialPolicy }: { initialPolicy?: { name: string; source: string; version: number; status: string }; mode: "live" | "demo" }) {
  const [source, setSource] = useState(initialPolicy?.source ?? policyText);
  const [pending, setPending] = useState(false);
  const [parsed, setParsed] = useState<PolicyDocument | null>(null);
  const [version, setVersion] = useState(initialPolicy?.version ?? 3);
  const [scenario, setScenario] = useState({ merchant: "Merchant A", amount: 308, quantity: 8, rating: 4.8, onTime: true });
  const violations = [
    ...(scenario.merchant === "Merchant A" || scenario.merchant === "CDW" || scenario.merchant === "Staples Business" ? [] : ["Merchant is not approved"]),
    ...(scenario.amount <= 500 ? [] : ["Total exceeds $500 ceiling"]),
    ...(scenario.quantity <= 12 ? [] : ["Quantity exceeds 12 units"]),
    ...(scenario.rating >= 4.2 ? [] : ["Seller rating is below 4.2"]),
    ...(scenario.onTime ? [] : ["Delivery misses required date"]),
  ];
  const requiresApproval = scenario.amount >= 250;

  async function parse() {
    setPending(true);
    try {
      const response = await fetch("/api/policies/parse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: source }) });
      const payload = (await response.json()) as ApiResponse<PolicyDocument>;
      if (!payload.ok) throw new Error(payload.error.message);
      setParsed(payload.data);
      toast.success(payload.mode === "live" ? "Policy parsed with structured output" : "Demo policy structure loaded");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Policy parsing failed"); }
    finally { setPending(false); }
  }

  async function save() {
    setPending(true);
    const response = await fetch("/api/policies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Hardware Procurement Policy", source, version: version + 1, parsed }) });
    const payload = await response.json();
    setPending(false);
    if (!payload.ok) return toast.error(payload.error.message);
    setVersion((value) => value + 1);
    toast.success(`Policy v${version + 1} published`);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1.08fr_.92fr]">
      <div className="space-y-5">
        <Card>
          <CardHeader><div><div className="mb-2 flex items-center gap-2"><Badge tone="success"><CheckCircle2 className="size-3" />Active</Badge><Badge>Version {version}</Badge></div><CardTitle>Hardware Procurement Policy</CardTitle><p className="mt-1 text-xs text-[#667085]">Applies to Computer accessories · updated Aug 1, 2026</p></div><Button variant="secondary" size="sm"><History />Version history</Button></CardHeader>
          <CardContent><Label htmlFor="policy-source">Policy source</Label><Textarea id="policy-source" className="min-h-[210px] leading-6" value={source} onChange={(event) => setSource(event.target.value)} /><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="flex items-center gap-2 text-xs text-[#667085]"><ShieldCheck className="size-3.5 text-[#155eef]" />The model structures rules; the deterministic engine enforces them.</p><Button onClick={parse} disabled={pending || source.trim().length < 20}>{pending ? <LoaderCircle className="animate-spin" /> : <Sparkles />}Parse policy</Button></div></CardContent>
        </Card>

        <Card>
          <CardHeader><div><CardTitle>Executable rules</CardTitle><p className="mt-1 text-xs text-[#667085]">Human-readable conditions are compiled into typed constraints.</p></div><Badge tone={parsed ? "info" : "neutral"}>{parsed ? `${parsed.confidence * 100}% confidence` : "Seeded v3"}</Badge></CardHeader>
          <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="border-y border-[#eaecf0] bg-[#f9fafb] text-[11px] uppercase tracking-[.05em] text-[#667085]"><tr><th className="px-5 py-3">Field</th><th className="px-5 py-3">Constraint</th><th className="px-5 py-3">Effect</th><th className="px-5 py-3">Status</th></tr></thead><tbody className="divide-y divide-[#eaecf0]">{demoPolicyRules.map((rule) => <tr key={rule.label}><td className="px-5 py-3.5 font-medium">{rule.label}</td><td className="px-5 py-3.5 text-[#475467]">{rule.value}</td><td className="px-5 py-3.5 text-[#475467]">{rule.effect}</td><td className="px-5 py-3.5"><Badge tone="success"><Check className="size-3" />Valid</Badge></td></tr>)}</tbody></table></div>
          <div className="flex justify-end border-t border-[#eaecf0] bg-[#fcfcfd] px-5 py-4"><Button onClick={save} disabled={pending}><Save />Publish version {version + 1}</Button></div>
        </Card>
      </div>

      <div className="space-y-5">
        <Card className="border-[#b2ccff]"><CardHeader><div><p className="mb-1 text-xs font-semibold uppercase tracking-[.06em] text-[#155eef]">Policy simulator</p><CardTitle>Test before publishing</CardTitle></div><FlaskConical className="size-5 text-[#155eef]" /></CardHeader><CardContent className="space-y-4">
          <div><Label htmlFor="test-merchant">Merchant</Label><select id="test-merchant" value={scenario.merchant} onChange={(event) => setScenario((item) => ({ ...item, merchant: event.target.value }))} className="focus-ring h-10 w-full rounded-lg border border-[#d0d5dd] bg-white px-3 text-sm"><option>Merchant A</option><option>CDW</option><option>Staples Business</option><option>Amazon Marketplace</option></select></div>
          <div className="grid grid-cols-2 gap-3"><div><Label htmlFor="test-amount">Total (USD)</Label><Input id="test-amount" type="number" value={scenario.amount} onChange={(event) => setScenario((item) => ({ ...item, amount: Number(event.target.value) }))} /></div><div><Label htmlFor="test-quantity">Quantity</Label><Input id="test-quantity" type="number" value={scenario.quantity} onChange={(event) => setScenario((item) => ({ ...item, quantity: Number(event.target.value) }))} /></div></div>
          <div><Label htmlFor="test-rating">Seller rating</Label><Input id="test-rating" type="number" min="0" max="5" step=".1" value={scenario.rating} onChange={(event) => setScenario((item) => ({ ...item, rating: Number(event.target.value) }))} /></div>
          <button onClick={() => setScenario((item) => ({ ...item, onTime: !item.onTime }))} className="focus-ring flex w-full items-center justify-between rounded-lg border border-[#e4e7ec] p-3 text-sm"><span><span className="block font-medium">Delivery arrives on time</span><span className="text-xs text-[#667085]">Compared with mission needed-by date</span></span><span className={`relative h-6 w-11 rounded-full transition-colors ${scenario.onTime ? "bg-[#155eef]" : "bg-[#d0d5dd]"}`}><span className={`absolute top-1 size-4 rounded-full bg-white transition-transform ${scenario.onTime ? "translate-x-6" : "translate-x-1"}`} /></span></button>
          <div className={`rounded-xl border p-4 ${violations.length ? "border-[#fecdca] bg-[#fef3f2]" : "border-[#abefc6] bg-[#ecfdf3]"}`}><div className="flex items-center gap-2">{violations.length ? <XCircle className="size-5 text-[#d92d20]" /> : <CheckCircle2 className="size-5 text-[#067647]" />}<p className={`text-sm font-semibold ${violations.length ? "text-[#912018]" : "text-[#05603a]"}`}>{violations.length ? "Blocked by policy" : "Compliant offer"}</p></div>{violations.length ? <ul className="mt-2 space-y-1 pl-7 text-xs text-[#b42318]">{violations.map((item) => <li key={item}>• {item}</li>)}</ul> : <p className="mt-2 pl-7 text-xs text-[#067647]">{requiresApproval ? "Manager approval is required because total is at least $250." : "No manager approval is required."}</p>}</div>
          <Button variant="secondary" className="w-full" onClick={() => toast.success("Test result recorded", { description: violations.length ? `${violations.length} violation(s)` : "All rules passed" })}><FlaskConical />Run test case</Button>
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Version controls</CardTitle><Button variant="ghost" size="sm"><ChevronDown /></Button></CardHeader><CardContent className="space-y-4"><div className="flex gap-3"><span className="grid size-8 place-items-center rounded-lg bg-[#f4f3ff] text-[#6938ef]"><Code2 className="size-4" /></span><div><p className="text-sm font-semibold">Deterministic evaluation only</p><p className="mt-1 text-xs leading-5 text-[#667085]">AI explanations cannot change thresholds, approved merchants, quantities, dates, or approval rules.</p></div></div><div className="flex gap-3"><span className="grid size-8 place-items-center rounded-lg bg-[#fffaeb] text-[#b54708]"><Clock3 className="size-4" /></span><div><p className="text-sm font-semibold">Draft changes are isolated</p><p className="mt-1 text-xs leading-5 text-[#667085]">Existing missions keep the policy version captured when they were evaluated.</p></div></div>{parsed?.ambiguities.length ? <div className="rounded-lg bg-[#fffaeb] p-3 text-xs text-[#93370d]"><TriangleAlert className="mb-2 size-4" />{parsed.ambiguities.join(" · ")}</div> : null}</CardContent></Card>
      </div>
    </div>
  );
}
