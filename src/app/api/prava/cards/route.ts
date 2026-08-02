import { getRequestContext, ok, routeError } from "@/lib/api/route";
import { getPravaProvider } from "@/lib/providers/prava";

export async function GET() {
  try {
    const context = await getRequestContext();
    const resolved = await getPravaProvider(context.organizationId);
    const cards = resolved.cards ?? await resolved.provider.listCards();
    return ok(cards, "live");
  } catch (error) { return routeError(error); }
}
