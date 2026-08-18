import { cn } from "@/lib/utils";
import type { TextareaHTMLAttributes } from "react";

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-sm border border-stone-300 bg-stone-0 px-4 py-2.5 text-[0.9375rem] leading-[1.55] text-ink-700 placeholder:text-stone-400 outline-none",
        "focus:border-ink-700 focus:ring-3 focus:ring-ink-700/12",
        "disabled:cursor-not-allowed disabled:border-stone-200 disabled:bg-stone-100 disabled:text-stone-400",
        className,
      )}
      {...props}
    />
  );
}
