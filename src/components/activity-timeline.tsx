import { Bot, Check, Circle, ShieldAlert, UserRound } from "lucide-react";
import type { ActivityEvent } from "@/lib/domain/schemas";
import { formatDateTime } from "@/lib/format";

export function ActivityTimeline({ events, compact = false }: { events: ActivityEvent[]; compact?: boolean }) {
  return (
    <div className="divide-y divide-[#eaecf0]">
      {events.map((event) => {
        const Icon = event.tone === "success" ? Check : event.tone === "danger" ? ShieldAlert : event.actor.includes("Maya") || event.actor.includes("Jordan") ? UserRound : event.actor === "SpendScript" || event.actor.includes("engine") ? Bot : Circle;
        const color = event.tone === "success" ? "bg-[#ecfdf3] text-[#067647]" : event.tone === "danger" ? "bg-[#fef3f2] text-[#b42318]" : event.tone === "info" ? "bg-[#eff4ff] text-[#155eef]" : "bg-[#f2f4f7] text-[#667085]";
        return (
          <div key={event.id} className="flex gap-3 py-3.5 first:pt-0 last:pb-0">
            <div className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full ${color}`}><Icon className="size-3.5" /></div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"><p className="text-sm font-medium text-[#344054]">{event.title}</p><time className="tabular text-[11px] text-[#98a2b3]">{formatDateTime(event.createdAt)}</time></div>
              {!compact && <p className="mt-1 text-xs leading-5 text-[#667085]">{event.detail}</p>}
              <p className="mt-1 text-[11px] text-[#98a2b3]">{event.actor}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
