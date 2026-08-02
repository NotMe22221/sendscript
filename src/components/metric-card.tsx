import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";

export function MetricCard({
  label,
  value,
  detail,
  trend,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  trend?: "up" | "down";
  icon: LucideIcon;
}) {
  return (
    <Card className="group relative overflow-hidden p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#cbd1c7] hover:shadow-[0_12px_28px_rgba(11,23,40,.07)]">
      <span className="absolute inset-x-0 top-0 h-[2px] origin-left scale-x-0 bg-[#3157f6] transition-transform duration-300 group-hover:scale-x-100" />
      <div className="flex items-center justify-between">
        <span className="grid size-9 place-items-center rounded-[10px] border border-[#dce2ff] bg-[#f0f2ff] text-[#3157f6]"><Icon className="size-[17px]" /></span>
        {trend ? <span className={`flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${trend === "up" ? "bg-[#edfaf2] text-[#087443]" : "bg-[#fff3f1] text-[#b83127]"}`}>{trend === "up" ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}{detail}</span> : null}
      </div>
      <p className="mt-5 text-[12px] font-medium text-[#687386]">{label}</p>
      <p className="tabular mt-1 text-[28px] font-semibold tracking-[-.045em] text-[#111a2b]">{value}</p>
      {!trend ? <p className="mt-1.5 text-[11px] leading-5 text-[#8b95a5]">{detail}</p> : null}
    </Card>
  );
}
