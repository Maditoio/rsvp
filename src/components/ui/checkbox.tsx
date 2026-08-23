"use client";

import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { forwardRef, type InputHTMLAttributes } from "react";

export const Checkbox = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Checkbox({ className, ...props }, ref) {
    return (
      <span className={cn("relative inline-flex shrink-0 size-[18px]", className)}>
        <input
          ref={ref}
          type="checkbox"
          className="peer absolute inset-0 z-10 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          {...props}
        />
        <span
          aria-hidden
          className={cn(
            "pointer-events-none flex size-[18px] items-center justify-center rounded-sm border border-slate-300 bg-white transition-colors duration-150",
            "peer-focus-visible:ring-4 peer-focus-visible:ring-indigo-500/12",
            "peer-checked:border-indigo-600 peer-checked:bg-indigo-600",
            "peer-indeterminate:border-indigo-600 peer-indeterminate:bg-indigo-600",
            "peer-disabled:border-slate-200 peer-disabled:bg-slate-100",
            "peer-checked:[&_.checkbox-check]:opacity-100",
            "peer-indeterminate:[&_.checkbox-check]:opacity-0",
            "peer-indeterminate:[&_.checkbox-minus]:opacity-100",
          )}
        >
          <Check
            strokeWidth={3}
            className="checkbox-check size-3 text-white opacity-0"
          />
          <Minus
            strokeWidth={3}
            className="checkbox-minus absolute size-3 text-white opacity-0"
          />
        </span>
      </span>
    );
  },
);
