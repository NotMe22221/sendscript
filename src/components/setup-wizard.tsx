"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Database,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  WalletCards,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Service = "supabase" | "openai" | "prava";
type TestResult = { connected: boolean; message: string; schemaReady?: boolean; modelAccessible?: boolean; suggestedModel?: string; customerReady?: boolean; cardCount?: number };
type ProvisioningResult = { judgeReady: boolean; workspaceReady: boolean; message: string };

const services = [
  { id: "supabase" as const, eyebrow: "01 · Data & identity", short: "Data & identity", title: "Connect Supabase", description: "Your authenticated workspace, policies, missions, and immutable audit history.", icon: Database, href: "https://supabase.com/dashboard" },
  { id: "openai" as const, eyebrow: "02 · Structured intelligence", short: "Structured intelligence", title: "Connect OpenAI", description: "Turns natural-language requests and policies into typed, reviewable structures.", icon: Sparkles, href: "https://platform.openai.com/api-keys" },
  { id: "prava" as const, eyebrow: "03 · Controlled payments", short: "Controlled payments", title: "Connect Prava sandbox", description: "Creates merchant-scoped authorizations and proves over-limit payments are blocked.", icon: WalletCards, href: "https://dashboard.prava.space" },
];

function serviceReady(service: Service, result?: TestResult) {
  if (!result?.connected) return false;
  if (service === "openai") return result.modelAccessible === true;
  if (service === "prava") return result.customerReady === true;
  return true;
}

async function readApiPayload(response: Response) {
  const body = await response.text();
  try {
    return JSON.parse(body) as {
      ok: boolean;
      data?: { services?: Record<Service, TestResult>; provisioning?: ProvisioningResult } & TestResult;
      error?: { message?: string; services?: Record<Service, TestResult> };
    };
  } catch {
    throw new Error(response.ok
      ? "The setup server returned an unreadable response. Refresh the page and try again."
      : `The setup server returned status ${response.status}. Refresh the page and try again.`);
  }
}

function SecretField({ id, label, value, placeholder, onChange }: { id: string; label: string; value: string; placeholder: string; onChange: (value: string) => void }) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input id={id} type={visible ? "text" : "password"} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} autoComplete="off" className="h-11 pr-11 font-mono text-xs" />
        <button type="button" onClick={() => setVisible((current) => !current)} className="focus-ring absolute right-2 top-1.5 grid size-8 place-items-center rounded-md text-[#687386] hover:bg-[#eef0ec]" aria-label={visible ? `Hide ${label}` : `Show ${label}`}>
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  );
}

export function SetupWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [testing, setTesting] = useState<Service | "save" | null>(null);
  const [results, setResults] = useState<Partial<Record<Service, TestResult>>>({});
  const [saved, setSaved] = useState(false);
  const [provisioning, setProvisioning] = useState<ProvisioningResult | null>(null);
  const [values, setValues] = useState({
    supabase: { url: "", publishableKey: "", serviceRoleKey: "", demoEmail: "judge@spendscript.dev", demoPassword: "" },
    openai: { apiKey: "", model: "gpt-5.6" },
    prava: { baseUrl: "https://sandbox.api.prava.space", secretKey: "", publishableKey: "", customerId: "" },
  });

  const current = services[step];
  const completion = useMemo(() => services.filter((service) => serviceReady(service.id, results[service.id])).length, [results]);

  function update<S extends Service, K extends keyof typeof values[S]>(service: S, key: K, value: (typeof values[S])[K]) {
    setValues((currentValues) => ({ ...currentValues, [service]: { ...currentValues[service], [key]: value } }));
    setResults((currentResults) => ({ ...currentResults, [service]: undefined }));
  }

  async function test(service: Service) {
    setTesting(service);
    try {
      const response = await fetch("/api/setup/environment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "test", service, values: values[service] }) });
      const payload = await readApiPayload(response);
      if (!payload.ok || !payload.data) {
        const failure = payload.error?.services?.[service] ?? { connected: false, message: payload.error?.message ?? "Connection test failed" };
        setResults((currentResults) => ({ ...currentResults, [service]: failure }));
        throw new Error(failure.message);
      }
      const result = payload.data;
      setResults((currentResults) => ({ ...currentResults, [service]: result }));
      if (serviceReady(service, result)) toast.success(`${services.find((item) => item.id === service)?.title.replace("Connect ", "")} ready`, { description: result.message });
      else toast.error("Connection needs attention", { description: result.message });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Check the values and try again.";
      setResults((currentResults) => currentResults[service]
        ? currentResults
        : { ...currentResults, [service]: { connected: false, message } });
      toast.error("Could not test this connection", { description: error instanceof Error ? error.message : "Check the values and try again." });
    } finally {
      setTesting(null);
    }
  }

  async function save() {
    setTesting("save");
    try {
      const response = await fetch("/api/setup/environment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save", values }) });
      const payload = await readApiPayload(response);
      if (!payload.ok) {
        if (payload.error?.services) setResults(payload.error.services);
        throw new Error(payload.error?.message ?? "Could not save connections");
      }
      if (!payload.data?.services || !payload.data.provisioning) throw new Error("The setup server returned an incomplete save response. Try again.");
      setResults(payload.data.services);
      setProvisioning(payload.data.provisioning);
      setSaved(true);
      toast.success("Connections saved securely", { description: payload.data.provisioning?.message ?? "SpendScript is now using your local environment." });
    } catch (error) {
      toast.error("Setup is not complete yet", { description: error instanceof Error ? error.message : "Review each connection." });
    } finally {
      setTesting(null);
    }
  }

  async function copyMigration() {
    try {
      const response = await fetch("/api/setup/migration", { cache: "no-store" });
      if (!response.ok) throw new Error("Migration could not be loaded");
      await navigator.clipboard.writeText(await response.text());
      toast.success("Migration SQL copied", { description: "Paste it into the Supabase SQL editor and click Run." });
    } catch {
      toast.error("Could not copy the migration", { description: "Open supabase/migrations/202608010001_initial_schema.sql manually." });
    }
  }

  if (saved) {
    const schemaReady = results.supabase?.schemaReady;
    const judgeReady = schemaReady && provisioning?.judgeReady;
    return (
      <main className="min-h-screen bg-[#07111f] p-4 sm:p-7">
        <div className="mx-auto grid min-h-[calc(100vh-3.5rem)] max-w-6xl place-items-center overflow-hidden rounded-[28px] border border-white/10 bg-[#0b1728] shadow-2xl">
          <div className="relative max-w-xl px-6 py-16 text-center text-white">
            <div className="absolute left-1/2 top-1/2 size-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#3157f6]/20 blur-3xl" />
            <div className="relative">
              <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#d9ffdc] text-[#087443] shadow-[0_0_0_8px_rgba(217,255,220,.08)]"><Check className="size-8" /></span>
              <p className="mt-7 text-xs font-semibold uppercase tracking-[.16em] text-[#8ca8ff]">Local stack connected</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-[-.05em]">{judgeReady ? "Your judge workspace is ready." : "The secure connections are saved."}</h1>
              <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-[#9fb0c7]">Your credentials were saved to the ignored local environment file and were never returned to the browser.</p>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">{services.map((service) => { const ready = serviceReady(service.id, results[service.id]); const pending = service.id === "prava" && results.prava?.connected && !results.prava.customerReady; return <div key={service.id} className="rounded-xl border border-white/10 bg-white/[.04] p-4 text-left"><service.icon className="size-4 text-[#8ca8ff]" /><p className="mt-3 text-sm font-semibold capitalize">{service.id}</p><p className="mt-1 text-xs text-[#7f93ad]">{ready ? "Ready" : pending ? "Card enrollment pending" : "Needs attention"}</p></div>; })}</div>
              {!schemaReady ? (
                <div className="mt-6 rounded-xl border border-[#ffca68]/25 bg-[#ffca68]/10 p-4 text-left text-sm text-[#ffe2a7]">
                  <strong>One database step remains.</strong>
                  <p className="mt-1 text-xs leading-5 text-[#d5bd8f]">Copy the migration, paste it in Supabase SQL Editor, click Run, then return and save once more. SpendScript will create Acme Labs, the catalog, and your judge login automatically.</p>
                  <div className="mt-3 flex flex-wrap gap-2"><Button variant="secondary" onClick={copyMigration}><Copy />Copy migration SQL</Button><Button asChild variant="secondary"><a href="https://supabase.com/dashboard/project/_/sql" target="_blank" rel="noreferrer">Open SQL editor<ExternalLink /></a></Button></div>
                </div>
              ) : provisioning && !provisioning.judgeReady ? (
                <div className="mt-6 rounded-xl border border-[#ffca68]/25 bg-[#ffca68]/10 p-4 text-left text-sm text-[#ffe2a7]"><strong>The providers are connected, but judge data needs a retry.</strong><p className="mt-1 text-xs leading-5 text-[#d5bd8f]">{provisioning.message}</p></div>
              ) : null}
              <div className="mt-8 flex flex-wrap justify-center gap-3"><Button variant="secondary" onClick={() => { setSaved(false); setStep(0); }}>Review or retry</Button><Button size="lg" onClick={() => router.push(judgeReady ? "/login?configured=1" : "/setup")}>{judgeReady ? "Continue to sign in" : "Return to setup"}<ArrowRight /></Button></div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#eef0eb] p-0 sm:p-4 lg:p-6">
      <div className="mx-auto grid min-h-screen max-w-[1480px] overflow-hidden bg-white sm:min-h-[calc(100vh-2rem)] sm:rounded-[28px] sm:border sm:border-[#dfe3dc] sm:shadow-[0_28px_80px_rgba(18,28,45,.12)] lg:grid-cols-[minmax(0,.78fr)_minmax(0,1.22fr)]">
        <aside className="relative overflow-hidden bg-[#07111f] px-6 py-7 text-white sm:px-9 lg:flex lg:flex-col lg:px-12 lg:py-10">
          <div className="absolute -right-44 -top-24 size-[520px] rounded-full bg-[#3157f6]/25 blur-3xl" />
          <div className="absolute inset-0 opacity-[.08] [background-image:linear-gradient(rgba(255,255,255,.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.5)_1px,transparent_1px)] [background-size:42px_42px]" />
          <div className="relative flex items-center justify-between"><BrandMark inverted /><Link href="/overview" className="focus-ring rounded-lg px-3 py-2 text-xs font-medium text-[#91a4bd] hover:bg-white/[.06] hover:text-white"><ArrowLeft className="mr-1.5 inline size-3.5" />Back to app</Link></div>
          <div className="relative mt-16 hidden lg:block"><p className="text-xs font-semibold uppercase tracking-[.16em] text-[#7898ff]">Secure local setup</p><h1 className="mt-4 max-w-md text-[44px] font-semibold leading-[1.06] tracking-[-.055em]">Connect the stack.<br /><span className="text-[#9bb0ff]">Keep the secrets local.</span></h1><p className="mt-5 max-w-md text-sm leading-7 text-[#91a4bd]">Paste keys here—not into chat. SpendScript tests each provider, saves them to your ignored local environment file, and never displays them again.</p></div>
          <div className="relative mt-8 space-y-2 lg:mt-auto">{services.map((service, index) => { const active = index === step; const done = serviceReady(service.id, results[service.id]); return <button type="button" key={service.id} onClick={() => setStep(index)} className={cn("focus-ring flex w-full items-center gap-4 rounded-xl border p-3.5 text-left transition-all", active ? "border-white/15 bg-white/[.08]" : "border-transparent hover:bg-white/[.04]")}><span className={cn("grid size-9 shrink-0 place-items-center rounded-lg border", done ? "border-[#5fe39b]/30 bg-[#5fe39b]/10 text-[#7af0ad]" : active ? "border-[#7898ff]/35 bg-[#3157f6]/20 text-[#9bb0ff]" : "border-white/10 text-[#657a95]")}>{done ? <Check className="size-4" /> : <service.icon className="size-4" />}</span><span className="flex-1"><span className={cn("block text-sm font-semibold", active ? "text-white" : "text-[#9aabc0]")}>{service.title}</span><span className="mt-0.5 block text-xs text-[#60748e]">{done ? "Connection verified" : service.short}</span></span><span className="font-mono text-[11px] text-[#4f647e]">0{index + 1}</span></button>; })}</div>
          <div className="relative mt-7 hidden items-center gap-2 text-xs text-[#60748e] lg:flex"><LockKeyhole className="size-3.5" />Secrets stay on this machine</div>
        </aside>

        <section className="flex min-w-0 items-center justify-center overflow-hidden px-5 py-9 sm:px-10 lg:px-12 lg:py-12">
          <div className="w-full max-w-[670px]">
            <div className="mb-8 flex min-w-0 items-start justify-between gap-4"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[.14em] text-[#3157f6]">{current.eyebrow}</p><h2 className="mt-2 text-[30px] font-semibold tracking-[-.045em] text-[#111a2b] sm:text-[36px]">{current.title}</h2><p className="mt-2 max-w-xl text-sm leading-6 text-[#687386]">{current.description}</p></div><a href={current.href} target="_blank" rel="noreferrer" className="focus-ring mt-1 shrink-0 rounded-lg border border-[#d9ddd6] px-3 py-2 text-xs font-semibold text-[#475467] hover:bg-[#f5f6f3]">Get keys<ExternalLink className="ml-1.5 inline size-3" /></a></div>

            <div className="rounded-2xl border border-[#dfe3dc] bg-[#fbfcfa] p-5 sm:p-7">
              {current.id === "supabase" ? <div className="space-y-5"><div><Label htmlFor="supabase-url">Project URL</Label><Input id="supabase-url" type="url" className="h-11" value={values.supabase.url} onChange={(event) => update("supabase", "url", event.target.value)} placeholder="https://your-project.supabase.co" /></div><SecretField id="supabase-publishable" label="Publishable key" value={values.supabase.publishableKey} onChange={(value) => update("supabase", "publishableKey", value)} placeholder="sb_publishable_… or legacy anon JWT" /><SecretField id="supabase-service" label="Secret or service-role key" value={values.supabase.serviceRoleKey} onChange={(value) => update("supabase", "serviceRoleKey", value)} placeholder="sb_secret_… or legacy service_role JWT" /><div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="demo-email">Judge email</Label><Input id="demo-email" type="email" className="h-11" value={values.supabase.demoEmail} onChange={(event) => update("supabase", "demoEmail", event.target.value)} /></div><SecretField id="demo-password" label="Judge password" value={values.supabase.demoPassword} onChange={(value) => update("supabase", "demoPassword", value)} placeholder="10+ characters" /></div><p className="text-xs leading-5 text-[#687386]">Use both keys from this exact project. Saving creates or repairs the judge account and loads the Acme Labs workspace after the migration exists.</p></div> : null}
              {current.id === "openai" ? <div className="space-y-5"><SecretField id="openai-key" label="Project API key" value={values.openai.apiKey} onChange={(value) => update("openai", "apiKey", value)} placeholder="sk-proj-…" /><div><Label htmlFor="openai-model">Structured-output model</Label><Input id="openai-model" className="h-11 font-mono text-sm" value={values.openai.model} onChange={(event) => update("openai", "model", event.target.value)} /><p className="mt-2 text-xs leading-5 text-[#687386]">Use the model enabled for your project. SpendScript defaults to gpt-5.6 and never sends payment data.</p></div><div className="flex gap-3 rounded-xl border border-[#c9d5ff] bg-[#f2f5ff] p-4"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-[#3157f6]" /><div><p className="text-sm font-semibold text-[#233c91]">The model cannot approve spending</p><p className="mt-1 text-xs leading-5 text-[#53669f]">It extracts typed requirements and explanations only. Budgets, merchants, approvals, and expiry remain deterministic.</p></div></div></div> : null}
              {current.id === "prava" ? <div className="space-y-5"><div><Label htmlFor="prava-base">Sandbox API URL</Label><Input id="prava-base" className="h-11 font-mono text-xs" value={values.prava.baseUrl} onChange={(event) => update("prava", "baseUrl", event.target.value)} /></div><div className="grid gap-4 sm:grid-cols-2"><SecretField id="prava-secret" label="Secret key" value={values.prava.secretKey} onChange={(value) => update("prava", "secretKey", value)} placeholder="sk_test_…" /><SecretField id="prava-publishable" label="Publishable key" value={values.prava.publishableKey} onChange={(value) => update("prava", "publishableKey", value)} placeholder="pk_test_…" /></div><div><Label htmlFor="prava-customer">Sandbox customer ID</Label><Input id="prava-customer" className="h-11 font-mono text-sm" value={values.prava.customerId} onChange={(event) => update("prava", "customerId", event.target.value)} placeholder="Customer used when enrolling the test card" /></div><div className="flex gap-3 rounded-xl border border-[#bfe7d1] bg-[#effaf3] p-4"><WalletCards className="mt-0.5 size-5 shrink-0 text-[#087443]" /><div><p className="text-sm font-semibold text-[#095c38]">Sandbox only—no real money moves</p><p className="mt-1 text-xs leading-5 text-[#47725e]">Hosted approval still uses a device passkey. SpendScript stores only safe card and mandate metadata.</p></div></div></div> : null}
            </div>

            {results[current.id] ? <div className={cn("mt-4 flex gap-3 rounded-xl border p-4", serviceReady(current.id, results[current.id]) ? "border-[#bfe7d1] bg-[#effaf3]" : "border-[#f2c7c3] bg-[#fff4f2]")}>{serviceReady(current.id, results[current.id]) ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[#087443]" /> : <XCircle className="mt-0.5 size-5 shrink-0 text-[#c43225]" />}<div className="flex-1"><p className={cn("text-sm font-semibold", serviceReady(current.id, results[current.id]) ? "text-[#095c38]" : "text-[#922b22]")}>{serviceReady(current.id, results[current.id]) ? "Connection ready" : current.id === "prava" && results.prava?.connected ? "Connected · enrollment pending" : "Connection not ready"}</p><p className="mt-1 text-xs leading-5 text-[#687386]">{results[current.id]?.message}</p>{current.id === "openai" && results.openai?.suggestedModel ? <Button variant="secondary" className="mt-3" onClick={() => update("openai", "model", results.openai?.suggestedModel ?? "")}>Use {results.openai.suggestedModel}</Button> : null}</div></div> : null}

            {current.id === "supabase" && results.supabase?.connected && !results.supabase.schemaReady ? <div className="mt-3 rounded-xl border border-[#f0d49b] bg-[#fff9ec] p-4"><p className="text-sm font-semibold text-[#78510a]">Your keys are correct. One database step remains.</p><p className="mt-1 text-xs leading-5 text-[#806b43]">Copy the migration, paste it into this project’s Supabase SQL Editor, and click Run. Then return here and test Supabase again.</p><div className="mt-3 flex flex-wrap gap-2"><Button variant="secondary" onClick={copyMigration}><Copy />Copy migration SQL</Button><Button asChild variant="secondary"><a href="https://supabase.com/dashboard/project/_/sql" target="_blank" rel="noreferrer">Open SQL editor<ExternalLink /></a></Button></div></div> : null}

            <div className="mt-7 flex flex-col-reverse justify-between gap-3 sm:flex-row sm:items-center"><div className="flex items-center gap-2 text-xs text-[#98a2b3]"><KeyRound className="size-3.5" />{completion}/3 verified</div><div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => test(current.id)} disabled={Boolean(testing)}>{testing === current.id ? <LoaderCircle className="animate-spin" /> : <ShieldCheck />}Test connection</Button>{step < services.length - 1 ? <Button onClick={() => setStep((index) => index + 1)}>Next<ArrowRight /></Button> : <Button onClick={save} disabled={Boolean(testing)}>{testing === "save" ? <LoaderCircle className="animate-spin" /> : <LockKeyhole />}Test, save &amp; prepare judge login</Button>}</div></div>
            <div className="mt-8 flex items-center justify-center gap-2 text-[11px] text-[#98a2b3]"><span className="h-px w-12 bg-[#dfe3dc]" /><span>Sent only to this localhost server and never echoed back</span><span className="h-px w-12 bg-[#dfe3dc]" /></div>
          </div>
        </section>
      </div>
    </main>
  );
}
