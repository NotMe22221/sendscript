import { z } from "zod";
import { ok, getRequestContext, routeError, RouteError } from "@/lib/api/route";
import { extractMission } from "@/lib/providers/openai";
import { resolveOpenAiConnection } from "@/lib/integrations/shared";

const InputSchema = z.object({ prompt: z.string().min(12).max(5000) });

export async function POST(request: Request) {
  try {
    const context = await getRequestContext();
    const { prompt } = InputSchema.parse(await request.json());
    const openai = await resolveOpenAiConnection(context.organizationId);
    if (!openai) throw new RouteError("OPENAI_NOT_CONFIGURED", "Ask an organization administrator to connect OpenAI in Shared integrations.", 503, true);
    const requirements = await extractMission(prompt, openai.credentials);
    const { data, error } = await context.supabase.rpc("create_mission_with_requirements", {
        p_organization_id: context.organizationId,
        p_title: requirements.title,
        p_source_prompt: prompt,
        p_requirements: requirements,
      });
      if (error || !data) throw new Error(`DATABASE_MISSION_CREATE_FAILED:${error?.code ?? "NO_ID"}`);
    const missionId = String(data);
    const { error: modelRecordError } = await context.supabase.from("mission_requirements").update({ model_name: openai.credentials.model, model_input: { prompt }, model_output: requirements }).eq("mission_id", missionId);
    if (modelRecordError) throw new Error(`DATABASE_MODEL_RECORD_FAILED:${modelRecordError.code}`);
    return ok({ missionId, requirements }, "live", 201);
  } catch (error) { return routeError(error); }
}
