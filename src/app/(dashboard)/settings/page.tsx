import { IntegrationCenter } from "@/components/integration-center";
import { PageHeader } from "@/components/page-header";
import { getRequestContext } from "@/lib/api/route";
import { getIntegrationOverview } from "@/lib/integrations/shared";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const context = await getRequestContext();
  const overview = await getIntegrationOverview(context);
  return (
    <div className="page-enter">
      <PageHeader eyebrow="Organization control plane" title="Shared integrations" description="Connect the business stack once. Every organization member uses the same server-side providers without seeing or copying a credential." />
      <IntegrationCenter initial={overview} />
    </div>
  );
}

