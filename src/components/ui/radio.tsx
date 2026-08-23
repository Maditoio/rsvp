"use client";

import { cn } from "@/lib/utils";
import { forwardRef, type InputHTMLAttributes } from "react";

export const Radio = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Radio({ className, ...props }, ref) {
    return (
      <span className={cn("relative inline-flex shrink-0 size-[18px]", className)}>
        <input
          ref={ref}
          type="radio"
          className="peer absolute inset-0 z-10 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          {...props}
        />
        <span
          aria-hidden
          className={cn(
            "pointer-events-none flex size-[18px] items-center justify-center rounded-full border-2 border-slate-300 bg-white transition-colors duration-150",
            "peer-focus-visible:ring-4 peer-focus-visible:ring-indigo-500/12",
            "peer-checked:border-indigo-600",
            "peer-disabled:border-slate-200 peer-disabled:bg-slate-100",
            "peer-checked:[&_.radio-dot]:opacity-100",
          )}
        >
          <span className="radio-dot size-2 rounded-full bg-indigo-600 opacity-0 transition-opacity duration-150" />
        </span>
      </span>
    );
  },
);
