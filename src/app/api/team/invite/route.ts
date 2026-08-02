import { z } from "zod";
import { config } from "@/lib/config";
import { getRequestContext, ok, routeError, RouteError } from "@/lib/api/route";
import { createAdminClient } from "@/lib/supabase/admin";
import { getIntegrationOverview } from "@/lib/integrations/shared";

const InviteSchema = z.object({
  email: z.string().trim().email().max(320),
  fullName: z.string().trim().min(2).max(120),
  role: z.enum(["admin", "manager", "member"]),
});

export async function POST(request: Request) {
  try {
    const context = await getRequestContext();
    if (context.mode !== "live") throw new RouteError("SUPABASE_SHARED_SETUP_REQUIRED", "Connect Supabase before inviting teammates.", 409, true);
    if (context.role !== "admin") throw new RouteError("ORG_ADMIN_REQUIRED", "Only organization administrators can invite teammates.", 403, false);
    const input = InviteSchema.parse(await request.json());
    const admin = createAdminClient();
    const redirectTo = new URL("/auth/callback", config.appUrl);
    redirectTo.searchParams.set("next", "/invite/accept");
    const { data, error } = await admin.auth.admin.inviteUserByEmail(input.email, {
      redirectTo: redirectTo.toString(),
      data: { full_name: input.fullName, organization_id: context.organizationId, organization_role: input.role },
    });
    if (error || !data.user) {
      throw new RouteError("TEAM_INVITE_FAILED", error?.message?.toLowerCase().includes("registered") ? "This email already has an account. Add existing-account membership from Supabase for now." : "Supabase could not send this invitation. Check Auth email and redirect settings.", 422, true);
    }
    const { error: profileError } = await admin.from("profiles").upsert({ id: data.user.id, full_name: input.fullName, email: input.email });
    if (profileError) throw new Error(`TEAM_PROFILE_FAILED:${profileError.code}`);
    const { error: membershipError } = await admin.from("memberships").upsert({ organization_id: context.organizationId, user_id: data.user.id, role: input.role });
    if (membershipError) throw new Error(`TEAM_MEMBERSHIP_FAILED:${membershipError.code}`);
    return ok(await getIntegrationOverview(context), "live", 201);
  } catch (error) {
    return routeError(error);
  }
}
