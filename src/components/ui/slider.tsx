"use client";

import { cn } from "@/lib/utils";
import type { InputHTMLAttributes } from "react";

export function Slider({
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  return (
    <input
      type="range"
      className={cn(
        "h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-indigo-600",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/12",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
