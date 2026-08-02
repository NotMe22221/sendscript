import "server-only";
import { randomBytes } from "node:crypto";
import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { NextResponse } from "next/server";
import { demoOffers, demoRequirements, DEMO_MISSION_ID, DEMO_ORG_ID, DEMO_POLICY_ID } from "@/lib/domain/demo";
import {
  SetupRequestSchema,
  setupIssueMessage,
  type OpenAiSetup,
  type PravaSetup,
  type SetupRequest,
  type SupabaseSetup,
} from "@/lib/setup/environment-schema";

function localRequest(request: Request) {
  const hostname = new URL(request.url).hostname;
  const origin = request.headers.get("origin");
  const originHost = origin ? new URL(origin).hostname : hostname;
  const loopback = new Set(["localhost", "127.0.0.1", "::1"]);
  return loopback.has(hostname) && loopback.has(originHost);
}

function response(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store, max-age=0" } });
}

function createSetupSupabase(values: SupabaseSetup) {
  return createClient(values.url, values.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(12_000) }),
    },
  });
}

async function testSupabase(values: SupabaseSetup) {
  try {
    const supabase = createSetupSupabase(values);
    const { error: authError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (authError) {
      const message = authError.status === 401 || authError.status === 403
        ? "The project URL or service-role key was rejected. Use the service_role key, not the publishable key."
        : `Supabase authentication returned status ${authError.status ?? "unknown"}. Confirm the project URL and service-role key.`;
      return { connected: false, schemaReady: false, message };
    }
    // The PostgREST OpenAPI root is admin-only and returns 403 for valid
    // publishable/anon keys. Auth settings is public but still validates the
    // project's API key at the gateway, so it works for both key generations.
    const publishableCheck = await fetch(`${values.url}/auth/v1/settings`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
      headers: { apikey: values.publishableKey },
    });
    if (publishableCheck.status === 401 || publishableCheck.status === 403) {
      return { connected: false, schemaReady: false, message: "The Supabase publishable or anon key was rejected. Make sure it comes from the same project as this URL." };
    }
    if (!publishableCheck.ok) {
      return { connected: false, schemaReady: false, message: `The Supabase REST API returned status ${publishableCheck.status}. Confirm the project URL.` };
    }
    const { error: schemaError } = await supabase.from("organizations").select("id").limit(1);
    return {
      connected: true,
      schemaReady: !schemaError,
      message: schemaError ? "Credentials work. Apply the included SpendScript migration next." : "Supabase authentication and SpendScript tables are ready.",
    };
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    return {
      connected: false,
      schemaReady: false,
      message: timedOut
        ? "Supabase did not respond within 12 seconds. Check the project URL and try again."
        : "SpendScript could not reach Supabase. Check the project URL and your network connection.",
    };
  }
}

async function provisionJudgeWorkspace(values: SupabaseSetup) {
  const supabase = createSetupSupabase(values);
  const { error: organizationError } = await supabase.from("organizations").upsert({ id: DEMO_ORG_ID, name: "Acme Labs", slug: "acme-labs" });
  if (organizationError) throw organizationError;

  const { error: policyError } = await supabase.from("policies").upsert({
    id: DEMO_POLICY_ID,
    organization_id: DEMO_ORG_ID,
    name: "Hardware Procurement Policy",
    version: 3,
    status: "active",
    source_text: "Hardware purchases are allowed from Merchant A, CDW, and Staples Business. Missions must not exceed $500 or 12 units. Sellers require a 4.2 rating. Purchases at or above $250 require manager approval.",
    parsed_rules: { approvedMerchants: ["Merchant A", "CDW", "Staples Business"], maxBudgetCents: 50000, maxQuantity: 12, minSellerRating: 4.2, approvalThresholdCents: 25000 },
  });
  if (policyError) throw policyError;

  const { error: merchantError } = await supabase.from("approved_merchants").upsert([
    { organization_id: DEMO_ORG_ID, name: "Merchant A", domain: "merchant-a.example.com", category: "Computer accessories" },
    { organization_id: DEMO_ORG_ID, name: "CDW", domain: "cdw.com", category: "Enterprise technology" },
    { organization_id: DEMO_ORG_ID, name: "Staples Business", domain: "staples.com", category: "Office and accessories" },
  ], { onConflict: "organization_id,name" });
  if (merchantError) throw merchantError;

  let userId: string | undefined;
  const { data: created, error: createError } = await supabase.auth.admin.createUser({ email: values.demoEmail, password: values.demoPassword, email_confirm: true, user_metadata: { full_name: "Maya Chen" } });
  if (!createError) userId = created.user?.id;
  if (!userId) {
    const { data: users, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listError) throw listError;
    userId = users.users.find((user) => user.email?.toLowerCase() === values.demoEmail.toLowerCase())?.id;
  }
  if (!userId) throw new Error("JUDGE_USER_NOT_RESOLVED");
  const { error: updateUserError } = await supabase.auth.admin.updateUserById(userId, { password: values.demoPassword, email_confirm: true, user_metadata: { full_name: "Maya Chen" } });
  if (updateUserError) throw updateUserError;
  const { error: profileError } = await supabase.from("profiles").upsert({ id: userId, full_name: "Maya Chen", email: values.demoEmail });
  if (profileError) throw profileError;
  const { error: membershipError } = await supabase.from("memberships").upsert({ organization_id: DEMO_ORG_ID, user_id: userId, role: "admin" });
  if (membershipError) throw membershipError;

  const { error: missionError } = await supabase.from("missions").upsert({
    id: DEMO_MISSION_ID,
    organization_id: DEMO_ORG_ID,
    title: demoRequirements.title,
    source_prompt: "Buy 8 reliable USB-C hubs under $350 total with 4K HDMI, 100W power delivery, Ethernet, two USB-A ports, Mac and Windows compatibility, delivered by August 18.",
    status: "AWAITING_APPROVAL",
    owner_id: userId,
    policy_id: DEMO_POLICY_ID,
  });
  if (missionError) throw missionError;
  const { error: requirementsError } = await supabase.from("mission_requirements").upsert({ mission_id: DEMO_MISSION_ID, organization_id: DEMO_ORG_ID, requirements: demoRequirements, confidence: demoRequirements.confidence, confirmed_at: "2026-08-01T17:47:02Z" });
  if (requirementsError) throw requirementsError;
  const { error: offersError } = await supabase.from("offers").upsert(demoOffers.map((offer) => ({
    id: offer.id,
    organization_id: DEMO_ORG_ID,
    merchant: offer.merchant,
    seller: offer.seller,
    product_name: offer.productName,
    unit_price_cents: offer.unitPriceCents,
    quantity: offer.quantity,
    shipping_cents: offer.shippingCents,
    delivery_date: offer.deliveryDate,
    approved_merchant: offer.approvedMerchant,
    seller_rating: offer.sellerRating,
    return_days: offer.returnDays,
    requirement_match: offer.requirementMatch,
  })));
  if (offersError) throw offersError;
  return { judgeReady: true, workspaceReady: true };
}

async function testOpenAi(values: OpenAiSetup) {
  const openai = new OpenAI({ apiKey: values.apiKey, timeout: 12_000, maxRetries: 0 });
  let accessibleModelIds: string[] = [];
  try {
    const models = await openai.models.list();
    accessibleModelIds = models.data.map((model) => model.id);
  } catch (error) {
    const status = error instanceof OpenAI.APIError ? error.status : undefined;
    const message = status === 401
      ? "OpenAI rejected this API key. Create a project key and paste the complete sk- value."
      : status === 403
        ? "This OpenAI project does not allow model access. Check the key's project permissions."
        : error instanceof OpenAI.APIConnectionTimeoutError
          ? "OpenAI did not respond within 12 seconds. Try the connection test again."
          : "SpendScript could not reach OpenAI. Check your network connection and try again.";
    return { connected: false, modelAccessible: false, message };
  }

  try {
    await openai.models.retrieve(values.model);
    return { connected: true, modelAccessible: true, message: `${values.model} is available to this project.` };
  } catch (error) {
    const status = error instanceof OpenAI.APIError ? error.status : undefined;
    if (status === 404 || status === 403) {
      const preferredModels = [
        "gpt-5.6-sol",
        "gpt-5.6-terra",
        "gpt-5.6-luna",
        "gpt-5.5",
        "gpt-5.4",
        "gpt-5.4-mini",
        "gpt-5.2",
        "gpt-5.1",
        "gpt-4.1",
        "gpt-4o",
        "gpt-4o-mini",
      ];
      const suggestedModel = preferredModels.find((model) => accessibleModelIds.includes(model))
        ?? accessibleModelIds.find((model) => /^gpt-(?:5|4)/.test(model) && !model.includes("realtime") && !model.includes("audio"));
      return {
        connected: true,
        modelAccessible: false,
        suggestedModel,
        message: suggestedModel
          ? `The API key works, but ${values.model} is not enabled. Use ${suggestedModel}, which is available to this project.`
          : `The API key works, but ${values.model} is not enabled for this project. Enter a model ID this project can access.`,
      };
    }
    return {
      connected: true,
      modelAccessible: false,
      message: error instanceof OpenAI.APIConnectionTimeoutError
        ? "The API key works, but the model check timed out. Try again."
        : "The API key works, but SpendScript could not confirm the selected model. Try again or enter another model ID.",
    };
  }
}

async function fetchPravaCards(values: PravaSetup, header: "Api-Key" | "Authorization") {
  const params = new URLSearchParams({ customer_id: values.customerId, status: "active" });
  const headers: Record<string, string> = header === "Api-Key"
    ? { "Api-Key": values.secretKey }
    : { Authorization: `Bearer ${values.secretKey}` };
  return fetch(`${values.baseUrl}/v1/listCards?${params}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
    headers,
  });
}

function pravaCardCount(payload: unknown) {
  if (Array.isArray(payload)) return payload.length;
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  if (typeof record.count === "number") return record.count;
  if (Array.isArray(record.cards)) return record.cards.length;
  if (Array.isArray(record.data)) return record.data.length;
  return null;
}

async function testPrava(values: PravaSetup) {
  try {
    let cards = await fetchPravaCards(values, "Api-Key");
    if (cards.status === 401 || cards.status === 403) cards = await fetchPravaCards(values, "Authorization");
    if (cards.status === 401 || cards.status === 403) {
      return { connected: false, customerReady: false, message: "Prava rejected the sandbox secret key. Confirm you pasted the complete sk_test_ key." };
    }
    if (cards.status === 404) {
      return { connected: true, customerReady: false, message: "Prava did not find this sandbox customer. Confirm the customer ID and finish test-card enrollment." };
    }
    if (cards.status === 429) {
      return { connected: false, customerReady: false, message: "The Prava sandbox rate limit is active. Wait a moment, then test again." };
    }
    if (!cards.ok) {
      return { connected: false, customerReady: false, message: `Prava returned status ${cards.status}. Confirm the sandbox key and customer ID.` };
    }
    const payload: unknown = await cards.json().catch(() => null);
    const cardCount = pravaCardCount(payload);
    if (cardCount === null) {
      return { connected: true, customerReady: false, message: "Prava accepted the request, but returned an unexpected card-list response. Confirm this is a current sandbox account." };
    }
    if (cardCount === 0) {
      return { connected: true, customerReady: false, cardCount, message: "Prava accepted the key and customer ID, but this customer has no active sandbox card. Enroll one, then retry." };
    }
    return { connected: true, customerReady: true, cardCount, message: `Prava sandbox is ready with ${cardCount} active card${cardCount === 1 ? "" : "s"}.` };
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    return {
      connected: false,
      customerReady: false,
      message: timedOut
        ? "Prava did not respond within 12 seconds. Try the connection test again."
        : "SpendScript could not reach the Prava sandbox. Check your network connection and try again.",
    };
  }
}

type SaveInput = Extract<SetupRequest, { action: "save" }>;

async function saveEnvironment(values: SaveInput) {
  const envPath = path.resolve(process.cwd(), ".env.local");
  const tempPath = path.resolve(process.cwd(), ".env.local.spendscript-tmp");
  if (path.dirname(envPath) !== path.resolve(process.cwd())) throw new Error("INVALID_ENV_PATH");
  let existing = "";
  try { existing = await readFile(envPath, "utf8"); } catch { /* First-time setup. */ }
  const existingEncryptionLine = existing.split(/\r?\n/).find((line) => line.startsWith("INTEGRATION_ENCRYPTION_KEY="));
  let integrationEncryptionKey = randomBytes(32).toString("base64url");
  if (existingEncryptionLine) {
    const raw = existingEncryptionLine.slice("INTEGRATION_ENCRYPTION_KEY=".length);
    try { integrationEncryptionKey = JSON.parse(raw) as string; } catch { integrationEncryptionKey = raw; }
  }
  const nextValues: Record<string, string> = {
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    DEMO_EMAIL: values.values.supabase.demoEmail,
    DEMO_PASSWORD: values.values.supabase.demoPassword,
    NEXT_PUBLIC_SUPABASE_URL: values.values.supabase.url,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: values.values.supabase.publishableKey,
    SUPABASE_SERVICE_ROLE_KEY: values.values.supabase.serviceRoleKey,
    INTEGRATION_ENCRYPTION_KEY: integrationEncryptionKey,
    OPENAI_API_KEY: values.values.openai.apiKey,
    OPENAI_MODEL: values.values.openai.model,
    PRAVA_BASE_URL: values.values.prava.baseUrl,
    PRAVA_SECRET_KEY: values.values.prava.secretKey,
    NEXT_PUBLIC_PRAVA_PUBLISHABLE_KEY: values.values.prava.publishableKey,
    PRAVA_CUSTOMER_ID: values.values.prava.customerId,
  };
  const managed = new Set(Object.keys(nextValues));
  const preserved = existing.split(/\r?\n/).filter((line) => {
    const match = line.match(/^([A-Z][A-Z0-9_]*)=/);
    return !match || !managed.has(match[1]);
  });
  const serialized = Object.entries(nextValues).map(([key, value]) => `${key}=${JSON.stringify(value)}`);
  await writeFile(tempPath, `${preserved.join("\n").trim()}${preserved.join("\n").trim() ? "\n\n" : ""}# Managed by the local SpendScript setup wizard\n${serialized.join("\n")}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(tempPath, envPath);
  for (const [key, value] of Object.entries(nextValues)) process.env[key] = value;
}

export async function POST(request: Request) {
  if (!localRequest(request)) return response({ ok: false, error: { code: "LOCAL_SETUP_ONLY", message: "Credential setup is available only on localhost." } }, 403);
  try {
    let rawInput: unknown;
    try {
      rawInput = await request.json();
    } catch {
      return response({ ok: false, error: { code: "INVALID_SETUP_REQUEST", message: "Send a valid setup request." } }, 400);
    }
    const parsedInput = SetupRequestSchema.safeParse(rawInput);
    if (!parsedInput.success) {
      return response({
        ok: false,
        error: {
          code: "INVALID_SETUP_VALUES",
          message: parsedInput.error.issues[0] ? setupIssueMessage(parsedInput.error.issues[0]) : "Check the highlighted values.",
        },
      }, 400);
    }
    const input = parsedInput.data;
    if (input.action === "test") {
      const result = input.service === "supabase" ? await testSupabase(input.values) : input.service === "openai" ? await testOpenAi(input.values) : await testPrava(input.values);
      return response({ ok: true, data: result });
    }
    const [supabase, openai, prava] = await Promise.all([testSupabase(input.values.supabase), testOpenAi(input.values.openai), testPrava(input.values.prava)]);
    const blockers = [
      !supabase.connected ? "Supabase" : null,
      !openai.connected || !openai.modelAccessible ? "OpenAI" : null,
      !prava.connected ? "Prava" : null,
    ].filter((service): service is string => Boolean(service));
    if (blockers.length > 0) {
      return response({
        ok: false,
        error: {
          code: "CONNECTION_TEST_FAILED",
          message: `${blockers.join(", ")} ${blockers.length === 1 ? "needs" : "need"} attention. Review the provider-specific message below.`,
          services: { supabase, openai, prava },
        },
      }, 422);
    }
    await saveEnvironment(input);
    let provisioning = { judgeReady: false, workspaceReady: false, message: "Apply the database migration, then save once more to create the judge workspace." };
    if (supabase.schemaReady) {
      try {
        provisioning = { ...(await provisionJudgeWorkspace(input.values.supabase)), message: "Acme Labs, the controlled catalog, and the judge login are ready." };
      } catch {
        provisioning = { judgeReady: false, workspaceReady: false, message: "Credentials were saved, but the judge workspace could not be prepared. You can safely retry." };
      }
    }
    return response({ ok: true, data: { saved: true, services: { supabase, openai, prava }, provisioning } });
  } catch (error) {
    if (error instanceof SyntaxError) return response({ ok: false, error: { code: "INVALID_SETUP_REQUEST", message: "Send a valid setup request." } }, 400);
    if (error instanceof z.ZodError || (typeof error === "object" && error !== null && "issues" in error)) {
      const issues = (error as { issues?: Array<{ message?: string }> }).issues;
      return response({ ok: false, error: { code: "INVALID_SETUP_VALUES", message: issues?.[0]?.message ?? "Check the highlighted values." } }, 400);
    }
    return response({ ok: false, error: { code: "SETUP_SAVE_FAILED", message: "SpendScript could not save the local environment securely." } }, 500);
  }
}
