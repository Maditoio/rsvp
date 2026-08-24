"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Printer, Settings } from "lucide-react";
import type { BadgeListRow } from "@/modules/badges/service";
import { invalidateBadgeAndRequeue } from "@/modules/badges/actions";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { useToast } from "@/components/ui/toast";

function printUrl(
  orgSlug: string,
  eventId: string,
  attendeeIds: string[],
  options: { autoPrint?: boolean } = {},
) {
  const params = new URLSearchParams({
    ids: attendeeIds.join(","),
    ...(options.autoPrint ? { autoprint: "1" } : {}),
  });
  return `/app/${orgSlug}/events/${eventId}/badges/print?${params.toString()}`;
}

export function BadgesPanel({
  orgSlug,
  eventId,
  rows: initialRows,
  canPrint,
}: {
  orgSlug: string;
  eventId: string;
  rows: BadgeListRow[];
  canPrint: boolean;
}) {
  const toast = useToast();
  const [rows, setRows] = useState(initialRows);
  const [filter, setFilter] = useState<"all" | "queued" | "printed">("all");
  const [pending, start] = useTransition();

  const queuedIds = useMemo(
    () =>
      rows
        .filter((r) => r.hasQr && r.queueStatus === "QUEUED")
        .map((r) => r.attendeeId),
    [rows],
  );

  const filtered = useMemo(() => {
    if (filter === "queued") {
      return rows.filter((r) => r.queueStatus === "QUEUED");
    }
    if (filter === "printed") {
      return rows.filter((r) => r.queueStatus === "PRINTED");
    }
    return rows;
  }, [rows, filter]);

  function invalidate(row: BadgeListRow) {
    const ok = window.confirm(
      `Invalidate badge for ${row.firstName} ${row.lastName}?\n\nThe current badge QR will be denied at entrance. They return to the print queue for a replacement.`,
    );
    if (!ok) return;

    start(async () => {
      const result = await invalidateBadgeAndRequeue(
        orgSlug,
        eventId,
        row.attendeeId,
      );
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Invalidated — Badge #${result.data.printNumber} queued`);
      setRows((prev) =>
        prev.map((r) =>
          r.attendeeId === row.attendeeId
            ? {
                ...r,
                queueStatus: "QUEUED",
                queuedAt: new Date(),
                activePrintNumber: result.data.printNumber,
              }
            : r,
        ),
      );
      setFilter("queued");
    });
  }

  const columns: DataTableColumn<BadgeListRow>[] = [
    {
      id: "name",
      header: "Delegate",
      width: "2fr",
      cell: (row) => (
        <span className="font-medium text-slate-700">
          {row.firstName} {row.lastName}
        </span>
      ),
    },
    {
      id: "company",
      header: "Company",
      width: "1.5fr",
      cell: (row) => row.company ?? "—",
    },
    {
      id: "category",
      header: "Category",
      width: "1fr",
      cell: (row) => row.categoryName ?? "—",
    },
    {
      id: "status",
      header: "Badge",
      width: "1.4fr",
      cell: (row) => {
        if (!row.hasQr) {
          return <Badge tone="muted">No desk QR yet</Badge>;
        }
        if (row.queueStatus === "QUEUED") {
          return (
            <span className="inline-flex flex-wrap items-center gap-1">
              <Badge tone="warning">Waiting to print</Badge>
              {row.activePrintNumber ? (
                <Badge tone="muted">Badge #{row.activePrintNumber}</Badge>
              ) : (
                <Badge tone="muted">First issue</Badge>
              )}
            </span>
          );
        }
        if (row.queueStatus === "PRINTED") {
          return (
            <span className="inline-flex flex-wrap items-center gap-1">
              <Badge tone="success">Printed</Badge>
              <Badge tone="muted">
                Badge #{row.activePrintNumber ?? 1}
              </Badge>
            </span>
          );
        }
        return <Badge tone="accent">Ready</Badge>;
      },
    },
    {
      id: "actions",
      header: "",
      width: "1.4fr",
      cell: (row) =>
        row.hasQr && canPrint ? (
          <div className="flex justify-end gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                window.open(
                  printUrl(orgSlug, eventId, [row.attendeeId]),
                  "_blank",
                  "noopener",
                );
              }}
            >
              Preview
            </Button>
            {row.queueStatus === "PRINTED" ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={pending}
                onClick={() => invalidate(row)}
              >
                Invalidate
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  window.open(
                    printUrl(orgSlug, eventId, [row.attendeeId], {
                      autoPrint: true,
                    }),
                    "_blank",
                    "noopener",
                  );
                }}
              >
                Print
              </Button>
            )}
          </div>
        ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Event day"
        title="Badge printing"
        description="Desk check-in adds people to the print queue. Print marks Badge #1, #2, … Invalidate revokes the old QR and re-queues a replacement."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={`/app/${orgSlug}/events/${eventId}/day/badges`}>
              <Button type="button" variant="secondary">
                Event day queue
              </Button>
            </Link>
            <Link href={`/app/${orgSlug}/events/${eventId}/settings?tab=badges`}>
              <Button
                type="button"
                variant="secondary"
                leadingIcon={<Settings className="size-4" strokeWidth={1.75} />}
              >
                Badge settings
              </Button>
            </Link>
            {canPrint && queuedIds.length > 0 ? (
              <Button
                type="button"
                leadingIcon={<Printer className="size-4" strokeWidth={1.75} />}
                onClick={() => {
                  window.open(
                    printUrl(orgSlug, eventId, queuedIds, { autoPrint: true }),
                    "_blank",
                    "noopener",
                  );
                }}
              >
                Print queue ({queuedIds.length})
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["all", "All"],
            ["queued", "Waiting to print"],
            ["printed", "Printed"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={
              filter === key
                ? "rounded-full bg-indigo-50 px-3.5 py-1.5 text-sm font-medium text-indigo-700"
                : "rounded-full bg-white px-3.5 py-1.5 text-sm font-medium text-slate-600 shadow-sm hover:text-slate-900"
            }
          >
            {label}
          </button>
        ))}
      </div>

      <DataTable
        rows={filtered}
        columns={columns}
        getRowId={(row) => row.attendeeId}
        emptyMessage="No attendees match this filter."
        searchFilter={(row, query) => {
          const hay =
            `${row.firstName} ${row.lastName} ${row.company ?? ""} ${row.categoryName ?? ""}`.toLowerCase();
          return hay.includes(query);
        }}
      />
    </div>
  );
}
