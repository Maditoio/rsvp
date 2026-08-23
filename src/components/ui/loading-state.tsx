"use client";

import { cn } from "@/lib/utils";

export function PageLoadingState({
  title = "Loading",
  detail = "Preparing data and interface...",
  blocks = 3,
  className,
}: {
  title?: string;
  detail?: string;
  blocks?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-6", className)} aria-busy="true" aria-live="polite">
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <p className="text-[0.71875rem] font-semibold uppercase tracking-[0.04em] text-indigo-600">
          {title}
        </p>
        <p className="mt-2 text-sm text-slate-600">{detail}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: blocks }).map((_, index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-xl bg-white shadow-sm"
          />
        ))}
      </div>
    </div>
  );
}
