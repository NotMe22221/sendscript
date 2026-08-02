import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        {eyebrow && <p className="mb-2 text-[11px] font-semibold uppercase tracking-[.14em] text-[#3157f6]">{eyebrow}</p>}
        <h1 className="text-[30px] font-semibold leading-[1.12] tracking-[-.045em] text-[#111a2b] md:text-[36px]">{title}</h1>
        {description && <p className="mt-2.5 max-w-3xl text-sm leading-6 text-[#687386]">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
