import "server-only";
import { config, readiness } from "@/lib/config";
import type { RequestContext } from "@/lib/api/route";
import { decryptIntegrationCredentials, encryptIntegrationCredentials } from "@/lib/security/integration-crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export type IntegrationProvider = "openai" | "prava";
export type IntegrationSource = "organization" | "deployment" | "none";

export interface OpenAiCredentials {
  apiKey: string;
  model: string;
}

export interface PravaCredentials {
  baseUrl: string;
  secretKey: string;
  publishableKey: string;
  customerId: string;
}

export interface IntegrationStatus {
  provider: "supabase" | IntegrationProvider;
  connected: boolean;
  source: IntegrationSource;
  label: string;
  detail: string;
  metadata: Record<string, string | number | boolean>;
  lastTestedAt?: string;
  updatedAt?: string;
}

export interface IntegrationAuditItem {
  id: string;
  provider: IntegrationProvider;
  action: "connected" | "updated" | "disconnected" | "test_failed";
  detail: string;
  createdAt: string;
}

export interface IntegrationMember {
  id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "member";
  joinedAt: string;
}

export interface IntegrationOverview {
  organizationId: string;
  organizationName: string;
  role: "admin" | "manager" | "member";
  memberCount: number;
  canManage: boolean;
  members: IntegrationMember[];
  sharedSchemaReady: boolean;
  services: IntegrationStatus[];
  audit: IntegrationAuditItem[];
}

interface IntegrationRow {
  provider: IntegrationProvider;
  encrypted_credentials: string;
  public_metadata: Record<string, string | number | boolean> | null;
  status: "connected" | "disconnected" | "error";
  last_tested_at: string | null;
  updated_at: string | null;
}

function encryptionMaterial() {
  if (!config.integrationEncryptionKey) throw new Error("INTEGRATION_ENCRYPTION_NOT_CONFIGURED");
  return config.integrationEncryptionKey;
}

function hint(value: string, visible = 4) {
  return value.length <= visible ? "Configured" : `••••${value.slice(-visible)}`;
}

function projectReference() {
  if (!config.supabaseUrl) return "Not configured";
  try { return new URL(config.supabaseUrl).hostname.split(".")[0] ?? "Configured"; }
  catch { return "Configured"; }
}

async function organizationRows(organizationId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organization_integrations")
    .select("provider,encrypted_credentials,public_metadata,status,last_tested_at,updated_at")
    .eq("organization_id", organizationId);
  if (error) return { rows: [] as IntegrationRow[], schemaReady: false };
  return { rows: (data ?? []) as IntegrationRow[], schemaReady: true };
}

function deploymentOpenAi(): OpenAiCredentials | undefined {
  return config.openAiKey ? { apiKey: config.openAiKey, model: config.openAiModel } : undefined;
}

function deploymentPrava(): PravaCredentials | undefined {
  return readiness.prava && config.pravaSecretKey && config.pravaPublishableKey && config.pravaCustomerId
    ? { baseUrl: config.pravaBaseUrl, secretKey: config.pravaSecretKey, publishableKey: config.pravaPublishableKey, customerId: config.pravaCustomerId }
    : undefined;
}

export async function resolveOpenAiConnection(organizationId: string): Promise<{ credentials: OpenAiCredentials; source: Exclude<IntegrationSource, "none"> } | undefined> {
  if (readiness.supabase) {
    const { rows, schemaReady } = await organizationRows(organizationId);
    const row = rows.find((item) => item.provider === "openai");
    if (schemaReady && row?.status === "disconnected") return undefined;
    if (row?.status === "connected" && row.encrypted_credentials) {
      return { credentials: decryptIntegrationCredentials<OpenAiCredentials>(row.encrypted_credentials, encryptionMaterial()), source: "organization" };
    }
  }
  const credentials = deploymentOpenAi();
  return credentials ? { credentials, source: "deployment" } : undefined;
}

export async function resolvePravaConnection(organizationId: string): Promise<{ credentials: PravaCredentials; source: Exclude<IntegrationSource, "none"> } | undefined> {
  if (readiness.supabase) {
    const { rows, schemaReady } = await organizationRows(organizationId);
    const row = rows.find((item) => item.provider === "prava");
    if (schemaReady && row?.status === "disconnected") return undefined;
    if (row?.status === "connected" && row.encrypted_credentials) {
      return { credentials: decryptIntegrationCredentials<PravaCredentials>(row.encrypted_credentials, encryptionMaterial()), source: "organization" };
    }
  }
  const credentials = deploymentPrava();
  return credentials ? { credentials, source: "deployment" } : undefined;
}

export async function saveSharedIntegration(
  context: RequestContext,
  provider: IntegrationProvider,
  credentials: OpenAiCredentials | PravaCredentials,
  publicMetadata: Record<string, string | number | boolean>,
) {
  if (context.mode !== "live") throw new Error("SUPABASE_SHARED_SETUP_REQUIRED");
  const admin = createAdminClient();
  const encrypted = encryptIntegrationCredentials(credentials, encryptionMaterial());
  const detail = provider === "openai"
    ? `OpenAI connected for the organization with model ${String(publicMetadata.model ?? "configured")}.`
    : `Prava sandbox connected for the organization with ${Number(publicMetadata.cardCount ?? 0)} safe card record(s).`;
  const { error } = await admin.rpc("upsert_organization_integration", {
    p_organization_id: context.organizationId,
    p_provider: provider,
    p_encrypted_credentials: encrypted,
    p_public_metadata: publicMetadata,
    p_actor_id: context.userId,
    p_detail: detail,
  });
  if (error) throw new Error(`INTEGRATION_SAVE_FAILED:${error.code}`);
}

export async function disconnectSharedIntegration(context: RequestContext, provider: IntegrationProvider) {
  if (context.mode !== "live") throw new Error("SUPABASE_SHARED_SETUP_REQUIRED");
  const admin = createAdminClient();
  const { error } = await admin.rpc("disconnect_organization_integration", {
    p_organization_id: context.organizationId,
    p_provider: provider,
    p_actor_id: context.userId,
  });
  if (error) throw new Error(`INTEGRATION_DISCONNECT_FAILED:${error.code}`);
}

export async function recordIntegrationTestFailure(context: RequestContext, provider: IntegrationProvider) {
  if (context.mode !== "live") return;
  const admin = createAdminClient();
  await admin.from("integration_audit_events").insert({
    organization_id: context.organizationId,
    provider,
    action: "test_failed",
    actor_id: context.userId,
    detail: `${provider === "openai" ? "OpenAI" : "Prava sandbox"} connection test failed; the existing shared connection was not changed.`,
  });
}

export function openAiPublicMetadata(credentials: OpenAiCredentials) {
  return { model: credentials.model, keyHint: hint(credentials.apiKey) };
}

export function pravaPublicMetadata(credentials: PravaCredentials, cardCount: number) {
  return { environment: "sandbox", baseUrl: credentials.baseUrl, keyHint: hint(credentials.secretKey), customerHint: hint(credentials.customerId, 6), cardCount };
}

export async function getIntegrationOverview(context: RequestContext): Promise<IntegrationOverview> {
  const admin = createAdminClient();
  const [connectionResult, organizationResult, memberResult, profileResult, auditResult] = await Promise.all([
    organizationRows(context.organizationId),
    admin.from("organizations").select("name").eq("id", context.organizationId).maybeSingle(),
    admin.from("memberships").select("user_id,role,created_at").eq("organization_id", context.organizationId).order("created_at"),
    admin.from("profiles").select("id,full_name,email"),
    admin.from("integration_audit_events").select("id,provider,action,detail,created_at").eq("organization_id", context.organizationId).order("created_at", { ascending: false }).limit(8),
  ]);
  const row = (provider: IntegrationProvider) => connectionResult.rows.find((item) => item.provider === provider);
  const openAiRow = row("openai");
  const pravaRow = row("prava");
  const envOpenAi = deploymentOpenAi();
  const envPrava = deploymentPrava();

  const statusFor = (provider: IntegrationProvider, integrationRow: IntegrationRow | undefined, deployment: OpenAiCredentials | PravaCredentials | undefined): IntegrationStatus => {
    if (integrationRow?.status === "disconnected") {
      return { provider, connected: false, source: "none", label: provider === "openai" ? "OpenAI" : "Prava sandbox", detail: "Disconnected for this organization.", metadata: {}, lastTestedAt: integrationRow.last_tested_at ?? undefined, updatedAt: integrationRow.updated_at ?? undefined };
    }
    if (integrationRow?.status === "connected") {
      return { provider, connected: true, source: "organization", label: provider === "openai" ? "OpenAI" : "Prava sandbox", detail: "Shared organization connection.", metadata: integrationRow.public_metadata ?? {}, lastTestedAt: integrationRow.last_tested_at ?? undefined, updatedAt: integrationRow.updated_at ?? undefined };
    }
    return { provider, connected: Boolean(deployment), source: deployment ? "deployment" : "none", label: provider === "openai" ? "OpenAI" : "Prava sandbox", detail: deployment ? "Shared deployment connection." : "Not connected", metadata: provider === "openai" && envOpenAi ? openAiPublicMetadata(envOpenAi) : provider === "prava" && envPrava ? pravaPublicMetadata(envPrava, 0) : {} };
  };

  return {
    organizationId: context.organizationId,
    organizationName: String(organizationResult.data?.name ?? "Organization"),
    role: context.role,
    memberCount: memberResult.data?.length ?? 0,
    canManage: context.role === "admin",
    members: (memberResult.data ?? []).map((membership) => {
      const profile = (profileResult.data ?? []).find((item) => item.id === membership.user_id);
      return {
        id: String(membership.user_id),
        name: String(profile?.full_name ?? "Organization member"),
        email: String(profile?.email ?? "Email unavailable"),
        role: membership.role as IntegrationMember["role"],
        joinedAt: String(membership.created_at),
      };
    }),
    sharedSchemaReady: connectionResult.schemaReady,
    services: [
      { provider: "supabase", connected: true, source: "deployment", label: "Supabase workspace", detail: "Authentication, shared data, and organization RLS.", metadata: { project: projectReference() } },
      statusFor("openai", openAiRow, envOpenAi),
      statusFor("prava", pravaRow, envPrava),
    ],
    audit: auditResult.error ? [] : (auditResult.data ?? []).map((item) => ({ id: String(item.id), provider: item.provider as IntegrationProvider, action: item.action as IntegrationAuditItem["action"], detail: String(item.detail), createdAt: String(item.created_at) })),
  };
}
