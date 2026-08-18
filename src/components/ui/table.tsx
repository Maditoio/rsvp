import { cn } from "@/lib/utils";
import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";

export function Table({
  className,
  ...props
}: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto rounded-md border border-stone-200 bg-stone-0">
      <table
        className={cn(
          "w-full text-left text-[0.9375rem] text-ink-700",
          className,
        )}
        {...props}
      />
    </div>
  );
}

export function Th({
  className,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "bg-stone-50 px-5 py-3 text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-stone-700",
        className,
      )}
      {...props}
    />
  );
}

export function Td({
  className,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn(
        "h-11 border-b border-stone-100 px-5 align-middle text-stone-700",
        className,
      )}
      {...props}
    />
  );
}
