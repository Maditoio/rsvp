"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function MoreOptions({
  label = "More options",
  lessLabel = "Fewer options",
  defaultOpen = false,
  children,
}: {
  label?: string;
  lessLabel?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="-ml-2.5 inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-xs font-semibold text-slate-600 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-900"
      >
        {open ? lessLabel : label}
        <ChevronDown
          className={cn(
            "size-3.5 transition-transform duration-200",
            open && "rotate-180",
          )}
          strokeWidth={2}
          aria-hidden
        />
      </button>
      {open ? (
        <div id={panelId} className="mt-3 space-y-3">
          {children}
        </div>
      ) : null}
    </div>
  );
}
