import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

const DOT: Record<string, string> = {
  success: "bg-[#10B981]",
  warning: "bg-[#F59E0B]",
  danger: "bg-[#EF4444]",
  info: "bg-[#3B82F6]",
  muted: "bg-slate-400",
  accent: "bg-violet-500",
  default: "bg-indigo-500",
};

export function Badge({
  className,
  tone = "default",
  showDot = true,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  tone?: "success" | "warning" | "danger" | "info" | "muted" | "accent" | "default";
  /** Status pills show a leading dot; category tags can opt out. */
  showDot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[0.71875rem] font-semibold",
        tone === "success" && "bg-success-bg text-success",
        tone === "warning" && "bg-warning-bg text-warning",
        tone === "danger" && "bg-danger-bg text-danger",
        tone === "info" && "bg-info-bg text-info",
        tone === "muted" && "bg-slate-100 text-slate-600",
        tone === "accent" && "bg-violet-500/10 text-violet-700",
        tone === "default" && "bg-indigo-50 text-indigo-700",
        className,
      )}
      {...props}
    >
      {showDot ? (
        <span
          className={cn("size-1.5 shrink-0 rounded-full", DOT[tone])}
          aria-hidden
        />
      ) : null}
      {children}
    </span>
  );
}
