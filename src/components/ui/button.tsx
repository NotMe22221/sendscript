import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "focus-ring inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[10px] px-4 text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4",
  {
    variants: {
      variant: {
        primary: "bg-[#3157f6] !text-white shadow-[0_6px_16px_rgba(49,87,246,.2)] hover:-translate-y-px hover:bg-[#2548dd] hover:shadow-[0_9px_22px_rgba(49,87,246,.25)]",
        secondary: "border border-[#cfd5cc] bg-white text-[#344054] shadow-[0_1px_2px_rgba(11,23,40,.04)] hover:border-[#b9c0b5] hover:bg-[#f8f9f6]",
        ghost: "text-[#526075] hover:bg-[#e8ebe5] hover:text-[#111a2b]",
        danger: "bg-[#c43225] !text-white shadow-sm hover:bg-[#a92b21]",
        soft: "bg-[#eef1ff] text-[#2742a1] hover:bg-[#dfe5ff]",
      },
      size: {
        sm: "h-8 rounded-lg px-3 text-xs",
        md: "h-10 px-4",
        lg: "h-11 px-5",
        icon: "size-10 px-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
