import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border-0 bg-white p-6 shadow-sm",
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
        "rounded-xl border-0 bg-indigo-600 p-6 text-white shadow-accent",
        className,
      )}
      {...props}
    />
  );
}
