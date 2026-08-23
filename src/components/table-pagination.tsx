"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DEFAULT_TABLE_PAGE_SIZE,
  visiblePageNumbers,
} from "@/components/data-table/use-table-query";

export const TABLE_PAGE_SIZE = DEFAULT_TABLE_PAGE_SIZE;

export function TablePagination({
  page,
  pageCount,
  total,
  pageSize = TABLE_PAGE_SIZE,
  onPageChange,
  showRowsPerPage = false,
  onPageSizeChange,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  showRowsPerPage?: boolean;
  onPageSizeChange?: (size: number) => void;
}) {
  if (total === 0 || pageCount <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const pages = visiblePageNumbers(page, pageCount);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-7 py-4">
      <div className="flex flex-wrap items-center gap-3">
        {showRowsPerPage && onPageSizeChange ? (
          <label className="flex items-center gap-2 text-[0.8125rem] text-slate-500">
            <span>Rows per page</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-[30px] rounded-full border border-slate-200 bg-white px-2.5 text-[0.8125rem] text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/12"
            >
              {[20, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <p className="text-[0.8125rem] text-slate-500">
          Showing {from}–{to} of {total}
        </p>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className={cn(
            "inline-flex size-[30px] items-center justify-center rounded-full text-slate-600 hover:bg-slate-100",
            "disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent",
          )}
        >
          <ChevronLeft className="size-4" strokeWidth={1.75} />
        </button>
        {pages.map((item, index) =>
          item === "ellipsis" ? (
            <span
              key={`e-${index}`}
              className="inline-flex size-[30px] items-center justify-center text-[0.8125rem] text-slate-400"
            >
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              aria-label={`Page ${item}`}
              aria-current={item === page ? "page" : undefined}
              onClick={() => onPageChange(item)}
              className={cn(
                "inline-flex size-[30px] items-center justify-center rounded-full text-[0.8125rem] font-semibold",
                item === page
                  ? "bg-indigo-600 text-white shadow-accent"
                  : "text-slate-600 hover:bg-slate-100",
              )}
            >
              {item}
            </button>
          ),
        )}
        <button
          type="button"
          aria-label="Next page"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
          className={cn(
            "inline-flex size-[30px] items-center justify-center rounded-full text-slate-600 hover:bg-slate-100",
            "disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent",
          )}
        >
          <ChevronRight className="size-4" strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}

export function paginate<T>(
  rows: T[],
  page: number,
  pageSize = TABLE_PAGE_SIZE,
) {
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * pageSize;
  return {
    page: safePage,
    pageCount,
    slice: rows.slice(start, start + pageSize),
  };
}
