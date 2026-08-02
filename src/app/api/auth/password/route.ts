import { z } from "zod";
import { getRequestContext, ok, routeError } from "@/lib/api/route";

export async function POST(request: Request) {
  try {
    const context = await getRequestContext();
    const { password } = z.object({ password: z.string().min(12).max(200) }).parse(await request.json());
    if (!context.supabase) return ok({ updated: true }, "demo");
    const { error } = await context.supabase.auth.updateUser({ password });
    if (error) throw new Error("PASSWORD_UPDATE_FAILED");
    return ok({ updated: true }, "live");
  } catch (error) {
    return routeError(error);
  }
}
