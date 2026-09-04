"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Printer, Settings } from "lucide-react";
import type { BadgeListRow } from "@/modules/badges/service";
import {
  enqueueAllEligibleBadgesForPreprint,
  enqueueBadgesForPreprint,
  invalidateBadgeAndRequeue,
} from "@/modules/badges/actions";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

function isPreprintSelectable(row: BadgeListRow) {
  return row.hasQr && row.queueStatus !== "PRINTED";
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
  const router = useRouter();
  const toast = useToast();
  const [rows, setRows] = useState(initialRows);
  const [filter, setFilter] = useState<
    "all" | "ready" | "queued" | "printed"
  >("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, start] = useTransition();
  const selectAllRef = useRef<HTMLInputElement>(null);

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

  const queuedIds = useMemo(
    () =>
      rows
        .filter((r) => r.hasQr && r.queueStatus === "QUEUED")
        .map((r) => r.attendeeId),
    [rows],
  );

  const readyCount = useMemo(
    () =>
      rows.filter((r) => r.hasQr && r.queueStatus !== "QUEUED" && r.queueStatus !== "PRINTED")
        .length,
    [rows],
  );

  const filtered = useMemo(() => {
    if (filter === "queued") {
      return rows.filter((r) => r.queueStatus === "QUEUED");
    }
    if (filter === "printed") {
      return rows.filter((r) => r.queueStatus === "PRINTED");
    }
    if (filter === "ready") {
      return rows.filter(
        (r) =>
          r.hasQr && r.queueStatus !== "QUEUED" && r.queueStatus !== "PRINTED",
      );
    }
    return rows;
  }, [rows, filter]);

  const selectableFilteredIds = useMemo(
    () => filtered.filter(isPreprintSelectable).map((r) => r.attendeeId),
    [filtered],
  );

  const allFilteredSelected =
    selectableFilteredIds.length > 0 &&
    selectableFilteredIds.every((id) => selected.includes(id));
  const someFilteredSelected =
    selectableFilteredIds.some((id) => selected.includes(id)) &&
    !allFilteredSelected;

  useEffect(() => {
    if (!selectAllRef.current) return;
    selectAllRef.current.indeterminate = someFilteredSelected;
  }, [someFilteredSelected]);

  function toggleOne(attendeeId: string) {
    setSelected((list) =>
      list.includes(attendeeId)
        ? list.filter((id) => id !== attendeeId)
        : [...list, attendeeId],
    );
  }

  function toggleAllMatching() {
    setSelected((list) => {
      if (allFilteredSelected) {
        const drop = new Set(selectableFilteredIds);
        return list.filter((id) => !drop.has(id));
      }
      const next = new Set(list);
      for (const id of selectableFilteredIds) next.add(id);
      return [...next];
    });
  }

  function markQueuedLocally(attendeeIds: string[]) {
    const idSet = new Set(attendeeIds);
    const now = new Date();
    setRows((prev) =>
      prev.map((r) =>
        idSet.has(r.attendeeId)
          ? { ...r, queueStatus: "QUEUED", queuedAt: now }
          : r,
      ),
    );
    setSelected([]);
    setFilter("queued");
  }

  function queueSelected() {
    const ids = selected.filter((id) => {
      const row = rows.find((r) => r.attendeeId === id);
      return row && isPreprintSelectable(row);
    });
    if (ids.length === 0) {
      toast.error("Select attendees with a desk QR who are not already printed.");
      return;
    }
    start(async () => {
      const result = await enqueueBadgesForPreprint(orgSlug, eventId, ids);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const { queued, alreadyQueued, skippedPrinted, skippedNoQr } = result.data;
      markQueuedLocally(result.data.attendeeIds);
      toast.success(
        `Queued ${queued} badge${queued === 1 ? "" : "s"}` +
          (alreadyQueued ? ` · ${alreadyQueued} already waiting` : "") +
          (skippedPrinted ? ` · ${skippedPrinted} already printed` : "") +
          (skippedNoQr ? ` · ${skippedNoQr} missing desk QR` : ""),
      );
      router.refresh();
    });
  }

  function queueAllEligible() {
    const ok = window.confirm(
      "Add every registered attendee with a desk QR (who is not already printed) to the print queue?",
    );
    if (!ok) return;
    start(async () => {
      const result = await enqueueAllEligibleBadgesForPreprint(orgSlug, eventId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const { queued, alreadyQueued, skippedPrinted } = result.data;
      if (queued === 0 && alreadyQueued === 0) {
        toast.error(
          skippedPrinted > 0
            ? "Everyone eligible is already printed."
            : "No registered attendees with a desk QR to queue.",
        );
        return;
      }
      markQueuedLocally(result.data.attendeeIds);
      toast.success(
        `Queued ${queued} badge${queued === 1 ? "" : "s"}` +
          (alreadyQueued ? ` · ${alreadyQueued} already waiting` : ""),
      );
      router.refresh();
    });
  }

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
    ...(canPrint
      ? [
          {
            id: "select",
            header: (
              <Checkbox
                ref={selectAllRef}
                checked={allFilteredSelected}
                onChange={toggleAllMatching}
                aria-label="Select all matching attendees"
                disabled={selectableFilteredIds.length === 0 || pending}
              />
            ),
            width: "48px",
            headerClassName: "normal-case tracking-normal",
            cell: (row: BadgeListRow) =>
              isPreprintSelectable(row) ? (
                <Checkbox
                  checked={selected.includes(row.attendeeId)}
                  onChange={() => toggleOne(row.attendeeId)}
                  aria-label={`Select ${row.firstName} ${row.lastName}`}
                  disabled={pending}
                />
              ) : null,
          } satisfies DataTableColumn<BadgeListRow>,
        ]
      : []),
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
        return <Badge tone="accent">Ready to queue</Badge>;
      },
    },
    {
      id: "actions",
      header: "",
      width: "1.6fr",
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
            ) : row.queueStatus === "QUEUED" ? (
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
            ) : (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={pending}
                onClick={() => {
                  start(async () => {
                    const result = await enqueueBadgesForPreprint(
                      orgSlug,
                      eventId,
                      [row.attendeeId],
                    );
                    if (!result.ok) {
                      toast.error(result.error);
                      return;
                    }
                    markQueuedLocally(result.data.attendeeIds);
                    toast.success("Added to print queue");
                    router.refresh();
                  });
                }}
              >
                Add to queue
              </Button>
            )}
          </div>
        ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Badges"
        title="Badge printing"
        description="Pre-print before the event, or print after desk check-in. Use badge settings for CR80 portrait and multiple badges per A4. Print marks Badge #1, #2, … Invalidate re-queues a replacement."
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
            {canPrint ? (
              <Button
                type="button"
                variant="secondary"
                disabled={pending || readyCount === 0}
                onClick={queueAllEligible}
              >
                Queue all ready ({readyCount})
              </Button>
            ) : null}
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
            ["ready", "Ready to queue"],
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
        toolbar={
          canPrint && selected.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm text-slate-600">
                {selected.length} selected
              </p>
              <Button
                type="button"
                size="sm"
                disabled={pending}
                onClick={queueSelected}
              >
                Add selected to queue
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setSelected([])}
              >
                Clear selection
              </Button>
            </div>
          ) : canPrint ? (
            <p className="text-sm text-slate-500">
              Select attendees to pre-print, or queue all ready. Then use Print
              queue — A4 multi-up comes from badge settings.
            </p>
          ) : null
        }
      />
    </div>
  );
}
