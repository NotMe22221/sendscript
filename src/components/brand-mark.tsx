import { cn } from "@/lib/utils";

export function BrandMark({ compact = false, inverted = false, className }: { compact?: boolean; inverted?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className={cn("relative grid size-8 place-items-center overflow-hidden rounded-[9px] shadow-sm", inverted ? "bg-white" : "bg-[#102a56]")}>
        <span className="absolute left-[7px] top-[7px] h-[3px] w-[17px] rounded-full bg-[#84adff]" />
        <span className={cn("absolute left-[7px] top-[14px] h-[3px] w-[12px] rounded-full", inverted ? "bg-[#102a56]" : "bg-white")} />
        <span className="absolute left-[7px] top-[21px] h-[3px] w-[17px] rounded-full bg-[#84adff]" />
      </div>
      {!compact && <span className={cn("text-[17px] font-semibold tracking-[-.035em]", inverted ? "text-white" : "text-[#101828]")}>SpendScript</span>}
    </div>
  );
}
