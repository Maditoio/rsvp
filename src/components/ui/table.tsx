import { cn } from "@/lib/utils";
import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";

/** Shared HTML table primitives — prefer `DataTable` for list pages. */
export function Table({
  className,
  ...props
}: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
      <table
        className={cn(
          "aurora-table w-full text-left text-[0.84375rem] text-slate-700",
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
        "border-b border-slate-100 bg-white px-7 py-3.5 text-[0.71875rem] font-semibold tracking-[0.04em] text-slate-400 uppercase",
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
        "min-h-11 border-b border-slate-100 px-7 py-3.5 align-middle text-slate-600",
        className,
      )}
      {...props}
    />
  );
}
