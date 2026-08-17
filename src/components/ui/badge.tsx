import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Badge({
  className,
  tone = "accent",
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  tone?: "accent" | "slate" | "success" | "warning" | "error" | "muted";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tone === "accent" && "bg-accent-200 text-accent-700",
        tone === "slate" && "bg-slate-500 text-white",
        tone === "success" && "bg-success-100 text-success-500",
        tone === "warning" && "bg-warning-100 text-warning-500",
        tone === "error" && "bg-error-100 text-error-500",
        tone === "muted" && "bg-slate-100 text-slate-600",
        className,
      )}
      {...props}
    />
  );
}
