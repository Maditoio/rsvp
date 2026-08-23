"use client";

import { useMemo } from "react";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { StatusBadge } from "@/components/status-badge";
import { RegistrationStatusActions } from "@/app/app/[orgSlug]/events/[eventId]/registrations/registration-status-actions";
import { displayName } from "@/lib/utils";

type AttendeeRow = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  company: string | null;
  jobTitle: string | null;
  country: string | null;
  status: string;
  categoryName: string | null;
};

export function AttendeesTable({
  orgSlug,
  eventId,
  attendees,
  canWrite,
}: {
  orgSlug: string;
  eventId: string;
  attendees: AttendeeRow[];
  canWrite: boolean;
}) {
  const columns = useMemo<DataTableColumn<AttendeeRow>[]>(() => {
    const cols: DataTableColumn<AttendeeRow>[] = [
      {
        id: "name",
        header: "Name",
        width: "1.4fr",
        cell: (row) => (
          <span className="font-medium text-slate-700">{displayName(row)}</span>
        ),
      },
      {
        id: "email",
        header: "Email",
        width: "1.6fr",
        cell: (row) => row.email,
      },
      {
        id: "company",
        header: "Company",
        width: "1.2fr",
        cell: (row) => row.company ?? "—",
      },
      {
        id: "jobTitle",
        header: "Job title",
        width: "1.2fr",
        cell: (row) => row.jobTitle ?? "—",
      },
      {
        id: "country",
        header: "Country",
        width: "0.9fr",
        cell: (row) => row.country ?? "—",
      },
      {
        id: "category",
        header: "Category",
        width: "1fr",
        cell: (row) => row.categoryName ?? "—",
      },
      {
        id: "status",
        header: "Status",
        width: "1fr",
        cell: (row) => <StatusBadge status={row.status} />,
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
            kind="attendee"
            status={row.status}
          />
        ),
      });
    }

    return cols;
  }, [canWrite, eventId, orgSlug]);

  return (
    <DataTable
      rows={attendees}
      columns={columns}
      getRowId={(row) => row.id}
      searchPlaceholder="Search attendees…"
      searchFilter={(row, query) => {
        const haystack = [
          displayName(row),
          row.email,
          row.company,
          row.jobTitle,
          row.country,
          row.categoryName,
          row.status,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      }}
      emptyMessage="No attendees yet."
      showRowsPerPage
    />
  );
}
