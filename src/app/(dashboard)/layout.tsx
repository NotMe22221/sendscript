import { AppShell } from "@/components/app-shell";
import { redirect } from "next/navigation";
import { readiness } from "@/lib/config";
import { getRequestContext, RouteError } from "@/lib/api/route";
import { getIntegrationOverview } from "@/lib/integrations/shared";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let connectedServices = [readiness.supabase, readiness.openai, readiness.prava].filter(Boolean).length;
  let missionCount = readiness.supabase ? 0 : 1;
  let organizationName = "Acme Labs";
  if (readiness.supabase) {
    try {
      const context = await getRequestContext();
      const [overview, missionResult] = await Promise.all([
        getIntegrationOverview(context),
        context.supabase?.from("missions").select("id", { count: "exact", head: true }).eq("organization_id", context.organizationId),
      ]);
      connectedServices = overview.services.filter((service) => service.connected).length;
      missionCount = missionResult?.count ?? 0;
      organizationName = overview.organizationName;
    } catch (error) {
      // Middleware normally handles this first, but a locally configured
      // public key can change after the production bundle was built. Keep the
      // dashboard fail-closed and send signed-out users to the intended UI
      // instead of rendering the generic purchase-safety error boundary.
      if (error instanceof RouteError && error.code === "UNAUTHENTICATED") redirect("/login");
      throw error;
    }
  }
  return <AppShell connectedServices={connectedServices} setupHref={readiness.supabase ? "/settings" : "/setup"} missionCount={missionCount} organizationName={organizationName}>{children}</AppShell>;
}
