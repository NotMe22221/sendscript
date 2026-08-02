import { getRequestContext, ok, routeError } from "@/lib/api/route";
import { demoRequirements } from "@/lib/domain/demo";
import { SeedCatalogProvider } from "@/lib/providers/catalog";

export async function POST() {
  try {
    const context = await getRequestContext();
    const offers = await new SeedCatalogProvider().search(demoRequirements);
    return ok({ offers, count: offers.length, provider: "controlled_catalog" }, context.mode);
  } catch (error) { return routeError(error); }
}
