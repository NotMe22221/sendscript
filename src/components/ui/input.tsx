import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn("focus-ring h-10 w-full rounded-[10px] border border-[#cfd5cc] bg-white px-3 text-sm text-[#111a2b] shadow-[0_1px_2px_rgba(11,23,40,.035)] transition-colors placeholder:text-[#9aa3b2] hover:border-[#b9c0b5] disabled:bg-[#f0f2ee]", className)}
      {...props}
    />
  ),
);
Input.displayName = "Input";
