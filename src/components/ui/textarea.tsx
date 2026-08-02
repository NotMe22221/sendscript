import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn("focus-ring min-h-28 w-full resize-y rounded-[10px] border border-[#cfd5cc] bg-white px-3 py-2.5 text-sm leading-6 text-[#111a2b] shadow-[0_1px_2px_rgba(11,23,40,.035)] transition-colors placeholder:text-[#9aa3b2] hover:border-[#b9c0b5]", className)}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";
