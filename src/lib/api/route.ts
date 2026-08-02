import "server-only";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { readiness } from "@/lib/config";
import { failure, success } from "@/lib/domain/schemas";
import { createClient } from "@/lib/supabase/server";

export interface RequestContext {
  mode: "live";
  userId: string;
  organizationId: string;
  role: "admin" | "manager" | "member";
  supabase: SupabaseClient;
}

export async function getRequestContext(): Promise<RequestContext> {
  if (!readiness.supabase) {
    throw new RouteError("SUPABASE_NOT_CONFIGURED", "Connect Supabase before using the product workspace.", 503, true);
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : undefined;
  if (error || !userId) throw new RouteError("UNAUTHENTICATED", "Sign in to continue.", 401, true);
  const { data: membership, error: membershipError } = await supabase
    .from("memberships")
    .select("organization_id,role")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (membershipError || !membership) throw new RouteError("ORG_ACCESS_REQUIRED", "No organization membership was found.", 403, false);
  return { mode: "live", userId, organizationId: String(membership.organization_id), role: membership.role as "admin" | "manager" | "member", supabase };
}

export class RouteError extends Error {
  constructor(public code: string, message: string, public status = 400, public recoverable = true) {
    super(message);
  }
}

export function ok<T>(data: T, mode: "live" | "demo" = "live", status = 200) {
  return NextResponse.json(success(data, mode), { status });
}

export function routeError(error: unknown) {
  if (error instanceof RouteError) return NextResponse.json(failure(error.code, error.message, error.recoverable), { status: error.status });
  const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
  const code = message.split(":")[0];
  const known: Record<string, string> = {
    OPENAI_NOT_CONFIGURED: "OpenAI is not configured.", OPENAI_REFUSAL: "The model declined this request.", OPENAI_MISSING_OUTPUT: "The model returned no structured output.",
    OPENAI_LOW_CONFIDENCE: "The request was too ambiguous to structure safely. Add a clearer quantity, budget, specification, and needed-by date.",
    NO_COMPLIANT_OFFERS: "No compliant offers were found.", PRAVA_NOT_CONFIGURED: "Prava sandbox is not configured.",
    PRAVA_CUSTOMER_NOT_CONFIGURED: "A Prava sandbox customer is required.", CHECKOUT_CREDENTIAL_MISSING: "No scoped checkout credential was returned.",
    INTEGRATION_ENCRYPTION_NOT_CONFIGURED: "Shared credential encryption is not configured.",
    INTEGRATION_CREDENTIALS_INVALID: "The saved integration credentials could not be decrypted. Reconnect the provider.",
    INTEGRATION_SAVE_FAILED: "The shared integration could not be saved.",
    INTEGRATION_DISCONNECT_FAILED: "The shared integration could not be disconnected.",
    SUPABASE_NOT_CONFIGURED: "Supabase must be connected before the product workspace can be used.",
    CATALOG_EMPTY: "No catalog offers are available for this organization.",
    ACTIVE_POLICY_REQUIRED: "Create and activate a procurement policy before evaluating offers.",
    PRAVA_CARD_REQUIRED: "The connected Prava customer has no active payment card.",
  };
  return NextResponse.json(failure(code || "INTERNAL_ERROR", known[code] ?? "The operation could not be completed safely.", true), { status: code.startsWith("OPENAI_") || code.startsWith("PRAVA_") ? 503 : 500 });
}
