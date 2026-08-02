import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = ["Request", "Requirements", "Source", "Review", "Authorize", "Execute"];

export function WorkflowStepper({ current }: { current: number }) {
  return (
    <ol className="mb-7 grid grid-cols-6 overflow-hidden rounded-2xl border border-[#dfe3dc] bg-white shadow-[0_1px_2px_rgba(11,23,40,.035)]" aria-label="Mission progress">
      {steps.map((step, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={step} className={cn("relative flex min-w-0 items-center gap-2.5 border-r border-[#e8ebe6] px-3 py-3.5 last:border-r-0 md:px-4", active && "bg-[#f0f2ff]")}>
            {active ? <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#3157f6]" /> : null}
            <span className={cn("grid size-5 shrink-0 place-items-center rounded-full border text-[10px] font-bold", done ? "border-[#15945a] bg-[#15945a] text-white" : active ? "border-[#3157f6] bg-[#3157f6] text-white" : "border-[#cfd5cc] bg-white text-[#9aa3b2]")}>
              {done ? <Check className="size-3" /> : active ? index + 1 : <Circle className="size-2 fill-current" />}
            </span>
            <span className={cn("hidden truncate text-xs font-medium md:inline", active ? "text-[#243d98]" : done ? "text-[#344054]" : "text-[#9aa3b2]")}>{step}</span>
          </li>
        );
      })}
    </ol>
  );
}
