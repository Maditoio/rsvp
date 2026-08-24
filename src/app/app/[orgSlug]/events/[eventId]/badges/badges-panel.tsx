"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Printer, Settings } from "lucide-react";
import type { BadgeListRow } from "@/modules/badges/service";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

function printUrl(
  orgSlug: string,
  eventId: string,
  attendeeIds: string[],
  options: { autoPrint?: boolean; reprint?: boolean } = {},
) {
  const params = new URLSearchParams({
    ids: attendeeIds.join(","),
    ...(options.autoPrint ? { autoprint: "1" } : {}),
    ...(options.reprint ? { reprint: "1" } : {}),
  });
  return `/app/${orgSlug}/events/${eventId}/badges/print?${params.toString()}`;
}

export function BadgesPanel({
  orgSlug,
  eventId,
  rows,
  canPrint,
}: {
  orgSlug: string;
  eventId: string;
  rows: BadgeListRow[];
  canPrint: boolean;
}) {
  const [filter, setFilter] = useState<"all" | "unprinted" | "ready">("all");

  const unprintedIds = useMemo(
    () =>
      rows.filter((r) => r.hasQr && !r.printedAt).map((r) => r.attendeeId),
    [rows],
  );

  const filtered = useMemo(() => {
    if (filter === "unprinted") {
      return rows.filter((r) => r.hasQr && !r.printedAt);
    }
    if (filter === "ready") {
      return rows.filter((r) => r.hasQr);
    }
    return rows;
  }, [rows, filter]);

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
      header: "Print",
      width: "1fr",
      cell: (row) => {
        if (!row.hasQr) {
          return <Badge tone="muted">No QR yet</Badge>;
        }
        if (row.printedAt) {
          return (
            <span className="inline-flex flex-wrap items-center gap-1">
              <Badge tone="success">Printed</Badge>
              {row.activePrintNumber && row.activePrintNumber > 1 ? (
                <Badge tone="muted">Badge #{row.activePrintNumber}</Badge>
              ) : null}
            </span>
          );
        }
        return <Badge tone="accent">Ready</Badge>;
      },
    },
    {
      id: "actions",
      header: "",
      width: "1.2fr",
      cell: (row) =>
        row.hasQr && canPrint ? (
          <div className="flex justify-end gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                window.open(
                  printUrl(orgSlug, eventId, [row.attendeeId], {
                    autoPrint: false,
                    reprint: false,
                  }),
                  "_blank",
                  "noopener",
                );
              }}
            >
              Preview
            </Button>
            {row.printedAt ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                title="Issues a new badge QR and invalidates the previous one"
                onClick={() => {
                  const ok = window.confirm(
                    `Reprint badge for ${row.firstName} ${row.lastName}?\n\nThe previous badge QR will be invalidated and will be denied at entrance scans.`,
                  );
                  if (!ok) return;
                  window.open(
                    printUrl(orgSlug, eventId, [row.attendeeId], {
                      autoPrint: true,
                      reprint: true,
                    }),
                    "_blank",
                    "noopener",
                  );
                }}
              >
                Reprint
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
                      reprint: false,
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
        description="Print name badges with category tags. Badge QR codes are separate from desk check-in — reprinting invalidates the previous badge at entrance."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={`/app/${orgSlug}/events/${eventId}/settings?tab=badges`}>
              <Button type="button" variant="secondary" leadingIcon={<Settings className="size-4" strokeWidth={1.75} />}>
                Badge settings
              </Button>
            </Link>
            {canPrint && unprintedIds.length > 0 ? (
              <Button
                type="button"
                leadingIcon={<Printer className="size-4" strokeWidth={1.75} />}
                onClick={() => {
                  window.open(
                    printUrl(orgSlug, eventId, unprintedIds, {
                      autoPrint: true,
                      reprint: false,
                    }),
                    "_blank",
                    "noopener",
                  );
                }}
              >
                Print unprinted ({unprintedIds.length})
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["all", "All"],
            ["ready", "Ready to print"],
            ["unprinted", "Not printed yet"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={
              filter === key
                ? "rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white"
                : "rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200"
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
      />
    </div>
  );
}
