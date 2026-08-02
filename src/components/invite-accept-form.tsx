"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function InviteAcceptForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const valid = password.length >= 12 && password === confirmation;
  return <form className="space-y-5" onSubmit={async (event) => { event.preventDefault(); if (!valid) return; setPending(true); try { const response = await fetch("/api/auth/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) }); const payload = await response.json(); if (!payload.ok) throw new Error(payload.error.message); toast.success("Account ready", { description: "You now have access to the shared organization workspace." }); router.push("/overview"); router.refresh(); } catch (error) { toast.error(error instanceof Error ? error.message : "Password could not be saved"); setPending(false); } }}>
    <div><Label htmlFor="new-password">Create password</Label><Input id="new-password" type="password" autoComplete="new-password" minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 12 characters" /></div>
    <div><Label htmlFor="confirm-password">Confirm password</Label><Input id="confirm-password" type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></div>
    <p className="flex gap-2 text-xs leading-5 text-[#667085]"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#155eef]" />Your account joins the organization workspace. Provider credentials remain server-only.</p>
    <Button type="submit" size="lg" className="w-full" disabled={!valid || pending}>{pending ? <LoaderCircle className="animate-spin" /> : <Check />}Finish account setup</Button>
  </form>;
}
