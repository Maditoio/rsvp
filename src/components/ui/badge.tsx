import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Badge({
  className,
  tone = "default",
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  tone?: "success" | "warning" | "danger" | "info" | "muted" | "accent" | "default";
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-xs border-l-[3px] px-2.5 text-[0.8125rem] font-semibold",
        tone === "success" && "border-l-moss-500 bg-moss-100 text-moss-600",
        tone === "warning" && "border-l-bronze-500 bg-bronze-100 text-bronze-700",
        tone === "danger" && "border-l-danger bg-danger-bg text-danger",
        tone === "info" && "border-l-info bg-info-bg text-info",
        tone === "muted" && "border-l-stone-400 bg-stone-100 text-stone-700",
        tone === "accent" && "border-l-bronze-500 bg-bronze-100 text-bronze-700",
        tone === "default" && "border-l-ink-400 bg-ink-50 text-ink-700",
        className,
      )}
      {...props}
    />
  );
}
