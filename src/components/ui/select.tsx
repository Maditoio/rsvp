import { cn } from "@/lib/utils";
import type { SelectHTMLAttributes } from "react";

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-[42px] w-full rounded-sm border border-stone-300 bg-stone-0 px-4 text-[0.9375rem] leading-[1.55] text-ink-700 outline-none",
        "focus:border-ink-700 focus:ring-3 focus:ring-ink-700/12",
        "disabled:cursor-not-allowed disabled:border-stone-200 disabled:bg-stone-100 disabled:text-stone-400",
        "aria-invalid:border-danger aria-invalid:focus:border-danger aria-invalid:focus:ring-danger/12",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
