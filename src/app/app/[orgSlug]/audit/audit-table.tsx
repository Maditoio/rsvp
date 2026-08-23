"use client";

import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-table/data-table";

type AuditRow = {
  id: string;
  when: string;
  actorName: string | null;
  actorEmail: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  eventName: string | null;
};

export function AuditTable({ logs }: { logs: AuditRow[] }) {
  const columns: DataTableColumn<AuditRow>[] = [
    {
      id: "when",
      header: "When",
      width: "1.3fr",
      cell: (row) => (
        <span className="whitespace-nowrap text-slate-600">{row.when}</span>
      ),
    },
    {
      id: "actor",
      header: "Actor",
      width: "1.6fr",
      cell: (row) =>
        row.actorName || row.actorEmail ? (
          <div>
            <p className="font-medium text-slate-700">
              {row.actorName ?? "—"}
            </p>
            {row.actorEmail ? (
              <p className="text-xs text-slate-500">{row.actorEmail}</p>
            ) : null}
          </div>
        ) : (
          "—"
        ),
    },
    {
      id: "action",
      header: "Action",
      width: "1.4fr",
      cell: (row) => (
        <span className="font-mono text-[0.8125rem]">{row.action}</span>
      ),
    },
    {
      id: "resource",
      header: "Resource",
      width: "1.4fr",
      cell: (row) => (
        <div>
          <p>{row.resource}</p>
          {row.resourceId ? (
            <p className="font-mono text-xs text-slate-400">{row.resourceId}</p>
          ) : null}
        </div>
      ),
    },
    {
      id: "event",
      header: "Event",
      width: "1.2fr",
      cell: (row) => row.eventName ?? "—",
    },
  ];

  return (
    <DataTable
      rows={logs}
      columns={columns}
      getRowId={(row) => row.id}
      searchPlaceholder="Search audit logs…"
      searchFilter={(row, query) => {
        const haystack = [
          row.when,
          row.actorName,
          row.actorEmail,
          row.action,
          row.resource,
          row.resourceId,
          row.eventName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      }}
      emptyMessage="No audit entries yet."
      showRowsPerPage
      minRowHeight="double"
    />
  );
}
