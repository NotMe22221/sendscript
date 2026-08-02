"use client";

import { CircleAlert, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="grid min-h-[520px] place-items-center"><div className="max-w-md text-center"><span className="mx-auto grid size-12 place-items-center rounded-xl bg-[#fef3f2] text-[#d92d20]"><CircleAlert className="size-6" /></span><h1 className="mt-5 text-xl font-semibold">This view could not be loaded</h1><p className="mt-2 text-sm leading-6 text-[#667085]">The operation stopped safely. No purchase or authorization was attempted.</p><Button className="mt-5" onClick={reset}><RotateCcw />Try again</Button></div></div>;
}
