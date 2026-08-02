import { CheckCircle2, Store } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getRequestContext } from "@/lib/api/route";
import { getWorkspaceSnapshot } from "@/lib/data/workspace";

export default async function VendorsPage() {
  const workspace = await getWorkspaceSnapshot(await getRequestContext());
  return <div className="page-enter"><PageHeader title="Approved vendors" description={`Merchant identities available to ${workspace.organizationName} purchasing missions.`} /><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{workspace.merchants.map((merchant) => <Card key={merchant.id}><CardContent><div className="flex items-start justify-between"><div className="grid size-10 place-items-center rounded-lg bg-[#eff4ff] text-[#155eef]"><Store className="size-5" /></div><Badge tone={merchant.active ? "success" : "neutral"}>{merchant.active && <CheckCircle2 className="size-3" />}{merchant.active ? "Approved" : "Inactive"}</Badge></div><h2 className="mt-5 font-semibold">{merchant.name}</h2><p className="mt-1 text-sm text-[#667085]">{merchant.category}</p><div className="mt-5 border-t border-[#eaecf0] pt-4 text-xs text-[#667085]">Verified domain <span className="float-right font-mono text-[11px] font-semibold text-[#344054]">{merchant.domain ?? "Controlled catalog"}</span></div></CardContent></Card>)}</div><p className="mt-4 text-xs text-[#7d8797]">{workspace.mode === "live" ? "This approved list is shared by every organization member and enforced server-side." : "Seeded preview. Connect Supabase to manage an organization-shared vendor list."}</p></div>;
}
