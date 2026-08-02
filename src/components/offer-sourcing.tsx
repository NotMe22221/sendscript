"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, ChevronDown, CircleX, Filter, LoaderCircle, Search, ShieldCheck, SlidersHorizontal, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { demoDecision, demoEvaluations, demoOffers } from "@/lib/domain/demo";
import { formatMoney } from "@/lib/format";

const demoEvaluationMap = new Map(demoEvaluations.map((item) => [item.offerId, item]));

export function OfferSourcing({ missionId, initialEvaluated = false }: { missionId: string; initialEvaluated?: boolean }) {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "compliant" | "rejected">("all");
  const [evaluated, setEvaluated] = useState(initialEvaluated);
  const [pending, setPending] = useState(false);
  const [selected, setSelected] = useState<string[]>(["offer-01", "offer-02", "offer-03"]);
  const visible = useMemo(() => demoOffers.filter((offer) => filter === "all" || (filter === "compliant" ? demoEvaluationMap.get(offer.id)?.compliant : !demoEvaluationMap.get(offer.id)?.compliant)), [filter]);

  async function evaluate() {
    setPending(true);
    try {
      const response = await fetch(`/api/missions/${missionId}/evaluate`, { method: "POST" });
      const payload = await response.json();
      if (!payload.ok) throw new Error(payload.error.message);
      setEvaluated(true);
      toast.success("14 offers evaluated", { description: "4 passed every deterministic policy rule." });
    } catch (error) { toast.error(error instanceof Error ? error.message : "Evaluation failed"); }
    finally { setPending(false); }
  }

  async function sendForApproval() {
    setPending(true);
    try {
      const response = await fetch(`/api/missions/${missionId}/decide`, { method: "POST" });
      const payload = await response.json();
      if (!payload.ok) throw new Error(payload.error.message);
      router.push(`/missions/${missionId}/review`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send for approval");
      setPending(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-4">
        {[ ["Request", "8 USB-C hubs"], ["Budget", "$350.00 total"], ["Needed by", "Aug 18, 2026"], ["Catalog", "14 controlled offers"] ].map(([label,value]) => <Card key={label} className="p-4"><p className="text-xs font-medium text-[#667085]">{label}</p><p className="mt-1.5 text-sm font-semibold text-[#101828]">{value}</p></Card>)}
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="items-center"><div><CardTitle>Controlled catalog results</CardTitle><p className="mt-1 text-xs text-[#667085]">Seeded offer records · refreshed Aug 1 at 5:52 PM</p></div><div className="flex items-center gap-2"><Button variant="secondary" size="sm"><Filter />Filters</Button><Button variant="secondary" size="sm"><SlidersHorizontal />Columns</Button></div></CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eaecf0] px-5 py-3">
          <div className="flex rounded-lg bg-[#f2f4f7] p-1">{([ ["all","All 14"], ["compliant","Compliant 4"], ["rejected","Rejected 10"] ] as const).map(([value,label]) => <button key={value} onClick={() => setFilter(value)} className={`focus-ring rounded-md px-3 py-1.5 text-xs font-semibold ${filter === value ? "bg-white text-[#344054] shadow-sm" : "text-[#667085]"}`}>{label}</button>)}</div>
          <div className="relative"><Search className="absolute left-3 top-2.5 size-4 text-[#98a2b3]" /><input className="focus-ring h-9 w-56 rounded-lg border border-[#d0d5dd] pl-9 pr-3 text-sm" placeholder="Search offers" /></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead className="bg-[#f9fafb] text-[11px] font-semibold uppercase tracking-[.05em] text-[#667085]"><tr><th className="w-10 px-5 py-3"><span className="sr-only">Compare</span></th><th className="px-3 py-3">Product / merchant</th><th className="px-3 py-3">Total</th><th className="px-3 py-3">Delivery</th><th className="px-3 py-3">Seller</th><th className="px-3 py-3">Returns</th><th className="px-3 py-3">Requirement match</th><th className="px-3 py-3">Policy</th></tr></thead>
            <tbody className="divide-y divide-[#eaecf0]">{visible.map((offer) => { const evaluation = demoEvaluationMap.get(offer.id)!; const total = offer.unitPriceCents * offer.quantity + offer.shippingCents; return <tr key={offer.id} className={`hover:bg-[#fcfcfd] ${demoDecision.selectedOfferId === offer.id && evaluated ? "bg-[#f8faff]" : ""}`}><td className="px-5 py-4"><input type="checkbox" aria-label={`Compare ${offer.productName}`} checked={selected.includes(offer.id)} onChange={() => setSelected((current) => current.includes(offer.id) ? current.filter((id) => id !== offer.id) : current.length < 3 ? [...current, offer.id] : current)} className="size-4 accent-[#155eef]" /></td><td className="px-3 py-4"><div className="flex items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#f2f4f7] text-xs font-bold text-[#667085]">USB</span><div><p className="max-w-[260px] font-medium text-[#101828]">{offer.productName}</p><p className="mt-0.5 text-xs text-[#667085]">{offer.merchant} · {offer.quantity} units</p></div></div></td><td className="tabular px-3 py-4 font-semibold">{formatMoney(total)}</td><td className="px-3 py-4 text-[#475467]">Aug {Number(offer.deliveryDate.slice(-2))}</td><td className="px-3 py-4"><span className="font-medium">{offer.sellerRating.toFixed(1)}</span><span className="text-[#f79009]"> ★</span></td><td className="px-3 py-4 text-[#475467]">{offer.returnDays} days</td><td className="px-3 py-4"><div className="flex items-center gap-2"><div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#eaecf0]"><div className="h-full rounded-full bg-[#155eef]" style={{ width: `${offer.requirementMatch * 100}%` }} /></div><span className="tabular text-xs font-medium">{Math.round(offer.requirementMatch * 100)}%</span></div></td><td className="px-3 py-4">{evaluation.compliant ? <Badge tone="success"><Check className="size-3" />Pass</Badge> : <div className="group relative"><Badge tone="danger"><CircleX className="size-3" />Reject</Badge><p className="mt-1 max-w-[160px] truncate text-[10px] text-[#b42318]">{evaluation.violations[0]}</p></div>}</td></tr>; })}</tbody>
          </table>
        </div>
        <div className="flex flex-col items-start justify-between gap-3 border-t border-[#eaecf0] bg-[#fcfcfd] px-5 py-4 sm:flex-row sm:items-center"><p className="text-xs text-[#667085]">{selected.length}/3 offers selected for side-by-side inspection</p><div className="flex gap-2"><Button variant="secondary">Compare selected<ChevronDown /></Button><Button onClick={evaluate} disabled={pending}>{pending ? <LoaderCircle className="animate-spin" /> : <ShieldCheck />}{evaluated ? "Re-run policy" : "Run policy & rank"}</Button></div></div>
      </Card>

      {evaluated && <Card className="overflow-hidden border-[#b2ccff] bg-[#fbfcff]"><CardHeader><div><div className="mb-2 flex items-center gap-2"><Badge tone="info"><Sparkles className="size-3" />Recommended</Badge><span className="text-xs font-semibold text-[#667085]">Score {demoDecision.totalScore}/100</span></div><CardTitle>ApexLink Pro is the best compliant value</CardTitle><p className="mt-1 text-sm text-[#667085]">{demoDecision.explanation}</p></div><span className="tabular text-2xl font-semibold tracking-[-.03em]">$308.00</span></CardHeader><CardContent><div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">{Object.entries(demoDecision.scoreBreakdown).map(([key,value]) => <div key={key} className="rounded-lg border border-[#e4e7ec] bg-white p-3"><p className="truncate text-[10px] font-semibold uppercase tracking-[.04em] text-[#667085]">{key.replace(/([A-Z])/g, " $1")}</p><p className="tabular mt-1 text-lg font-semibold">{value}%</p></div>)}</div><div className="mt-5 flex justify-end"><Button size="lg" onClick={sendForApproval} disabled={pending}>{pending ? <LoaderCircle className="animate-spin" /> : null}Send for manager approval<ArrowRight /></Button></div></CardContent></Card>}
    </div>
  );
}
