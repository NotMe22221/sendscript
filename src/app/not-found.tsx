import Link from "next/link";
import { ArrowLeft, FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return <main className="grid min-h-screen place-items-center bg-[#f7f8fa] p-6"><div className="max-w-md text-center"><span className="mx-auto grid size-12 place-items-center rounded-xl bg-[#eff4ff] text-[#155eef]"><FileQuestion className="size-6" /></span><p className="mt-5 text-xs font-semibold uppercase tracking-[.08em] text-[#155eef]">404</p><h1 className="mt-2 text-2xl font-semibold tracking-[-.03em]">Record not found</h1><p className="mt-2 text-sm leading-6 text-[#667085]">The mission, policy, or transaction may have moved or is outside your organization.</p><Button asChild className="mt-5"><Link href="/overview"><ArrowLeft />Back to overview</Link></Button></div></main>;
}
