import { getRequestContext, ok, routeError } from "@/lib/api/route";
import { getPravaProvider } from "@/lib/providers/prava";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const context = await getRequestContext(); const { id } = await params; const resolved = await getPravaProvider(context.organizationId); const data = await resolved.provider.revokeMandate(id); return ok(data, resolved.live && context.mode === "live" ? "live" : "demo"); }
  catch (error) { return routeError(error); }
}
