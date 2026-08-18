import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-md border border-stone-200 bg-stone-0 p-6 shadow-none",
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
        "rounded-sm border-[1.5px] border-ink-700 bg-ink-700 p-6 text-white",
        className,
      )}
      {...props}
    />
  );
}
