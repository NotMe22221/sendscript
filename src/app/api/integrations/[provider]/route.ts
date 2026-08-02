import OpenAI from "openai";
import { z } from "zod";
import { getRequestContext, ok, routeError, RouteError } from "@/lib/api/route";
import {
  disconnectSharedIntegration,
  getIntegrationOverview,
  openAiPublicMetadata,
  pravaPublicMetadata,
  recordIntegrationTestFailure,
  saveSharedIntegration,
  type IntegrationProvider,
  type OpenAiCredentials,
  type PravaCredentials,
} from "@/lib/integrations/shared";

const noLines = () => z.string().min(8).max(1200).refine((value) => !/[\r\n]/.test(value), "Values cannot contain line breaks");
const OpenAiInput = z.object({
  apiKey: noLines().refine((value) => value.startsWith("sk-"), "OpenAI keys begin with sk-"),
  model: z.string().trim().min(2).max(100),
});
const PravaInput = z.object({
  baseUrl: z.string().url().refine((value) => value === "https://sandbox.api.prava.space", "Use the Prava sandbox API URL"),
  secretKey: noLines().refine((value) => value.startsWith("sk_test_"), "Prava sandbox secret keys begin with sk_test_"),
  publishableKey: noLines().refine((value) => value.startsWith("pk_test_"), "Prava sandbox publishable keys begin with pk_test_"),
  customerId: z.string().trim().min(2).max(255),
});

function providerFrom(value: string): IntegrationProvider {
  if (value === "openai" || value === "prava") return value;
  throw new RouteError("INVALID_INTEGRATION_PROVIDER", "Only OpenAI and Prava can be managed here.", 404, false);
}

async function requireAdmin() {
  const context = await getRequestContext();
  if (context.mode !== "live") throw new RouteError("SUPABASE_SHARED_SETUP_REQUIRED", "Connect Supabase before creating shared business integrations.", 409, true);
  if (context.role !== "admin") throw new RouteError("ORG_ADMIN_REQUIRED", "Only organization administrators can change shared credentials.", 403, false);
  const overview = await getIntegrationOverview(context);
  if (!overview.sharedSchemaReady) throw new RouteError("SHARED_INTEGRATION_SCHEMA_REQUIRED", "Apply the shared integrations migration before saving provider credentials.", 409, true);
  return context;
}

async function testOpenAi(credentials: OpenAiCredentials) {
  try {
    const client = new OpenAI({ apiKey: credentials.apiKey, timeout: 15_000, maxRetries: 0 });
    const model = await client.models.retrieve(credentials.model);
    return { model: model.id };
  } catch {
    throw new RouteError("OPENAI_CONNECTION_REJECTED", "OpenAI rejected the key or the selected model is unavailable.", 422, true);
  }
}

async function testPrava(credentials: PravaCredentials) {
  try {
    const health = await fetch(`${credentials.baseUrl}/health`, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
    if (!health.ok) throw new Error("health");
    const query = new URLSearchParams({ customer_id: credentials.customerId, status: "active" });
    const response = await fetch(`${credentials.baseUrl}/v1/listCards?${query}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
      headers: { Authorization: `Bearer ${credentials.secretKey}` },
    });
    if (!response.ok) throw new Error("cards");
    const payload = await response.json() as { count?: number; cards?: unknown[] };
    return { cardCount: payload.count ?? payload.cards?.length ?? 0 };
  } catch {
    throw new RouteError("PRAVA_CONNECTION_REJECTED", "Prava rejected the sandbox key or customer ID.", 422, true);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  try {
    const context = await requireAdmin();
    const provider = providerFrom((await params).provider);
    let raw: unknown;
    try { raw = await request.json(); }
    catch { throw new RouteError("INVALID_INTEGRATION_VALUES", "Send valid connection values.", 400, true); }

    if (provider === "openai") {
      const parsed = OpenAiInput.safeParse(raw);
      if (!parsed.success) throw new RouteError("INVALID_INTEGRATION_VALUES", parsed.error.issues[0]?.message ?? "Check the OpenAI values.", 400, true);
      let tested: Awaited<ReturnType<typeof testOpenAi>>;
      try { tested = await testOpenAi(parsed.data); }
      catch (error) { await recordIntegrationTestFailure(context, provider); throw error; }
      await saveSharedIntegration(context, provider, parsed.data, openAiPublicMetadata({ ...parsed.data, model: tested.model }));
    } else {
      const parsed = PravaInput.safeParse(raw);
      if (!parsed.success) throw new RouteError("INVALID_INTEGRATION_VALUES", parsed.error.issues[0]?.message ?? "Check the Prava values.", 400, true);
      let tested: Awaited<ReturnType<typeof testPrava>>;
      try { tested = await testPrava(parsed.data); }
      catch (error) { await recordIntegrationTestFailure(context, provider); throw error; }
      await saveSharedIntegration(context, provider, parsed.data, pravaPublicMetadata(parsed.data, tested.cardCount));
    }

    return ok(await getIntegrationOverview(context), "live");
  } catch (error) {
    return routeError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ provider: string }> }) {
  try {
    const context = await requireAdmin();
    const provider = providerFrom((await params).provider);
    await disconnectSharedIntegration(context, provider);
    return ok(await getIntegrationOverview(context), "live");
  } catch (error) {
    return routeError(error);
  }
}
