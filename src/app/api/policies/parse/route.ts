import { z } from "zod";
import { getRequestContext, ok, routeError, RouteError } from "@/lib/api/route";
import { parsePolicy, type PolicyDocument } from "@/lib/providers/openai";
import { resolveOpenAiConnection } from "@/lib/integrations/shared";

const demoPolicy: PolicyDocument = {
  name: "Hardware Procurement Policy",
  summary: "Controlled hardware purchasing with merchant, budget, quantity, rating, delivery, and approval controls.",
  confidence: 0.98,
  ambiguities: [],
  rules: [
    { id: "rule-category", field: "category", operator: "equals", value: "Computer accessories", effect: "allow", description: "Hardware accessories are allowed." },
    { id: "rule-merchants", field: "merchant", operator: "in", value: ["Merchant A", "CDW", "Staples Business"], effect: "block", description: "Block merchants outside the approved list." },
    { id: "rule-budget", field: "budget", operator: "lte", value: 50000, effect: "block", description: "Total must be at most $500." },
    { id: "rule-quantity", field: "quantity", operator: "lte", value: 12, effect: "block", description: "Quantity must be at most 12." },
    { id: "rule-rating", field: "seller_rating", operator: "gte", value: 4.2, effect: "block", description: "Seller rating must be at least 4.2." },
    { id: "rule-approval", field: "approval_threshold", operator: "gte", value: 25000, effect: "require_approval", description: "Manager approval is required at $250 or more." },
  ],
};

export async function POST(request: Request) {
  try {
    const context = await getRequestContext();
    const { text } = z.object({ text: z.string().min(20).max(20_000) }).parse(await request.json());
    const openai = await resolveOpenAiConnection(context.organizationId);
    if (context.mode === "live" && !openai) throw new RouteError("OPENAI_NOT_CONFIGURED", "Ask an organization administrator to connect OpenAI in Shared integrations.", 503, true);
    const parsed = openai ? await parsePolicy(text, openai.credentials) : demoPolicy;
    return ok(parsed, openai && context.mode === "live" ? "live" : "demo");
  } catch (error) { return routeError(error); }
}
