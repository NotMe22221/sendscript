import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Ban,
  Check,
  CircleDollarSign,
  FileCheck2,
  Fingerprint,
  PackageSearch,
  Plus,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { ActivityTimeline } from "@/components/activity-timeline";
import { MetricCard } from "@/components/metric-card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRequestContext } from "@/lib/api/route";
import { getWorkspaceSnapshot } from "@/lib/data/workspace";
import { formatMoney } from "@/lib/format";

export default async function OverviewPage() {
  const workspace = await getWorkspaceSnapshot(await getRequestContext());
  const activeMission = workspace.missions.find((mission) => mission.status === "AWAITING_APPROVAL") ?? workspace.missions[0];
  const blockedTransaction = workspace.transactions.find((transaction) => transaction.status === "blocked");
  const successfulTransaction = workspace.transactions.find((transaction) => transaction.status === "succeeded");
  const missionId = activeMission?.id;
  const missionStage = activeMission?.status === "AWAITING_APPROVAL" || activeMission?.status === "POLICY_REVIEW" ? "review" : activeMission?.status === "DRAFT" || activeMission?.status === "ANALYZING" || activeMission?.status === "SOURCING" ? "source" : "execute";
  const authorizedCents = successfulTransaction?.amountCents ?? activeMission?.budgetCents ?? 0;
  return (
    <div className="page-enter">
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.14em] text-[#3157f6]"><span className="size-1.5 rounded-full bg-[#3157f6]" />Saturday, August 1</div>
          <h1 className="text-[32px] font-semibold leading-[1.08] tracking-[-.05em] text-[#111a2b] md:text-[40px]">Procurement, under control.</h1>
          <p className="mt-2.5 max-w-2xl text-sm leading-6 text-[#687386]">One auditable path from employee intent to a policy-safe payment.</p>
        </div>
        <Button asChild size="lg"><Link href="/missions/new"><Plus />New purchasing mission</Link></Button>
      </div>

      <section className="relative overflow-hidden rounded-[22px] border border-white/10 bg-[#07111f] text-white shadow-[0_24px_60px_rgba(7,17,31,.16)]">
        <div className="pointer-events-none absolute -right-24 -top-32 size-[470px] rounded-full bg-[#3157f6]/30 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 opacity-[.07] [background-image:linear-gradient(rgba(255,255,255,.55)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.55)_1px,transparent_1px)] [background-size:44px_44px]" />
        <div className="relative grid gap-8 p-6 md:p-8 xl:grid-cols-[1.15fr_.85fr] xl:p-9">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#79edae]/20 bg-[#79edae]/10 px-3 py-1.5 text-[11px] font-semibold text-[#8ff0b9]"><span className="size-1.5 rounded-full bg-[#6ce9a4] shadow-[0_0_0_4px_rgba(108,233,164,.12)]" />{workspace.mode === "live" ? "Shared workspace live" : "Judge preview loaded"}</span>
              <span className="rounded-full border border-white/10 bg-white/[.05] px-3 py-1.5 font-mono text-[10px] text-[#8397b0]">{activeMission?.reference ?? "NO MISSIONS"}</span>
            </div>
            <p className="mt-7 text-xs font-semibold uppercase tracking-[.15em] text-[#7898ff]">{workspace.organizationName} · active mission</p>
            <h2 className="mt-3 max-w-2xl text-[30px] font-semibold leading-[1.1] tracking-[-.045em] md:text-[38px]">{activeMission?.title ?? "Create your first purchasing mission"}</h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-[#9bacc1]">{activeMission ? `SpendScript is controlling ${workspace.offerCount} catalog offers against organization policy. Every member sees this same persisted status and audit trail.` : "Connect the shared stack, then turn an employee request into a controlled, auditable purchase."}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild variant="secondary" className="border-white bg-white !text-[#111a2b] shadow-none hover:bg-[#eef1ff]"><Link href={missionId ? `/missions/${missionId}/${missionStage}` : "/missions/new"}>{missionId ? "Open active mission" : "Create a mission"}<ArrowRight /></Link></Button>
              <Button asChild variant="ghost" className="border border-white/10 text-[#aebdd0] hover:bg-white/[.07] hover:text-white"><Link href="/settings">Manage shared stack</Link></Button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[.055] p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between"><div><p className="text-xs font-semibold text-white">Control chain</p><p className="mt-1 text-[11px] text-[#71869f]">Every step leaves an audit event</p></div><Fingerprint className="size-5 text-[#7898ff]" /></div>
            <div className="mt-5 space-y-2.5">
              {[
                [PackageSearch, `${workspace.offerCount} offers controlled`, `${workspace.compliantOfferCount} recorded as compliant`, "text-[#9bb0ff]", "bg-[#3157f6]/15"],
                [ShieldCheck, "Deterministic policy", "Ruleset v3 applied", "text-[#8ff0b9]", "bg-[#56d595]/10"],
                [Ban, blockedTransaction ? `${formatMoney(blockedTransaction.amountCents)} violation blocked` : "Violation proof pending", blockedTransaction ? "No funds moved" : "Run from Mission Control", "text-[#ffad9f]", "bg-[#e65a4f]/10"],
                [BadgeCheck, successfulTransaction ? `${formatMoney(successfulTransaction.amountCents)} completed` : "Valid checkout pending", successfulTransaction?.checkoutReference ?? "Awaiting authorization", "text-[#8ff0b9]", "bg-[#56d595]/10"],
              ].map(([Icon, title, detail, color, background]) => (
                <div key={String(title)} className="flex items-center gap-3 rounded-xl border border-white/[.07] bg-[#07111f]/35 p-3">
                  <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${background}`}><Icon className={`size-4 ${color}`} /></span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-white">{String(title)}</span><span className="mt-1 block text-[10px] text-[#71869f]">{String(detail)}</span></span>
                  <Check className="size-3.5 text-[#56d595]" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={PackageSearch} label="Controlled offers" value={String(workspace.offerCount)} detail={workspace.mode === "live" ? "Organization catalog records" : "Seeded catalog preview"} />
        <MetricCard icon={ShieldCheck} label="Policy-compliant" value={`${workspace.compliantOfferCount} / ${workspace.offerCount}`} detail="Every persisted rejection is explainable" />
        <MetricCard icon={CircleDollarSign} label="Mission budget" value={formatMoney(authorizedCents)} detail="Bound before payment authorization" />
        <MetricCard icon={Ban} label="Blocked violation" value={blockedTransaction ? formatMoney(blockedTransaction.amountCents) : "Pending"} detail={blockedTransaction ? "Threshold exceeded; no funds moved" : "Run the required guardrail proof"} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.3fr_.7fr]">
        <Card className="overflow-hidden">
          <CardHeader>
            <div><CardTitle>Mission requiring attention</CardTitle><p className="mt-1 text-xs text-[#687386]">{workspace.mode === "live" ? "Persisted organization workspace" : "Seeded Acme Labs judge preview"}</p></div>
            <Button asChild variant="secondary" size="sm"><Link href="/missions">All missions<ArrowRight /></Link></Button>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-[#e8ebe6] bg-[#f8f9f6] text-[10px] font-semibold uppercase tracking-[.1em] text-[#778294]"><tr><th className="px-5 py-3.5">Mission</th><th className="px-5 py-3.5">Owner</th><th className="px-5 py-3.5">Limit</th><th className="px-5 py-3.5">State</th><th className="px-5 py-3.5">Next control</th><th className="px-5 py-3.5" /></tr></thead>
              <tbody>{activeMission ?
                <tr className="group hover:bg-[#fafbf8]">
                  <td className="px-5 py-5"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl border border-[#dce2ff] bg-[#f0f2ff] text-[#3157f6]"><FileCheck2 className="size-[18px]" /></span><div><p className="font-semibold text-[#111a2b]">{activeMission.title}</p><p className="mt-1 font-mono text-[10px] text-[#8b95a5]">{activeMission.reference} / SHARED WORKSPACE</p></div></div></td>
                  <td className="px-5 py-5 text-[#526075]">{activeMission.owner}</td>
                  <td className="tabular px-5 py-5 font-semibold">{activeMission.budgetCents ? formatMoney(activeMission.budgetCents) : "Pending"}</td>
                  <td className="px-5 py-5"><StatusBadge status={activeMission.status} /></td>
                  <td className="px-5 py-5 text-[#687386]">{activeMission.status === "AWAITING_APPROVAL" ? "Manager approval" : "Continue workflow"}</td>
                  <td className="px-5 py-5 text-right"><Button asChild variant="ghost" size="sm"><Link href={`/missions/${activeMission.id}/${missionStage}`}>Review<ArrowRight /></Link></Button></td>
                </tr>
              : <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-[#687386]">No missions yet. Create the first shared purchasing mission.</td></tr>}</tbody>
            </table>
          </div>
          <div className="flex items-center gap-2 border-t border-[#e8ebe6] bg-[#fafbf8] px-5 py-3 text-[11px] text-[#7d8797]"><Sparkles className="size-3.5 text-[#3157f6]" />{workspace.mode === "live" ? "All values come from your organization-scoped Supabase workspace." : "Preview values map to the controlled demo catalog."}</div>
        </Card>

        <Card>
          <CardHeader><div><CardTitle>Audit pulse</CardTitle><p className="mt-1 text-xs text-[#687386]">Latest shared events</p></div>{missionId && <Button variant="ghost" size="sm" asChild><Link href={`/missions/${missionId}/execute`}>Inspect<ArrowRight /></Link></Button>}</CardHeader>
          <CardContent>{workspace.events.length ? <ActivityTimeline events={workspace.events.slice(0, 5)} compact /> : <p className="py-5 text-sm text-[#687386]">No activity events yet.</p>}</CardContent>
        </Card>
      </div>
    </div>
  );
}
