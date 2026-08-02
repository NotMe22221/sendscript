import type { Metadata } from "next";
import { ArrowUpRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { LoginForm } from "@/components/login-form";
import { readiness } from "@/lib/config";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden overflow-hidden bg-[#0c2449] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="surface-grid absolute inset-0 opacity-20" />
        <div className="absolute -right-28 top-20 size-[420px] rounded-full bg-[#155eef]/25 blur-3xl" />
        <div className="relative"><BrandMark className="[&_span:last-child]:text-white" /></div>
        <div className="relative max-w-xl">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-[#d1e0ff]"><ShieldCheck className="size-3.5" />Policy-controlled agentic commerce</div>
          <h1 className="text-5xl font-semibold leading-[1.08] tracking-[-.05em]">Let agents buy.<br /><span className="text-[#84adff]">Keep finance in control.</span></h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-[#b2ccff]">SpendScript turns procurement policy into executable controls—from a natural-language request to a merchant-scoped Prava mandate and an immutable audit record.</p>
          <div className="mt-10 grid grid-cols-3 gap-4">
            {["Deterministic policy", "Manager approval", "Network-level limits"].map((item) => <div key={item} className="rounded-xl border border-white/10 bg-white/[.06] p-4 text-sm text-[#d1e0ff]"><CheckCircle2 className="mb-3 size-4 text-[#84adff]" />{item}</div>)}
          </div>
        </div>
        <p className="relative text-xs text-[#84adff]">Built for the Agentic Commerce Hackathon <ArrowUpRight className="ml-1 inline size-3" /></p>
      </section>
      <section className="flex items-center justify-center px-5 py-12 sm:px-12">
        <div className="w-full max-w-[420px]">
          <BrandMark className="mb-12 lg:hidden" />
          <p className="mb-2 text-xs font-semibold uppercase tracking-[.09em] text-[#155eef]">Acme Labs workspace</p>
          <h2 className="text-[32px] font-semibold tracking-[-.04em]">Welcome back</h2>
          <p className="mb-8 mt-2 text-sm leading-6 text-[#667085]">Sign in to review purchasing missions, authorizations, and audit trails.</p>
          <LoginForm configured={readiness.supabase} demoEmail={process.env.DEMO_EMAIL ?? "judge@spendscript.dev"} />
          <p className="mt-8 text-center text-xs text-[#98a2b3]">Protected by organization-scoped access controls</p>
        </div>
      </section>
    </main>
  );
}
