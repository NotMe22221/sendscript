import { z } from "zod";
import { getRequestContext, ok, routeError } from "@/lib/api/route";
import { transitionMission } from "@/lib/api/persistence";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getRequestContext(); const { id } = await params; const { reason } = z.object({ reason: z.string().min(4).max(1000) }).parse(await request.json());
    if (context.mode === "live" && context.supabase) await transitionMission(context, id, "REJECTED", "approval.rejected", "Mission rejected", reason);
    return ok({ missionId: id, status: "REJECTED" as const }, context.mode);
  } catch (error) { return routeError(error); }
}
