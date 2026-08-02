import { getRequestContext, ok, routeError } from "@/lib/api/route";
import { demoEvents } from "@/lib/domain/demo";
import type { ActivityEvent } from "@/lib/domain/schemas";

function toneFor(type: string): ActivityEvent["tone"] {
  if (/(succeeded|completed|approved|active)/i.test(type)) return "success";
  if (/(blocked|failed|rejected|revoked|cancelled)/i.test(type)) return "danger";
  if (/(created|evaluated|authorized|decision)/i.test(type)) return "info";
  return "neutral";
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getRequestContext(); const { id } = await params;
    if (context.mode === "live" && context.supabase) {
      const { data, error } = await context.supabase.from("activity_events").select("id,mission_id,event_type,title,detail,actor_label,created_at").eq("mission_id", id).order("created_at", { ascending: false });
      if (error) throw new Error(`DATABASE_TIMELINE_FAILED:${error.code}`);
      const events: ActivityEvent[] = (data ?? []).map((event) => ({
        id: String(event.id),
        missionId: String(event.mission_id),
        type: String(event.event_type),
        title: String(event.title),
        detail: String(event.detail),
        actor: String(event.actor_label),
        createdAt: String(event.created_at),
        tone: toneFor(String(event.event_type)),
      }));
      return ok({ events }, "live");
    }
    return ok({ events: demoEvents }, "demo");
  } catch (error) { return routeError(error); }
}
