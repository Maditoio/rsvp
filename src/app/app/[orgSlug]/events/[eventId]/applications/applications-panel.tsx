"use client";

import { Suspense, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import { decideApplication } from "@/modules/applications/actions";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-table/data-table";
import { ActionsMenu } from "@/components/data-table/actions-menu";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { StatusBadge } from "@/components/status-badge";
import { displayName, humanizeEnum } from "@/lib/utils";

type ApplicationRow = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  company: string | null;
  jobTitle: string | null;
  country: string | null;
  message: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
};

export function ApplicationsPanel({
  orgSlug,
  eventId,
  applications,
  canDecide,
}: {
  orgSlug: string;
  eventId: string;
  applications: ApplicationRow[];
  canDecide: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<ApplicationRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const columns: DataTableColumn<ApplicationRow>[] = [
    {
      id: "applicant",
      header: "Applicant",
      width: "2fr",
      cell: (row) => (
        <div>
          <p className="font-medium text-slate-700">{displayName(row)}</p>
          <p className="text-xs text-slate-500">{row.email}</p>
        </div>
      ),
    },
    {
      id: "organisation",
      header: "Organisation",
      width: "1.5fr",
      cell: (row) =>
        [row.jobTitle, row.company].filter(Boolean).join(" · ") || "—",
    },
    {
      id: "status",
      header: "Status",
      width: "1fr",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: "submitted",
      header: "Submitted",
      width: "1.2fr",
      cell: (row) => (
        <span className="whitespace-nowrap">{row.createdAt}</span>
      ),
    },
    ...(canDecide
      ? [
          {
            id: "actions",
            header: "",
            width: "60px",
            headerClassName: "sr-only",
            cellClassName: "justify-self-end",
            cell: (row: ApplicationRow) => (
              <ActionsMenu
                disabled={pending}
                items={[
                  {
                    id: "review",
                    label: "Review application",
                    icon: (
                      <Eye className="size-3.5 shrink-0" strokeWidth={1.75} />
                    ),
                    onSelect: () => {
                      setCurrent(row);
                      setError(null);
                      setOpen(true);
                    },
                  },
                ]}
              />
            ),
          } satisfies DataTableColumn<ApplicationRow>,
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[0.71875rem] font-semibold uppercase tracking-[0.04em] text-indigo-600">
          Public applications
        </p>
        <h1 className="mt-1 font-display text-3xl text-slate-900">Applications</h1>
        <p className="mt-1 text-[0.8125rem] text-slate-500">
          Approving creates an invitation. Rejected applicants do not gain event
          access.
        </p>
      </div>

      <Suspense fallback={<div className="h-40 rounded-xl bg-white shadow-sm" />}>
        <DataTable
          rows={applications}
          columns={columns}
          getRowId={(row) => row.id}
          searchPlaceholder="Search applications…"
          searchFilter={(row, query) => {
            const haystack = [
              displayName(row),
              row.email,
              row.company,
              row.jobTitle,
              row.status,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();
            return haystack.includes(query);
          }}
          emptyMessage="No applications yet."
          showRowsPerPage
          minRowHeight="double"
        />
      </Suspense>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Review application"
        description="Approve to issue an invitation, or reject without granting access."
      >
        {current ? (
          <form
            className="space-y-4"
            action={(formData) => {
              setError(null);
              start(async () => {
                try {
                  await decideApplication(orgSlug, eventId, formData);
                  setOpen(false);
                  router.refresh();
                } catch (e) {
                  setError(
                    e instanceof Error
                      ? e.message
                      : "Could not update application",
                  );
                }
              });
            }}
          >
            <input type="hidden" name="applicationId" value={current.id} />
            <p className="font-medium text-slate-700">{displayName(current)}</p>
            <p className="text-sm text-slate-700">{current.email}</p>
            {current.message ? (
              <p className="text-sm text-slate-700">{current.message}</p>
            ) : null}
            {current.status === "PENDING" ? (
              <div className="grid grid-cols-2 gap-2">
                <label className="rounded-md border border-slate-200 p-3 text-sm">
                  <input
                    type="radio"
                    name="decision"
                    value="approve"
                    required
                    className="mr-2"
                  />
                  Approve
                </label>
                <label className="rounded-md border border-slate-200 p-3 text-sm">
                  <input
                    type="radio"
                    name="decision"
                    value="reject"
                    required
                    className="mr-2"
                  />
                  Reject
                </label>
              </div>
            ) : (
              <p className="text-sm text-slate-700">
                Already {humanizeEnum(current.status)}.
              </p>
            )}
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            {current.status === "PENDING" ? (
              <div className="flex justify-end">
                <Button disabled={pending}>
                  {pending ? "Saving…" : "Record decision"}
                </Button>
              </div>
            ) : null}
          </form>
        ) : null}
      </Drawer>
    </div>
  );
}
