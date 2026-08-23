"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Th } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type FilterOption = { value: string; label: string };

export function ColumnFilterTh({
  label,
  value,
  options,
  onChange,
  allLabel = "All",
}: {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  allLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const activeLabel =
    value === ""
      ? allLabel
      : options.find((o) => o.value === value)?.label ?? value;

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <Th className="relative">
      <div ref={rootRef} className="relative">
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1 uppercase tracking-[0.06em]",
            value ? "text-slate-900" : "text-slate-700",
          )}
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((v) => !v)}
        >
          {label}
          <ChevronDown className="size-3.5 opacity-70" aria-hidden />
        </button>
        {value ? (
          <span className="mt-0.5 block normal-case tracking-normal text-[0.6875rem] font-medium text-indigo-700">
            {activeLabel}
          </span>
        ) : null}
        {open ? (
          <div
            id={listId}
            className="absolute left-0 top-full z-20 mt-1 min-w-[10rem] rounded-xl bg-white shadow-sm py-1 shadow-md"
          >
            <button
              type="button"
              className={cn(
                "block w-full px-3 py-1.5 text-left text-sm normal-case tracking-normal",
                value === ""
                  ? "bg-slate-100 font-medium text-slate-900"
                  : "text-slate-700 hover:bg-slate-50",
              )}
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              {allLabel}
            </button>
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={cn(
                  "block w-full px-3 py-1.5 text-left text-sm normal-case tracking-normal",
                  value === opt.value
                    ? "bg-slate-100 font-medium text-slate-900"
                    : "text-slate-700 hover:bg-slate-50",
                )}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </Th>
  );
}
