"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  Database,
  Eye,
  EyeOff,
  Fingerprint,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  MailPlus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  WalletCards,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { IntegrationOverview, IntegrationProvider, IntegrationStatus } from "@/lib/integrations/shared";

const providerDesign = {
  supabase: { icon: Database, eyebrow: "Shared data & identity", accent: "#15945a", soft: "#edfaf2" },
  openai: { icon: Sparkles, eyebrow: "Structured intelligence", accent: "#3157f6", soft: "#eef1ff" },
  prava: { icon: WalletCards, eyebrow: "Controlled payments", accent: "#6246d8", soft: "#f3f0ff" },
};

function SecretField({ id, label, value, onChange, placeholder }: { id: string; label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input id={id} type={visible ? "text" : "password"} autoComplete="off" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-11 pr-11 font-mono text-xs" />
        <button type="button" onClick={() => setVisible((current) => !current)} aria-label={visible ? `Hide ${label}` : `Show ${label}`} className="focus-ring absolute right-2 top-1.5 grid size-8 place-items-center rounded-lg text-[#687386] hover:bg-[#eef0ec]">{visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
      </div>
    </div>
  );
}

function sourceLabel(service: IntegrationStatus) {
  if (!service.connected) return "Not connected";
  if (service.source === "organization") return "Organization shared";
  return "Deployment shared";
}

export function IntegrationCenter({ initial }: { initial: IntegrationOverview }) {
  const [overview, setOverview] = useState(initial);
  const [activeProvider, setActiveProvider] = useState<IntegrationProvider | null>(null);
  const [pending, setPending] = useState<IntegrationProvider | "migration" | "invite" | null>(null);
  const [openai, setOpenai] = useState({ apiKey: "", model: "gpt-5.6" });
  const [prava, setPrava] = useState({ baseUrl: "https://sandbox.api.prava.space", secretKey: "", publishableKey: "", customerId: "" });
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState({ fullName: "", email: "", role: "member" as "admin" | "manager" | "member" });

  async function inviteMember() {
    setPending("invite");
    try {
      const response = await fetch("/api/team/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(invite) });
      const payload = await response.json();
      if (!payload.ok) throw new Error(payload.error?.message ?? "Invitation could not be sent");
      setOverview(payload.data);
      setInvite({ fullName: "", email: "", role: "member" });
      setInviteOpen(false);
      toast.success("Teammate invited", { description: `${payload.data.memberCount} accounts now share ${payload.data.organizationName}.` });
    } catch (error) {
      toast.error("Invitation was not sent", { description: error instanceof Error ? error.message : "Check Supabase Auth email settings." });
    } finally {
      setPending(null);
    }
  }

  async function connect(provider: IntegrationProvider) {
    setPending(provider);
    try {
      const response = await fetch(`/api/integrations/${provider}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(provider === "openai" ? openai : prava) });
      const payload = await response.json();
      if (!payload.ok) throw new Error(payload.error?.message ?? "Connection could not be saved");
      setOverview(payload.data);
      setActiveProvider(null);
      if (provider === "openai") setOpenai((current) => ({ ...current, apiKey: "" }));
      else setPrava((current) => ({ ...current, secretKey: "", publishableKey: "" }));
      toast.success(`${provider === "openai" ? "OpenAI" : "Prava sandbox"} shared`, { description: `All ${payload.data.memberCount} organization member${payload.data.memberCount === 1 ? "" : "s"} now use this connection.` });
    } catch (error) {
      toast.error("Connection was not changed", { description: error instanceof Error ? error.message : "Check the provider values." });
    } finally {
      setPending(null);
    }
  }

  async function disconnect(provider: IntegrationProvider) {
    setPending(provider);
    try {
      const response = await fetch(`/api/integrations/${provider}`, { method: "DELETE" });
      const payload = await response.json();
      if (!payload.ok) throw new Error(payload.error?.message ?? "Connection could not be removed");
      setOverview(payload.data);
      toast.success(`${provider === "openai" ? "OpenAI" : "Prava sandbox"} disconnected for ${payload.data.organizationName}`);
    } catch (error) {
      toast.error("Connection was not removed", { description: error instanceof Error ? error.message : "Try again." });
    } finally {
      setPending(null);
    }
  }

  async function copyMigration() {
    setPending("migration");
    try {
      const response = await fetch("/api/integrations/migration", { cache: "no-store" });
      if (!response.ok) throw new Error("Migration could not be loaded");
      await navigator.clipboard.writeText(await response.text());
      toast.success("Shared integration migration copied", { description: "Run it once in the Supabase SQL Editor, then refresh this page." });
    } catch (error) {
      toast.error("Could not copy migration", { description: error instanceof Error ? error.message : "Open the migration file manually." });
    } finally {
      setPending(null);
    }
  }

  async function refresh() {
    const response = await fetch("/api/integrations", { cache: "no-store" });
    const payload = await response.json();
    if (payload.ok) { setOverview(payload.data); toast.success("Shared connection status refreshed"); }
    else toast.error(payload.error?.message ?? "Could not refresh status");
  }

  const connectedCount = overview.services.filter((service) => service.connected).length;

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[22px] border border-white/10 bg-[#07111f] p-6 text-white shadow-[0_20px_50px_rgba(7,17,31,.14)] md:p-7">
        <div className="pointer-events-none absolute -right-20 -top-28 size-80 rounded-full bg-[#3157f6]/25 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="flex items-start gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[.06] text-[#9bb0ff]"><Building2 className="size-5" /></span><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold tracking-[-.025em]">{overview.organizationName}</h2><Badge tone={overview.canManage ? "info" : "neutral"}>{overview.role}</Badge></div><p className="mt-1.5 max-w-2xl text-sm leading-6 text-[#91a4bd]">One encrypted provider configuration serves every authenticated member. Secret values can be replaced, but never viewed again.</p></div></div>
          <div className="flex shrink-0 items-center gap-5 rounded-xl border border-white/[.08] bg-white/[.045] px-4 py-3"><div><p className="font-mono text-xl font-semibold">{connectedCount}/3</p><p className="text-[10px] uppercase tracking-[.12em] text-[#71869f]">stack online</p></div><span className="h-9 w-px bg-white/10" /><div><p className="flex items-center gap-2 text-sm font-semibold"><Users className="size-4 text-[#8ca8ff]" />{overview.memberCount}</p><p className="text-[10px] uppercase tracking-[.12em] text-[#71869f]">shared members</p></div></div>
        </div>
      </section>

      {!overview.services[0]?.connected ? <Card className="border-[#e7c989] bg-[#fffaf0]"><CardContent className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center"><div className="flex gap-3"><KeyRound className="mt-0.5 size-5 shrink-0 text-[#946200]" /><div><p className="text-sm font-semibold text-[#704b00]">Bootstrap the shared Supabase workspace first</p><p className="mt-1 text-xs leading-5 text-[#8b6a28]">Supabase is the identity and organization boundary. Once connected, administrators can save OpenAI and Prava here for every account.</p></div></div><Button asChild><Link href="/setup">Connect Supabase<ArrowRight /></Link></Button></CardContent></Card> : null}

      {overview.services[0]?.connected && !overview.sharedSchemaReady ? <Card className="border-[#e7c989] bg-[#fffaf0]"><CardContent className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center"><div className="flex gap-3"><Fingerprint className="mt-0.5 size-5 shrink-0 text-[#946200]" /><div><p className="text-sm font-semibold text-[#704b00]">Install encrypted shared integrations</p><p className="mt-1 text-xs leading-5 text-[#8b6a28]">Run the one-time migration in Supabase. It adds encrypted provider storage, admin-only server writes, and an immutable connection audit.</p></div></div>{overview.canManage ? <Button variant="secondary" onClick={copyMigration} disabled={pending === "migration"}>{pending === "migration" ? <LoaderCircle className="animate-spin" /> : <Copy />}Copy migration SQL</Button> : null}</CardContent></Card> : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {overview.services.map((service) => {
          const design = providerDesign[service.provider];
          const Icon = design.icon;
          const manageable = service.provider !== "supabase" && overview.canManage && overview.sharedSchemaReady;
          return (
            <Card key={service.provider} className="relative overflow-hidden">
              <span className="absolute inset-x-0 top-0 h-[3px]" style={{ backgroundColor: service.connected ? design.accent : "#dfe3dc" }} />
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3"><span className="grid size-10 place-items-center rounded-xl" style={{ color: design.accent, backgroundColor: design.soft }}><Icon className="size-[18px]" /></span><Badge tone={service.connected ? "success" : "warning"}>{service.connected ? <CheckCircle2 /> : <XCircle />}{service.connected ? "Connected" : "Required"}</Badge></div>
                <p className="mt-5 text-[10px] font-semibold uppercase tracking-[.13em] text-[#8b95a5]">{design.eyebrow}</p>
                <h3 className="mt-1.5 text-lg font-semibold tracking-[-.025em] text-[#111a2b]">{service.label}</h3>
                <p className="mt-2 min-h-10 text-xs leading-5 text-[#687386]">{service.detail}</p>
                <div className="mt-4 space-y-2 rounded-xl bg-[#f7f8f5] p-3 text-xs"><div className="flex items-center justify-between gap-3"><span className="text-[#7d8797]">Scope</span><strong>{sourceLabel(service)}</strong></div>{Object.entries(service.metadata).slice(0, 3).map(([key, value]) => <div key={key} className="flex items-center justify-between gap-3"><span className="capitalize text-[#7d8797]">{key.replace(/([A-Z])/g, " $1")}</span><strong className="max-w-[60%] truncate text-right">{String(value)}</strong></div>)}</div>
                <div className="mt-5 flex gap-2">{service.provider === "supabase" ? <Button asChild variant="secondary" className="w-full"><a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer">Deployment managed<LockKeyhole /></a></Button> : manageable ? <><Button className="flex-1" variant={service.connected ? "secondary" : "primary"} onClick={() => setActiveProvider(service.provider as IntegrationProvider)}>{service.connected ? <RefreshCw /> : <KeyRound />}{service.connected ? "Replace" : "Connect"}</Button>{service.connected ? <Dialog><DialogTrigger asChild><Button variant="ghost" size="icon" aria-label={`Disconnect ${service.label}`}><Trash2 /></Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Disconnect {service.label}?</DialogTitle><DialogDescription>All {overview.memberCount} organization member{overview.memberCount === 1 ? "" : "s"} will lose this provider immediately. No secret value will be retained in the organization override.</DialogDescription></DialogHeader><DialogFooter><Button variant="danger" onClick={() => disconnect(service.provider as IntegrationProvider)} disabled={pending === service.provider}>{pending === service.provider ? <LoaderCircle className="animate-spin" /> : <Trash2 />}Disconnect for everyone</Button></DialogFooter></DialogContent></Dialog> : null}</> : <div className="flex h-10 w-full items-center justify-center gap-2 rounded-[10px] border border-[#dfe3dc] bg-[#f7f8f5] text-xs font-medium text-[#7d8797]"><ShieldCheck className="size-4" />{overview.canManage ? "Migration required" : "Admin managed"}</div>}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.05fr_.95fr]">
        <Card><CardHeader><div><CardTitle>Organization access</CardTitle><p className="mt-1 text-xs text-[#687386]">Shared visibility without credential exposure</p></div>{overview.canManage && overview.services[0]?.connected ? <Dialog open={inviteOpen} onOpenChange={setInviteOpen}><DialogTrigger asChild><Button variant="secondary" size="sm"><MailPlus />Invite member</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Invite a teammate</DialogTitle><DialogDescription>Supabase emails a secure invitation. The new account joins {overview.organizationName} and immediately sees the same missions, policies, transactions, and provider health.</DialogDescription></DialogHeader><div className="space-y-4"><div><Label htmlFor="invite-name">Full name</Label><Input id="invite-name" value={invite.fullName} onChange={(event) => setInvite((current) => ({ ...current, fullName: event.target.value }))} /></div><div><Label htmlFor="invite-email">Work email</Label><Input id="invite-email" type="email" value={invite.email} onChange={(event) => setInvite((current) => ({ ...current, email: event.target.value }))} /></div><div><Label htmlFor="invite-role">Access role</Label><select id="invite-role" value={invite.role} onChange={(event) => setInvite((current) => ({ ...current, role: event.target.value as typeof current.role }))} className="focus-ring h-11 w-full rounded-[10px] border border-[#cfd5cc] bg-white px-3 text-sm"><option value="member">Member · run missions</option><option value="manager">Manager · approve spend</option><option value="admin">Admin · manage shared integrations</option></select></div></div><DialogFooter><Button variant="secondary" onClick={() => setInviteOpen(false)} disabled={pending === "invite"}>Cancel</Button><Button onClick={inviteMember} disabled={pending === "invite" || invite.fullName.trim().length < 2 || !invite.email.includes("@")} >{pending === "invite" ? <LoaderCircle className="animate-spin" /> : <MailPlus />}Send secure invite</Button></DialogFooter></DialogContent></Dialog> : <Users className="size-5 text-[#3157f6]" />}</CardHeader><CardContent className="space-y-3"><div className="flex items-center gap-3 rounded-xl border border-[#dfe3dc] p-4"><span className="grid size-9 place-items-center rounded-lg bg-[#eef1ff] text-[#3157f6]"><Check className="size-4" /></span><div><p className="text-sm font-semibold">Every member sees one shared workspace</p><p className="mt-1 text-xs text-[#687386]">Missions, policies, vendors, transactions, audit history, and safe provider status are organization-scoped.</p></div></div><div className="divide-y divide-[#e8ebe6] rounded-xl border border-[#dfe3dc]">{overview.members.map((member) => <div key={member.id} className="flex items-center gap-3 px-3.5 py-3"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#f0f2ff] text-xs font-semibold text-[#3157f6]">{member.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{member.name}</p><p className="truncate text-[11px] text-[#7d8797]">{member.email}</p></div><Badge tone={member.role === "admin" ? "info" : "neutral"}>{member.role}</Badge></div>)}</div><div className="flex items-center gap-3 rounded-xl border border-[#dfe3dc] p-4"><span className="grid size-9 place-items-center rounded-lg bg-[#edfaf2] text-[#15945a]"><LockKeyhole className="size-4" /></span><div><p className="text-sm font-semibold">Only server operations decrypt credentials</p><p className="mt-1 text-xs text-[#687386]">Members, managers, browser code, RLS queries, logs, and API responses never receive a raw key.</p></div></div>{!overview.canManage ? <div className="rounded-xl border border-[#e7c989] bg-[#fffaf0] p-4 text-xs leading-5 text-[#8b6a28]">{overview.services[0]?.connected ? `You have ${overview.role} access. You can inspect the shared stack, but only an organization administrator can replace or disconnect it.` : "Connect Supabase to activate organization roles, teammate invitations, and shared credential controls."}</div> : null}</CardContent></Card>

        <Card><CardHeader><div><CardTitle>Connection audit</CardTitle><p className="mt-1 text-xs text-[#687386]">Immutable, secret-free organization events</p></div><Button variant="ghost" size="sm" onClick={refresh}><RefreshCw />Refresh</Button></CardHeader><CardContent>{overview.audit.length ? <div className="space-y-4">{overview.audit.map((event) => <div key={event.id} className="flex gap-3"><span className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-[#f0f2ff] text-[#3157f6]"><Clock3 className="size-3.5" /></span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold capitalize">{event.provider} {event.action}</p><time className="font-mono text-[10px] text-[#9aa3b2]">{new Date(event.createdAt).toLocaleDateString()}</time></div><p className="mt-1 text-[11px] leading-5 text-[#687386]">{event.detail}</p></div></div>)}</div> : <div className="grid min-h-44 place-items-center rounded-xl border border-dashed border-[#cfd5cc] bg-[#fafbf8] p-5 text-center"><div><Fingerprint className="mx-auto size-6 text-[#9aa3b2]" /><p className="mt-3 text-sm font-semibold">No shared connection changes yet</p><p className="mt-1 text-xs text-[#7d8797]">The first admin connection will appear here for every member.</p></div></div>}</CardContent></Card>
      </div>

      <Dialog open={activeProvider !== null} onOpenChange={(open) => { if (!open && !pending) setActiveProvider(null); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{activeProvider === "openai" ? "Share OpenAI with the organization" : "Share Prava sandbox with the organization"}</DialogTitle><DialogDescription>The connection is tested first. On success, credentials are encrypted server-side and the raw values disappear from this browser.</DialogDescription></DialogHeader>
          {activeProvider === "openai" ? <div className="space-y-4"><SecretField id="shared-openai-key" label="OpenAI project API key" value={openai.apiKey} onChange={(apiKey) => setOpenai((current) => ({ ...current, apiKey }))} placeholder="sk-proj-…" /><div><Label htmlFor="shared-openai-model">Structured-output model</Label><Input id="shared-openai-model" value={openai.model} onChange={(event) => setOpenai((current) => ({ ...current, model: event.target.value }))} className="h-11 font-mono" /></div></div> : null}
          {activeProvider === "prava" ? <div className="space-y-4"><div><Label htmlFor="shared-prava-base">Sandbox API URL</Label><Input id="shared-prava-base" value={prava.baseUrl} onChange={(event) => setPrava((current) => ({ ...current, baseUrl: event.target.value }))} className="h-11 font-mono text-xs" /></div><div className="grid gap-4 sm:grid-cols-2"><SecretField id="shared-prava-secret" label="Secret key" value={prava.secretKey} onChange={(secretKey) => setPrava((current) => ({ ...current, secretKey }))} placeholder="sk_test_…" /><SecretField id="shared-prava-publishable" label="Publishable key" value={prava.publishableKey} onChange={(publishableKey) => setPrava((current) => ({ ...current, publishableKey }))} placeholder="pk_test_…" /></div><div><Label htmlFor="shared-prava-customer">Enrolled customer ID</Label><Input id="shared-prava-customer" value={prava.customerId} onChange={(event) => setPrava((current) => ({ ...current, customerId: event.target.value }))} className="h-11 font-mono" /></div></div> : null}
          <div className="mt-5 flex gap-3 rounded-xl border border-[#c9d5ff] bg-[#f2f5ff] p-4"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-[#3157f6]" /><p className="text-xs leading-5 text-[#53669f]">Saving replaces the organization connection atomically and writes a secret-free audit event. Existing values are never prefilled or revealed.</p></div>
          <DialogFooter><Button variant="secondary" onClick={() => setActiveProvider(null)} disabled={Boolean(pending)}>Cancel</Button><Button onClick={() => activeProvider && connect(activeProvider)} disabled={!activeProvider || Boolean(pending)}>{pending ? <LoaderCircle className="animate-spin" /> : <LockKeyhole />}Test and share with everyone</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
