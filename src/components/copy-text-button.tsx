"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CopyTextButton({ value, label = "Copy reference" }: { value: string; label?: string }) {
  return <Button variant="secondary" size="sm" onClick={async () => { await navigator.clipboard.writeText(value); toast.success("Copied to clipboard"); }}><Copy />{label}</Button>;
}
