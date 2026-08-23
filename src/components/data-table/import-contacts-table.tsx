"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";

export type ImportContactRow = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  company: string | null;
  jobTitle: string | null;
};

export function ImportContactsTable({
  contacts,
  selected,
  onToggleOne,
  onToggleAll,
  busy,
  nextCursor,
  onLoadMore,
  loadingMore,
  pageParam = "page",
}: {
  contacts: ImportContactRow[];
  selected: string[];
  onToggleOne: (id: string) => void;
  onToggleAll: () => void;
  busy: boolean;
  nextCursor: string | null;
  onLoadMore: () => void;
  loadingMore: boolean;
  pageParam?: string;
}) {
  const selectAllRef = useRef<HTMLInputElement>(null);
  const selectableIds = useMemo(
    () => contacts.filter((c) => c.email).map((c) => c.id),
    [contacts],
  );
  const allSelected =
    selectableIds.length > 0 &&
    selectableIds.every((id) => selected.includes(id));
  const someSelected =
    selectableIds.some((id) => selected.includes(id)) && !allSelected;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  const columns: DataTableColumn<ImportContactRow>[] = [
    {
      id: "select",
      header: (
        <input
          ref={selectAllRef}
          type="checkbox"
          checked={allSelected}
          onChange={onToggleAll}
          disabled={selectableIds.length === 0 || busy}
          aria-label="Select all on this list"
          className="size-4 accent-indigo-600"
        />
      ),
      width: "48px",
      headerClassName: "normal-case tracking-normal",
      cell: (contact) => (
        <input
          type="checkbox"
          checked={selected.includes(contact.id)}
          disabled={!contact.email || busy}
          onChange={() => onToggleOne(contact.id)}
          aria-label={`Select ${contact.email || contact.id}`}
          className="size-4 accent-indigo-600"
        />
      ),
    },
    {
      id: "firstName",
      header: "First name",
      width: "1.1fr",
      cell: (contact) => (
        <span className="text-slate-700">{contact.firstName || "—"}</span>
      ),
    },
    {
      id: "lastName",
      header: "Last name",
      width: "1.1fr",
      cell: (contact) => (
        <span className="text-slate-700">{contact.lastName || "—"}</span>
      ),
    },
    {
      id: "email",
      header: "Email",
      width: "1.6fr",
      cell: (contact) =>
        contact.email || <span className="text-slate-500">No email</span>,
    },
    {
      id: "company",
      header: "Company",
      width: "1.2fr",
      cell: (contact) => contact.company || "—",
    },
    {
      id: "jobTitle",
      header: "Job title",
      width: "1.2fr",
      cell: (contact) => contact.jobTitle || "—",
    },
  ];

  return (
    <div className="space-y-3">
      <Suspense fallback={<div className="h-40 rounded-xl bg-white shadow-sm" />}>
        <DataTable
          rows={contacts}
          columns={columns}
          getRowId={(row) => row.id}
          searchPlaceholder="Search contacts…"
          searchFilter={(row, query) => {
            const haystack = [
              row.firstName,
              row.lastName,
              row.email,
              row.company,
              row.jobTitle,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();
            return haystack.includes(query);
          }}
          emptyMessage="No contacts to show."
          showRowsPerPage
          pageParam={pageParam}
          getRowClassName={(row) => (!row.email ? "opacity-60" : undefined)}
        />
      </Suspense>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[0.8125rem] text-slate-500">
          Loaded {contacts.length} contact
          {contacts.length === 1 ? "" : "s"}
          {nextCursor ? " · more available" : ""}
        </p>
        {nextCursor ? (
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={onLoadMore}
          >
            {loadingMore ? "Loading…" : "Load more"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
