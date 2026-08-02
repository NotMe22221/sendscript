import "server-only";

import type { RequestContext } from "@/lib/api/route";
import {
  demoEvents,
  demoMission,
  demoOffers,
  demoTransactions,
} from "@/lib/domain/demo";
import type {
  ActivityEvent,
  MissionRequirements,
  MissionStatus,
  TransactionResult,
} from "@/lib/domain/schemas";

export interface WorkspaceMission {
  id: string;
  reference: string;
  title: string;
  owner: string;
  status: MissionStatus;
  budgetCents: number;
  createdAt: string;
  requirements?: MissionRequirements;
}

export interface WorkspaceMerchant {
  id: string;
  name: string;
  domain?: string;
  category: string;
  active: boolean;
}

export interface WorkspacePolicy {
  id: string;
  name: string;
  version: number;
  status: "draft" | "active" | "archived";
  sourceText: string;
  parsedRules: Record<string, unknown>;
}

export interface WorkspaceTransaction extends TransactionResult {
  safeMetadata: Record<string, unknown>;
}

export interface WorkspaceSnapshot {
  mode: "live" | "demo";
  organizationName: string;
  missions: WorkspaceMission[];
  transactions: WorkspaceTransaction[];
  merchants: WorkspaceMerchant[];
  policies: WorkspacePolicy[];
  events: ActivityEvent[];
  offerCount: number;
  compliantOfferCount: number;
}

function referenceFor(id: string, index = 0) {
  if (id === demoMission.id) return "MSN-1048";
  const compact = id.replaceAll("-", "").slice(0, 6).toUpperCase();
  return `MSN-${compact || String(1048 - index)}`;
}

function eventTone(type: string): ActivityEvent["tone"] {
  if (/(succeeded|completed|approved|active)/i.test(type)) return "success";
  if (/(blocked|failed|rejected|revoked|cancelled)/i.test(type)) return "danger";
  if (/(created|evaluated|authorized|decision)/i.test(type)) return "info";
  return "neutral";
}

function demoSnapshot(): WorkspaceSnapshot {
  return {
    mode: "demo",
    organizationName: "Acme Labs preview",
    missions: [{
      id: demoMission.id,
      reference: "MSN-1048",
      title: demoMission.title,
      owner: demoMission.owner,
      status: demoMission.status,
      budgetCents: demoMission.requirements.budgetCents,
      createdAt: demoMission.createdAt,
      requirements: demoMission.requirements,
    }],
    transactions: demoTransactions.map((transaction) => ({ ...transaction, safeMetadata: {} })),
    merchants: [
      { id: "merchant-a", name: "Merchant A", domain: "merchant-a.example.com", category: "Computer accessories", active: true },
      { id: "cdw", name: "CDW", domain: "cdw.com", category: "Enterprise technology", active: true },
      { id: "staples", name: "Staples Business", domain: "staples.com", category: "Office and accessories", active: true },
    ],
    policies: [],
    events: demoEvents,
    offerCount: demoOffers.length,
    compliantOfferCount: 4,
  };
}

type MissionRow = {
  id: string;
  title: string;
  status: MissionStatus;
  owner_id: string | null;
  created_at: string;
};

type RequirementRow = { mission_id: string; requirements: unknown };
type ProfileRow = { id: string; full_name: string };

export async function getWorkspaceSnapshot(context: RequestContext): Promise<WorkspaceSnapshot> {
  if (context.mode === "demo" || !context.supabase) return demoSnapshot();

  const supabase = context.supabase;
  const [
    organizationResult,
    missionResult,
    requirementResult,
    profileResult,
    transactionResult,
    merchantResult,
    policyResult,
    eventResult,
    offerCountResult,
    compliantCountResult,
  ] = await Promise.all([
    supabase.from("organizations").select("name").eq("id", context.organizationId).single(),
    supabase.from("missions").select("id,title,status,owner_id,created_at").eq("organization_id", context.organizationId).order("created_at", { ascending: false }).limit(100),
    supabase.from("mission_requirements").select("mission_id,requirements").eq("organization_id", context.organizationId),
    supabase.from("profiles").select("id,full_name"),
    supabase.from("transactions").select("id,mission_id,amount_cents,merchant,status,idempotency_reference,checkout_reference,failure_code,safe_prava_metadata,created_at").eq("organization_id", context.organizationId).order("created_at", { ascending: false }).limit(100),
    supabase.from("approved_merchants").select("id,name,domain,category,active").eq("organization_id", context.organizationId).order("name"),
    supabase.from("policies").select("id,name,version,status,source_text,parsed_rules").eq("organization_id", context.organizationId).order("version", { ascending: false }),
    supabase.from("activity_events").select("id,mission_id,event_type,title,detail,actor_label,created_at").eq("organization_id", context.organizationId).order("created_at", { ascending: false }).limit(50),
    supabase.from("offers").select("id", { count: "exact", head: true }).eq("organization_id", context.organizationId),
    supabase.from("policy_evaluations").select("id", { count: "exact", head: true }).eq("organization_id", context.organizationId).eq("compliant", true),
  ]);

  const firstError = [missionResult, requirementResult, profileResult, transactionResult, merchantResult, policyResult, eventResult].find((result) => result.error)?.error;
  if (firstError) throw new Error(`WORKSPACE_READ_FAILED:${firstError.code}`);

  const requirementsByMission = new Map(
    ((requirementResult.data ?? []) as RequirementRow[]).map((row) => [row.mission_id, row.requirements]),
  );
  const profileById = new Map(
    ((profileResult.data ?? []) as ProfileRow[]).map((row) => [row.id, row.full_name]),
  );

  const missions = ((missionResult.data ?? []) as MissionRow[]).map((mission, index): WorkspaceMission => {
    const rawRequirements = requirementsByMission.get(mission.id);
    const requirements = rawRequirements && typeof rawRequirements === "object" ? rawRequirements as MissionRequirements : undefined;
    return {
      id: mission.id,
      reference: referenceFor(mission.id, index),
      title: mission.title,
      owner: mission.owner_id ? profileById.get(mission.owner_id) ?? "Organization member" : "Organization workspace",
      status: mission.status,
      budgetCents: requirements?.budgetCents ?? 0,
      createdAt: mission.created_at,
      requirements,
    };
  });

  const transactions = (transactionResult.data ?? []).map((row): WorkspaceTransaction => ({
    id: String(row.id),
    missionId: String(row.mission_id),
    amountCents: Number(row.amount_cents),
    merchant: String(row.merchant),
    status: row.status as WorkspaceTransaction["status"],
    idempotencyReference: String(row.idempotency_reference),
    checkoutReference: row.checkout_reference ? String(row.checkout_reference) : undefined,
    failureCode: row.failure_code ? String(row.failure_code) : undefined,
    createdAt: String(row.created_at),
    safeMetadata: row.safe_prava_metadata && typeof row.safe_prava_metadata === "object" ? row.safe_prava_metadata as Record<string, unknown> : {},
  }));

  const events = (eventResult.data ?? []).map((row): ActivityEvent => ({
    id: String(row.id),
    missionId: String(row.mission_id),
    type: String(row.event_type),
    title: String(row.title),
    detail: String(row.detail),
    actor: String(row.actor_label),
    createdAt: String(row.created_at),
    tone: eventTone(String(row.event_type)),
  }));

  return {
    mode: "live",
    organizationName: organizationResult.data?.name ? String(organizationResult.data.name) : "Organization workspace",
    missions,
    transactions,
    merchants: (merchantResult.data ?? []).map((row) => ({
      id: String(row.id),
      name: String(row.name),
      domain: row.domain ? String(row.domain) : undefined,
      category: row.category ? String(row.category) : "Approved merchant",
      active: Boolean(row.active),
    })),
    policies: (policyResult.data ?? []).map((row) => ({
      id: String(row.id),
      name: String(row.name),
      version: Number(row.version),
      status: row.status as WorkspacePolicy["status"],
      sourceText: String(row.source_text),
      parsedRules: row.parsed_rules && typeof row.parsed_rules === "object" ? row.parsed_rules as Record<string, unknown> : {},
    })),
    events,
    offerCount: offerCountResult.count ?? 0,
    compliantOfferCount: compliantCountResult.count ?? 0,
  };
}

export async function getWorkspaceTransaction(context: RequestContext, transactionId: string) {
  const snapshot = await getWorkspaceSnapshot(context);
  const transaction = snapshot.transactions.find((item) => item.id === transactionId);
  if (!transaction) return null;
  const mission = snapshot.missions.find((item) => item.id === transaction.missionId);
  return {
    transaction,
    mission,
    events: snapshot.events.filter((event) => event.missionId === transaction.missionId),
    mode: snapshot.mode,
  };
}
