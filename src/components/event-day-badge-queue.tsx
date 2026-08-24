"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { IdCard, Printer, Ban } from "lucide-react";
import type { BadgeQueueRow } from "@/modules/badges/queue";
import { invalidateBadgeAndRequeue } from "@/modules/badges/actions";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

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

function formatTime(value: Date | null) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function EventDayBadgeQueue({
  orgSlug,
  eventId,
  rows: initialRows,
}: {
  orgSlug: string;
  eventId: string;
  rows: BadgeQueueRow[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [rows, setRows] = useState(initialRows);
  const [filter, setFilter] = useState<"queued" | "printed" | "all">("queued");
  const [pending, start] = useTransition();

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [router]);

  const queuedCount = useMemo(
    () => rows.filter((r) => r.status === "QUEUED").length,
    [rows],
  );

  const filtered = useMemo(() => {
    if (filter === "queued") return rows.filter((r) => r.status === "QUEUED");
    if (filter === "printed") return rows.filter((r) => r.status === "PRINTED");
    return rows;
  }, [rows, filter]);

  function openPrint(attendeeId: string) {
    window.open(
      printUrl(orgSlug, eventId, [attendeeId], { autoPrint: true }),
      "_blank",
      "noopener",
    );
  }

  function invalidate(row: BadgeQueueRow) {
    const nextNumber = (row.activePrintNumber ?? 0) + 1;
    const ok = window.confirm(
      `Invalidate badge for ${row.firstName} ${row.lastName}?\n\nThe current badge QR will be denied at entrance. They will return to the print queue for Badge #${nextNumber}.`,
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
      toast.success(
        `Badge invalidated — Badge #${result.data.printNumber} is in the queue`,
      );
      setRows((prev) =>
        prev.map((r) =>
          r.attendeeId === row.attendeeId
            ? {
                ...r,
                status: "QUEUED",
                queuedAt: new Date(),
                activePrintNumber: result.data.printNumber,
              }
            : r,
        ),
      );
      setFilter("queued");
      router.refresh();
    });
  }

  const columns: DataTableColumn<BadgeQueueRow>[] = [
    {
      id: "name",
      header: "Delegate",
      width: "2fr",
      cell: (row) => (
        <div>
          <p className="font-medium text-slate-900">
            {row.firstName} {row.lastName}
          </p>
          <p className="text-xs text-slate-500">
            {row.company || "Company not listed"}
          </p>
        </div>
      ),
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
      width: "1.4fr",
      cell: (row) => (
        <span className="inline-flex flex-wrap items-center gap-1.5">
          {row.status === "QUEUED" ? (
            <Badge tone="warning">Waiting to print</Badge>
          ) : (
            <Badge tone="success">Printed</Badge>
          )}
          {row.activePrintNumber ? (
            <Badge tone="muted">Badge #{row.activePrintNumber}</Badge>
          ) : row.status === "QUEUED" ? (
            <Badge tone="muted">First issue</Badge>
          ) : null}
        </span>
      ),
    },
    {
      id: "times",
      header: "Queued",
      width: "0.8fr",
      cell: (row) => (
        <span className="text-sm text-slate-600">{formatTime(row.queuedAt)}</span>
      ),
    },
    {
      id: "actions",
      header: "",
      width: "1.4fr",
      cell: (row) => (
        <div className="flex justify-end gap-1.5">
          {row.status === "QUEUED" ? (
            <Button
              type="button"
              size="sm"
              disabled={pending}
              leadingIcon={<Printer className="size-3.5" strokeWidth={1.75} />}
              onClick={() => openPrint(row.attendeeId)}
            >
              Print
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={pending}
              leadingIcon={<Ban className="size-3.5" strokeWidth={1.75} />}
              onClick={() => invalidate(row)}
            >
              Invalidate
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Card className="!p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-indigo-50">
              <IdCard
                className="size-5 text-indigo-600"
                strokeWidth={1.75}
                aria-hidden
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Badge print queue
              </p>
              <p className="mt-0.5 text-sm text-slate-600">
                Desk check-in adds people here. Print issues Badge #1, #2, …
                Invalidate revokes the old QR and re-queues a replacement.
              </p>
            </div>
          </div>
          <Badge tone={queuedCount > 0 ? "warning" : "muted"}>
            {queuedCount} waiting
          </Badge>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["queued", "Waiting"],
            ["printed", "Printed"],
            ["all", "All"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={cn(
              "inline-flex h-8 items-center rounded-full px-3.5 text-sm font-medium transition-colors duration-150",
              filter === key
                ? "bg-indigo-50 text-indigo-700"
                : "bg-white text-slate-600 shadow-sm hover:text-slate-900",
            )}
          >
            {label}
            {key === "queued" ? ` (${queuedCount})` : ""}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        getRowId={(row) => row.badgeId}
        emptyMessage={
          filter === "queued"
            ? "Queue is clear — checked-in delegates appear here until printed."
            : filter === "printed"
              ? "No printed badges yet."
              : "No badges yet — complete a desk check-in to start the queue."
        }
        searchFilter={(row, query) => {
          const hay =
            `${row.firstName} ${row.lastName} ${row.company ?? ""} ${row.categoryName ?? ""}`.toLowerCase();
          return hay.includes(query);
        }}
        searchPlaceholder="Search queue…"
      />
    </div>
  );
}
