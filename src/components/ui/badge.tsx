import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const variants = cva("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset", {
  variants: {
    tone: {
      neutral: "bg-[#f2f4f7] text-[#475467] ring-[#e4e7ec]",
      info: "bg-[#eff4ff] text-[#1849a9] ring-[#b2ccff]",
      success: "bg-[#ecfdf3] text-[#067647] ring-[#abefc6]",
      warning: "bg-[#fffaeb] text-[#b54708] ring-[#fedf89]",
      danger: "bg-[#fef3f2] text-[#b42318] ring-[#fecdca]",
      purple: "bg-[#f4f3ff] text-[#5925dc] ring-[#d9d6fe]",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export function Badge({ className, tone, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof variants>) {
  return <span className={cn(variants({ tone }), className)} {...props} />;
}
