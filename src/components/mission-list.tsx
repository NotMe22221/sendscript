"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { WorkspaceMission } from "@/lib/data/workspace";
import { formatMoney } from "@/lib/format";

type MissionFilter = "all" | "approval" | "blocked" | "completed";

export function MissionList({ missions, mode }: { missions: WorkspaceMission[]; mode: "live" | "demo" }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<MissionFilter>("all");
  const visible = useMemo(() => missions.filter((mission) => {
    const matchesQuery = `${mission.reference} ${mission.title} ${mission.owner}`.toLowerCase().includes(query.trim().toLowerCase());
    const matchesFilter = filter === "all"
      || (filter === "approval" && mission.status === "AWAITING_APPROVAL")
      || (filter === "blocked" && mission.status === "BLOCKED")
      || (filter === "completed" && mission.status === "COMPLETED");
    return matchesQuery && matchesFilter;
  }), [missions, query, filter]);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-[#eaecf0] p-4">
        <label className="relative min-w-[220px] flex-1">
          <span className="sr-only">Search missions</span>
          <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-[#98a2b3]" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="focus-ring h-9 w-full rounded-lg border border-[#d0d5dd] pl-9 pr-3 text-sm" placeholder="Search missions…" />
        </label>
        <select value={filter} onChange={(event) => setFilter(event.target.value as MissionFilter)} className="focus-ring h-9 rounded-lg border border-[#d0d5dd] bg-white px-3 text-sm text-[#475467]" aria-label="Filter mission status">
          <option value="all">All statuses</option>
          <option value="approval">Needs approval</option>
          <option value="blocked">Blocked</option>
          <option value="completed">Completed</option>
        </select>
      </div>
      {visible.length === 0 ? (
        <div className="px-6 py-14 text-center"><p className="text-sm font-semibold text-[#344054]">No missions match this view</p><p className="mt-1 text-xs text-[#667085]">Change the search or status filter, or create a new purchasing mission.</p></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-[#f9fafb] text-[11px] uppercase tracking-[.05em] text-[#667085]"><tr><th className="px-5 py-3">ID</th><th className="px-5 py-3">Mission</th><th className="px-5 py-3">Owner</th><th className="px-5 py-3">Budget</th><th className="px-5 py-3">Status</th><th /></tr></thead>
            <tbody className="divide-y divide-[#eaecf0]">{visible.map((mission) => {
              const stage = mission.status === "DRAFT" || mission.status === "ANALYZING" || mission.status === "SOURCING" ? "source" : mission.status === "AWAITING_APPROVAL" || mission.status === "POLICY_REVIEW" ? "review" : "execute";
              return <tr key={mission.id} className="hover:bg-[#fcfcfd]"><td className="tabular px-5 py-4 font-mono text-xs text-[#667085]">{mission.reference}</td><td className="px-5 py-4 font-medium">{mission.title}</td><td className="px-5 py-4 text-[#667085]">{mission.owner}</td><td className="tabular px-5 py-4 font-medium">{mission.budgetCents ? formatMoney(mission.budgetCents) : "Pending"}</td><td className="px-5 py-4"><StatusBadge status={mission.status} /></td><td className="px-5 py-4 text-right"><Button variant="ghost" size="sm" asChild><Link href={`/missions/${mission.id}/${stage}`}>Open<ArrowRight /></Link></Button></td></tr>;
            })}</tbody>
          </table>
        </div>
      )}
      <div className="border-t border-[#eaecf0] bg-[#fafbf8] px-5 py-3 text-[11px] text-[#7d8797]">{mode === "live" ? "Shared organization data · updates are visible to every member" : "Seeded preview · connect Supabase to share this workspace"}</div>
    </Card>
  );
}
