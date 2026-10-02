"use client";

import { useMemo, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { StatusBadge } from "@/components/status-badge";
import { RegistrationStatusActions } from "./registration-status-actions";
import {
  RegistrationAnswersDrawer,
  type RegistrationAnswerRow,
} from "./registration-answers-drawer";

type RegistrationRow = {
  id: string;
  name: string;
  email: string;
  invitationStatus: string | null;
  status: string;
  submittedAt: string;
  answers: RegistrationAnswerRow[];
};

export function RegistrationsTable({
  orgSlug,
  eventId,
  rows,
  canWrite,
  exportHref,
}: {
  orgSlug: string;
  eventId: string;
  rows: RegistrationRow[];
  canWrite: boolean;
  exportHref?: string | null;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = rows.find((row) => row.id === selectedId) ?? null;

  const columns = useMemo<DataTableColumn<RegistrationRow>[]>(() => {
    return [
      {
        id: "name",
        header: "Name",
        width: "1.5fr",
        cell: (row) => (
          <button
            type="button"
            onClick={() => setSelectedId(row.id)}
            className="text-left font-medium text-slate-700 hover:text-indigo-600"
          >
            {row.name}
          </button>
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
      {
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
            canWrite={canWrite}
            onView={() => setSelectedId(row.id)}
          />
        ),
      },
    ];
  }, [canWrite, eventId, orgSlug]);

  return (
    <>
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
            ...row.answers.map((answer) => `${answer.label} ${answer.value}`),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return haystack.includes(query);
        }}
        emptyMessage="No registration responses yet."
        showRowsPerPage
        toolbar={
          exportHref ? (
            <div className="flex justify-end">
              <a
                href={exportHref}
                className="inline-flex h-9 items-center rounded-full bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Export CSV
              </a>
            </div>
          ) : null
        }
      />
      <RegistrationAnswersDrawer
        open={Boolean(selected)}
        onClose={() => setSelectedId(null)}
        name={selected?.name ?? ""}
        email={selected?.email ?? ""}
        status={selected?.status ?? ""}
        submittedAt={selected?.submittedAt ?? ""}
        answers={selected?.answers ?? []}
      />
    </>
  );
}
