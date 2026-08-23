"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export const DEFAULT_TABLE_PAGE_SIZE = 20;
export const SEARCH_ROW_THRESHOLD = 8;

export function useTableQueryState({
  pageParam = "page",
  pageSizeParam = "pageSize",
  defaultPageSize = DEFAULT_TABLE_PAGE_SIZE,
  allowRowsPerPage = false,
}: {
  pageParam?: string;
  pageSizeParam?: string;
  defaultPageSize?: number;
  allowRowsPerPage?: boolean;
} = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = Math.max(1, Number(searchParams.get(pageParam) ?? "1") || 1);
  const rawPageSize = Number(searchParams.get(pageSizeParam) ?? "");
  const pageSize =
    allowRowsPerPage && [20, 50, 100].includes(rawPageSize)
      ? rawPageSize
      : defaultPageSize;

  const replaceParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const setPage = useCallback(
    (next: number) => {
      replaceParams((params) => {
        if (next <= 1) params.delete(pageParam);
        else params.set(pageParam, String(next));
      });
    },
    [pageParam, replaceParams],
  );

  const setPageSize = useCallback(
    (next: number) => {
      replaceParams((params) => {
        if (!allowRowsPerPage || next === defaultPageSize) {
          params.delete(pageSizeParam);
        } else {
          params.set(pageSizeParam, String(next));
        }
        params.delete(pageParam);
      });
    },
    [
      allowRowsPerPage,
      defaultPageSize,
      pageParam,
      pageSizeParam,
      replaceParams,
    ],
  );

  return useMemo(
    () => ({
      page,
      pageSize,
      setPage,
      setPageSize,
    }),
    [page, pageSize, setPage, setPageSize],
  );
}

export function paginateRows<T>(
  rows: T[],
  page: number,
  pageSize: number,
) {
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * pageSize;
  return {
    page: safePage,
    pageCount,
    total: rows.length,
    slice: rows.slice(start, start + pageSize),
  };
}

/** Page numbers with ellipsis when more than 7 pages. */
export function visiblePageNumbers(
  page: number,
  pageCount: number,
): Array<number | "ellipsis"> {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }

  const pages = new Set<number>();
  pages.add(1);
  pages.add(pageCount);
  for (let i = page - 1; i <= page + 1; i += 1) {
    if (i >= 1 && i <= pageCount) pages.add(i);
  }
  if (page <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }
  if (page >= pageCount - 2) {
    pages.add(pageCount - 1);
    pages.add(pageCount - 2);
    pages.add(pageCount - 3);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const result: Array<number | "ellipsis"> = [];
  let prev = 0;
  for (const n of sorted) {
    if (prev && n - prev > 1) result.push("ellipsis");
    result.push(n);
    prev = n;
  }
  return result;
}
