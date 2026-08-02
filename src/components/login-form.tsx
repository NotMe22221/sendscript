"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({ configured, demoEmail }: { configured: boolean; demoEmail: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(demoEmail);
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!configured) {
      router.push("/overview");
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = await response.json();
      if (!payload.ok) throw new Error(payload.error?.message ?? "Could not sign in");
      router.replace("/overview");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sign in");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div><Label htmlFor="email">Work email</Label><Input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
      <div><div className="flex items-center justify-between"><Label htmlFor="password">Password</Label><button type="button" className="mb-1.5 text-xs font-semibold text-[#155eef]">Forgot password?</button></div><Input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={configured ? "Enter your password" : "Not needed in preview"} required={configured} /></div>
      <Button type="submit" size="lg" className="mt-2 w-full">{pending ? <LoaderCircle className="animate-spin" /> : null}{configured ? "Sign in" : "Open configuration preview"}<ArrowRight /></Button>
      {!configured && <p className="rounded-lg border border-[#fedf89] bg-[#fffaeb] px-3 py-2.5 text-xs leading-5 text-[#93370d]">Supabase is not connected. Preview mode uses the same seeded Acme Labs records but does not claim authenticated persistence.</p>}
    </form>
  );
}
