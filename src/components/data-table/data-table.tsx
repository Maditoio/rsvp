"use client";

import { Search } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { TablePagination } from "@/components/table-pagination";
import {
  SEARCH_ROW_THRESHOLD,
  paginateRows,
  useTableQueryState,
} from "@/components/data-table/use-table-query";
import { cn } from "@/lib/utils";

export type DataTableColumn<T> = {
  id: string;
  header: ReactNode;
  /** CSS grid fraction, e.g. `2fr`. Last actions column should be `60px`. */
  width: string;
  cell: (row: T) => ReactNode;
  headerClassName?: string;
  cellClassName?: string;
};

export function DataTable<T>({
  rows,
  columns,
  getRowId,
  searchPlaceholder = "Search…",
  searchFilter,
  emptyMessage = "No rows yet.",
  filterSlot,
  showRowsPerPage = false,
  pageParam = "page",
  pageSizeParam = "pageSize",
  minRowHeight = "single",
  /** Use when rows are pre-filtered; search visibility still follows total list size. */
  searchThresholdCount,
  toolbar,
  getRowClassName,
}: {
  rows: T[];
  columns: DataTableColumn<T>[];
  getRowId: (row: T) => string;
  searchPlaceholder?: string;
  searchFilter?: (row: T, query: string) => boolean;
  emptyMessage?: string;
  filterSlot?: ReactNode;
  showRowsPerPage?: boolean;
  pageParam?: string;
  pageSizeParam?: string;
  minRowHeight?: "single" | "double";
  searchThresholdCount?: number;
  /** Optional content above the search/filter toolbar (e.g. bulk actions). */
  toolbar?: ReactNode;
  getRowClassName?: (row: T) => string | undefined;
}) {
  const { page, pageSize, setPage, setPageSize } = useTableQueryState({
    pageParam,
    pageSizeParam,
    allowRowsPerPage: showRowsPerPage,
  });
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query || !searchFilter) return rows;
    return rows.filter((row) => searchFilter(row, query));
  }, [rows, search, searchFilter]);

  const showSearch =
    (searchThresholdCount ?? rows.length) > SEARCH_ROW_THRESHOLD &&
    Boolean(searchFilter);
  const { page: safePage, pageCount, total, slice } = paginateRows(
    filtered,
    page,
    pageSize,
  );

  const template = columns.map((column) => column.width).join(" ");

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm">
      {toolbar ? (
        <div className="border-b border-slate-100 px-7 py-3.5">{toolbar}</div>
      ) : null}
      {showSearch || filterSlot ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-7 py-3.5">
          {showSearch ? (
            <label className="relative block w-[280px] max-w-full">
              <span className="sr-only">{searchPlaceholder}</span>
              <Search
                className="pointer-events-none absolute top-1/2 left-3.5 size-[15px] -translate-y-1/2 text-slate-400"
                strokeWidth={1.75}
                aria-hidden
              />
              <input
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  if (page !== 1) setPage(1);
                }}
                placeholder={searchPlaceholder}
                className="h-[38px] w-full rounded-full border border-slate-200 bg-slate-50 pr-4 pl-9 text-[0.84375rem] text-slate-900 outline-none placeholder:text-slate-400 shadow-xs focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/12"
              />
            </label>
          ) : null}
          {filterSlot}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <div role="table" className="min-w-full">
          <div
            role="row"
            className="grid min-w-[40rem] border-b border-slate-100 bg-white"
            style={{ gridTemplateColumns: template }}
          >
            {columns.map((column) => (
              <div
                key={column.id}
                role="columnheader"
                className={cn(
                  "px-7 py-3.5 text-[0.71875rem] font-semibold tracking-[0.04em] text-slate-400 uppercase",
                  column.headerClassName,
                )}
              >
                {column.header}
              </div>
            ))}
          </div>

          {slice.length === 0 ? (
            <div className="px-7 py-10 text-sm text-slate-500">{emptyMessage}</div>
          ) : (
            slice.map((row, index) => (
              <div
                key={getRowId(row)}
                role="row"
                className={cn(
                  "grid min-w-[40rem] items-center hover:bg-slate-50",
                  index < slice.length - 1 && "border-b border-slate-100",
                  minRowHeight === "double" ? "min-h-[58px]" : "min-h-11",
                  getRowClassName?.(row),
                )}
                style={{ gridTemplateColumns: template }}
              >
                {columns.map((column) => (
                  <div
                    key={column.id}
                    role="cell"
                    className={cn(
                      "px-7 py-3.5 text-[0.84375rem] text-slate-600",
                      column.cellClassName,
                    )}
                  >
                    {column.cell(row)}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>

      <TablePagination
        page={safePage}
        pageCount={pageCount}
        total={total}
        pageSize={pageSize}
        onPageChange={setPage}
        showRowsPerPage={showRowsPerPage}
        onPageSizeChange={showRowsPerPage ? setPageSize : undefined}
      />
    </div>
  );
}

export function TableFilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  allLabel: string;
}) {
  return (
    <label className="flex items-center gap-2 text-[0.8125rem] text-slate-500">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-[38px] w-auto max-w-[12rem] rounded-full border border-slate-200 bg-slate-50 px-3.5 text-[0.84375rem] text-slate-700 outline-none shadow-xs focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/12"
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
