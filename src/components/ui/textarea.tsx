import { cn } from "@/lib/utils";
import type { TextareaHTMLAttributes } from "react";

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-2.5 text-[0.84375rem] leading-[1.55] text-slate-900 placeholder:text-slate-400 outline-none shadow-xs",
        "focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/12",
        "disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400",
        className,
      )}
      {...props}
    />
  );
}
