import Link from "next/link";
import { Plus } from "lucide-react";
import { MissionList } from "@/components/mission-list";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { getRequestContext } from "@/lib/api/route";
import { getWorkspaceSnapshot } from "@/lib/data/workspace";

export default async function MissionsPage() {
  const workspace = await getWorkspaceSnapshot(await getRequestContext());
  return <div className="page-enter"><PageHeader title="Purchasing missions" description={`Track every ${workspace.organizationName} request from intent to settlement.`} actions={<Button asChild><Link href="/missions/new"><Plus />New mission</Link></Button>} /><MissionList missions={workspace.missions} mode={workspace.mode} /></div>;
}
