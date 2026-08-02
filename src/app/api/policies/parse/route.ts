import { z } from "zod";
import { getRequestContext, ok, routeError, RouteError } from "@/lib/api/route";
import { parsePolicy } from "@/lib/providers/openai";
import { resolveOpenAiConnection } from "@/lib/integrations/shared";

export async function POST(request: Request) {
  try {
    const context = await getRequestContext();
    const { text } = z.object({ text: z.string().min(20).max(20_000) }).parse(await request.json());
    const openai = await resolveOpenAiConnection(context.organizationId);
    if (!openai) throw new RouteError("OPENAI_NOT_CONFIGURED", "Ask an organization administrator to connect OpenAI in Shared integrations.", 503, true);
    const parsed = await parsePolicy(text, openai.credentials);
    return ok(parsed, "live");
  } catch (error) { return routeError(error); }
}
