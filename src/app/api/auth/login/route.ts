import { z } from "zod";
import { ok, routeError, RouteError } from "@/lib/api/route";
import { readiness } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    if (!readiness.supabase) throw new RouteError("SUPABASE_NOT_CONFIGURED", "Supabase is required for authenticated sign-in.", 503, true);
    const credentials = z.object({ email: z.string().email(), password: z.string().min(8) }).parse(await request.json());
    const supabase = await createClient(); const { data, error } = await supabase.auth.signInWithPassword(credentials);
    if (error || !data.user) throw new RouteError("INVALID_CREDENTIALS", "Email or password is incorrect.", 401, true);
    return ok({ userId: data.user.id }, "live");
  } catch (error) { return routeError(error); }
}
