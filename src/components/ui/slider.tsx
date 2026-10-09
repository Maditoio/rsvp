"use client";

import { cn } from "@/lib/utils";
import type { InputHTMLAttributes } from "react";

export function Slider({
  className,
  style,
  min = 0,
  max = 100,
  value,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const lo = Number(min);
  const hi = Number(max);
  const current = Number(value ?? lo);
  const pct =
    hi > lo
      ? Math.min(100, Math.max(0, ((current - lo) / (hi - lo)) * 100))
      : 0;

  return (
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      className={cn(
        "h-1.5 w-full cursor-pointer appearance-none rounded-full bg-transparent outline-none",
        "[&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-transparent",
        "[&::-webkit-slider-thumb]:-mt-[5px] [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-indigo-600 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_1px_2px_rgba(15,23,42,0.12)] [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-150",
        "[&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent",
        "[&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-indigo-600 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-[0_1px_2px_rgba(15,23,42,0.12)] [&::-moz-range-thumb]:transition-transform [&::-moz-range-thumb]:duration-150",
        "hover:[&::-webkit-slider-thumb]:scale-110 hover:[&::-moz-range-thumb]:scale-110",
        "focus-visible:[&::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgba(99,102,241,0.18)] focus-visible:[&::-moz-range-thumb]:shadow-[0_0_0_4px_rgba(99,102,241,0.18)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      style={{
        background: `linear-gradient(to right, var(--color-indigo-200) 0%, var(--color-indigo-600) ${pct}%, var(--color-slate-100) ${pct}%, var(--color-slate-100) 100%)`,
        ...style,
      }}
      {...props}
    />
  );
}
