import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { RequestContext } from "./route";
import type { MissionStatus, TransactionResult } from "@/lib/domain/schemas";

export async function transitionMission(context: RequestContext, missionId: string, status: MissionStatus, type: string, title: string, detail: string) {
  if (context.mode === "demo" || !context.supabase) return;
  const { error } = await context.supabase.rpc("transition_mission", {
    p_mission_id: missionId,
    p_new_status: status,
    p_event_type: type,
    p_title: title,
    p_detail: detail,
  });
  if (error) throw new Error(`DATABASE_TRANSITION_FAILED:${error.code}`);
}

export async function persistTransaction(context: RequestContext, result: TransactionResult, safeMetadata?: Record<string, unknown>) {
  if (context.mode === "demo") return;
  const admin = createAdminClient();
  const { error } = await admin.from("transactions").insert({
    id: result.id,
    organization_id: context.organizationId,
    mission_id: result.missionId,
    merchant: result.merchant,
    amount_cents: result.amountCents,
    status: result.status,
    idempotency_reference: result.idempotencyReference,
    checkout_reference: result.checkoutReference,
    failure_code: result.failureCode,
    safe_prava_metadata: safeMetadata ?? {},
    created_at: result.createdAt,
  });
  if (error && error.code !== "23505") throw new Error(`DATABASE_TRANSACTION_FAILED:${error.code}`);
}

export async function appendActivityEvent(
  context: RequestContext,
  missionId: string,
  type: string,
  title: string,
  detail: string,
  actorLabel = "SpendScript",
) {
  if (context.mode === "demo") return;
  const { error } = await createAdminClient().from("activity_events").insert({
    organization_id: context.organizationId,
    mission_id: missionId,
    event_type: type,
    title,
    detail,
    actor_id: context.userId,
    actor_label: actorLabel,
  });
  if (error) throw new Error(`DATABASE_ACTIVITY_FAILED:${error.code}`);
}
