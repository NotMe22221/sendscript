"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, CircleX, LoaderCircle, Search, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Decision, MissionRequirements, Offer, PolicyEvaluation } from "@/lib/domain/schemas";
import { formatMoney } from "@/lib/format";

export function OfferSourcing({
  missionId,
  requirements,
  initialOffers,
  initialEvaluations,
  initialDecision,
}: {
  missionId: string;
  requirements: MissionRequirements;
  initialOffers: Offer[];
  initialEvaluations: PolicyEvaluation[];
  initialDecision?: Decision;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "compliant" | "rejected">("all");
  const [query, setQuery] = useState("");
  const [evaluations, setEvaluations] = useState(initialEvaluations);
  const [decision, setDecision] = useState(initialDecision);
  const [pending, setPending] = useState(false);
  const evaluationMap = useMemo(() => new Map(evaluations.map((item) => [item.offerId, item])), [evaluations]);
  const visible = useMemo(() => initialOffers.filter((offer) => {
    const evaluation = evaluationMap.get(offer.id);
    const matchesFilter = filter === "all" || (filter === "compliant" ? evaluation?.compliant : evaluation && !evaluation.compliant);
    return matchesFilter && `${offer.productName} ${offer.merchant}`.toLowerCase().includes(query.toLowerCase());
  }), [evaluationMap, filter, initialOffers, query]);
  const compliantCount = evaluations.filter((item) => item.compliant).length;

  async function evaluate() {
    setPending(true);
    try {
      const response = await fetch(`/api/missions/${missionId}/evaluate`, { method: "POST" });
      const payload = await response.json();
      if (!payload.ok) throw new Error(payload.error.message);
      setEvaluations(payload.data.evaluations);
      setDecision(payload.data.decision);
      toast.success(`${payload.data.evaluations.length} offers evaluated`, { description: "Policy results were calculated and persisted." });
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
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not send for approval"); setPending(false); }
  }

  const selectedOffer = decision ? initialOffers.find((offer) => offer.id === decision.selectedOfferId) : undefined;
  return <div className="space-y-5">
    <div className="grid gap-4 lg:grid-cols-4">
      {[
        ["Request", `${requirements.quantity} × ${requirements.title}`],
        ["Budget", `${formatMoney(requirements.budgetCents)} total`],
        ["Needed by", new Date(`${requirements.neededBy}T12:00:00`).toLocaleDateString()],
        ["Catalog", `${initialOffers.length} organization offers`],
      ].map(([label, value]) => <Card key={label} className="p-4"><p className="text-xs font-medium text-[#667085]">{label}</p><p className="mt-1.5 truncate text-sm font-semibold text-[#101828]">{value}</p></Card>)}
    </div>
    <Card className="overflow-hidden">
      <CardHeader><div><CardTitle>Organization catalog results</CardTitle><p className="mt-1 text-xs text-[#667085]">Persisted supplier offers evaluated against your active policy</p></div><Button onClick={evaluate} disabled={pending}>{pending ? <LoaderCircle className="animate-spin" /> : <ShieldCheck />}Evaluate policy</Button></CardHeader>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eaecf0] px-5 py-3">
        <div className="flex rounded-lg bg-[#f2f4f7] p-1">{([["all", `All ${initialOffers.length}`], ["compliant", `Compliant ${compliantCount}`], ["rejected", `Rejected ${evaluations.length - compliantCount}`]] as const).map(([value,label]) => <button type="button" key={value} onClick={() => setFilter(value)} className={`focus-ring rounded-md px-3 py-1.5 text-xs font-semibold ${filter === value ? "bg-white text-[#344054] shadow-sm" : "text-[#667085]"}`}>{label}</button>)}</div>
        <div className="relative"><Search className="absolute left-3 top-2.5 size-4 text-[#98a2b3]" /><input value={query} onChange={(event) => setQuery(event.target.value)} className="focus-ring h-9 w-56 rounded-lg border border-[#d0d5dd] pl-9 pr-3 text-sm" placeholder="Search offers" /></div>
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[920px] text-left text-sm">
        <thead className="bg-[#f9fafb] text-[11px] font-semibold uppercase tracking-[.05em] text-[#667085]"><tr><th className="px-5 py-3">Product / merchant</th><th className="px-3 py-3">Total</th><th className="px-3 py-3">Delivery</th><th className="px-3 py-3">Seller</th><th className="px-3 py-3">Returns</th><th className="px-3 py-3">Match</th><th className="px-3 py-3">Policy</th></tr></thead>
        <tbody className="divide-y divide-[#eaecf0]">{visible.map((offer) => {
          const evaluation = evaluationMap.get(offer.id);
          const total = offer.unitPriceCents * offer.quantity + offer.shippingCents;
          return <tr key={offer.id} className={decision?.selectedOfferId === offer.id ? "bg-[#f8faff]" : "hover:bg-[#fcfcfd]"}><td className="px-5 py-4"><p className="font-medium">{offer.productName}</p><p className="mt-1 text-xs text-[#667085]">{offer.merchant} · {offer.quantity} units</p></td><td className="tabular px-3 py-4 font-semibold">{formatMoney(total)}</td><td className="px-3 py-4">{new Date(`${offer.deliveryDate}T12:00:00`).toLocaleDateString()}</td><td className="px-3 py-4">{offer.sellerRating.toFixed(1)} ★</td><td className="px-3 py-4">{offer.returnDays} days</td><td className="px-3 py-4">{Math.round(offer.requirementMatch * 100)}%</td><td className="px-3 py-4">{!evaluation ? <Badge>Pending</Badge> : evaluation.compliant ? <Badge tone="success"><Check className="size-3" />Pass</Badge> : <div><Badge tone="danger"><CircleX className="size-3" />Reject</Badge><p className="mt-1 max-w-48 text-[10px] text-[#b42318]">{evaluation.violations[0]}</p></div>}</td></tr>;
        })}</tbody>
      </table></div>
    </Card>
    {decision && selectedOffer ? <Card className="border-[#b2ccff] bg-[#fbfcff]"><CardHeader><div><Badge tone="info" className="mb-2"><Sparkles className="size-3" />Recommended · {decision.totalScore}/100</Badge><CardTitle>{selectedOffer.productName}</CardTitle><p className="mt-1 text-sm text-[#667085]">{decision.explanation}</p></div><span className="tabular text-2xl font-semibold">{formatMoney(selectedOffer.unitPriceCents * selectedOffer.quantity + selectedOffer.shippingCents)}</span></CardHeader><CardContent><div className="flex justify-end"><Button size="lg" onClick={sendForApproval} disabled={pending}>Send for manager approval<ArrowRight /></Button></div></CardContent></Card> : null}
  </div>;
}
