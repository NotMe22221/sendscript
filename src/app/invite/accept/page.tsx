import { BrandMark } from "@/components/brand-mark";
import { InviteAcceptForm } from "@/components/invite-accept-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default function AcceptInvitePage() {
  return <main className="grid min-h-screen place-items-center bg-[#f4f5f1] px-5 py-12"><div className="w-full max-w-md"><BrandMark className="mb-8 justify-center" /><Card><CardHeader><div><p className="mb-2 text-xs font-semibold uppercase tracking-[.08em] text-[#155eef]">Organization invitation</p><CardTitle>Finish your SpendScript account</CardTitle><p className="mt-2 text-sm leading-6 text-[#667085]">Choose a password to enter the shared procurement workspace.</p></div></CardHeader><CardContent><InviteAcceptForm /></CardContent></Card></div></main>;
}
