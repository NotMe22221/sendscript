import { getRequestContext, ok, routeError } from "@/lib/api/route";
import { RouteError } from "@/lib/api/route";
import { getMissionProcurementData } from "@/lib/data/mission";
import { transitionMission } from "@/lib/api/persistence";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getRequestContext();
    const { id } = await params;
    const data = await getMissionProcurementData(context, id);
    if (!data.offers.length) throw new RouteError("CATALOG_EMPTY", "No catalog offers are available for this organization.", 409, true);
    if (data.mission.status === "SOURCING") {
      await transitionMission(context, id, "POLICY_REVIEW", "offers.sourced", "Catalog offers sourced", `${data.offers.length} organization catalog offers loaded for deterministic evaluation.`);
    }
    return ok({ offers: data.offers, count: data.offers.length, provider: "organization_catalog" }, "live");
  } catch (error) { return routeError(error); }
}
