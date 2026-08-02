import { z } from "zod";
import { ok, getRequestContext, routeError, RouteError } from "@/lib/api/route";
import { extractMission } from "@/lib/providers/openai";
import { resolveOpenAiConnection } from "@/lib/integrations/shared";

export async function POST(request: Request) {
  try {
    const context = await getRequestContext();
    const { prompt } = z.object({ prompt: z.string().min(12).max(5000) }).parse(await request.json());
    const openai = await resolveOpenAiConnection(context.organizationId);
    if (!openai) throw new RouteError("OPENAI_NOT_CONFIGURED", "Ask an organization administrator to connect OpenAI in Shared integrations.", 503, true);
    const requirements = await extractMission(prompt, openai.credentials);
    return ok({ requirements }, "live");
  } catch (error) { return routeError(error); }
}
