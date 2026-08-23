"use client";

import { useMemo } from "react";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { StatusBadge } from "@/components/status-badge";
import { RegistrationStatusActions } from "./registration-status-actions";
import { displayName } from "@/lib/utils";

type RegistrationRow = {
  id: string;
  name: string;
  email: string;
  invitationStatus: string | null;
  status: string;
  submittedAt: string;
};

export function RegistrationsTable({
  orgSlug,
  eventId,
  rows,
  canWrite,
}: {
  orgSlug: string;
  eventId: string;
  rows: RegistrationRow[];
  canWrite: boolean;
}) {
  const columns = useMemo<DataTableColumn<RegistrationRow>[]>(() => {
    const cols: DataTableColumn<RegistrationRow>[] = [
      {
        id: "name",
        header: "Name",
        width: "1.5fr",
        cell: (row) => (
          <span className="font-medium text-slate-700">{row.name}</span>
        ),
      },
      {
        id: "email",
        header: "Email",
        width: "1.6fr",
        cell: (row) => row.email,
      },
      {
        id: "invitation",
        header: "Invitation",
        width: "1.1fr",
        cell: (row) =>
          row.invitationStatus ? (
            <StatusBadge status={row.invitationStatus} />
          ) : (
            "—"
          ),
      },
      {
        id: "registration",
        header: "Registration",
        width: "1.1fr",
        cell: (row) => <StatusBadge status={row.status} />,
      },
      {
        id: "submitted",
        header: "Submitted",
        width: "1.2fr",
        cell: (row) => (
          <span className="whitespace-nowrap">{row.submittedAt}</span>
        ),
      },
    ];

    if (canWrite) {
      cols.push({
        id: "actions",
        header: "",
        width: "60px",
        headerClassName: "sr-only",
        cellClassName: "justify-self-end",
        cell: (row) => (
          <RegistrationStatusActions
            orgSlug={orgSlug}
            eventId={eventId}
            subjectId={row.id}
            kind="registration"
            status={row.status}
          />
        ),
      });
    }

    return cols;
  }, [canWrite, eventId, orgSlug]);

  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(row) => row.id}
      searchPlaceholder="Search registrations…"
      searchFilter={(row, query) => {
        const haystack = [
          row.name,
          row.email,
          row.invitationStatus,
          row.status,
          row.submittedAt,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      }}
      emptyMessage="No registration responses yet."
      showRowsPerPage
    />
  );
}
