import { getRequestContext, ok, routeError } from "@/lib/api/route";
import { getIntegrationOverview } from "@/lib/integrations/shared";

export async function GET() {
  try {
    const context = await getRequestContext();
    return ok(await getIntegrationOverview(context), context.mode);
  } catch (error) {
    return routeError(error);
  }
}

