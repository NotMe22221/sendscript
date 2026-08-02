import { ok, routeError } from "@/lib/api/route";
import { readiness } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try { if (readiness.supabase) { const supabase = await createClient(); await supabase.auth.signOut(); } return ok({ signedOut: true }, readiness.supabase ? "live" : "demo"); }
  catch (error) { return routeError(error); }
}
