import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-white p-6 text-slate-800 shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

export function DecisionCard({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-primary-600 p-6 text-white shadow-sm",
        className,
      )}
      {...props}
    />
  );
}
