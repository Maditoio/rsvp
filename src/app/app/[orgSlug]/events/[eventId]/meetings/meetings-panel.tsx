"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  AlertTriangle,
  Calendar,
  CalendarClock,
  Clock,
  RefreshCw,
  Sparkles,
  Users,
  XCircle,
} from "lucide-react";
import {
  saveMeetingRoom,
  assignMeetingSlot,
  autoScheduleSingle,
  autoScheduleAll,
  cancelMeeting,
  rescheduleMeeting,
  type AutoScheduleFailure,
} from "@/modules/meetings/actions";
import {
  retryAllCalendarSyncs,
  organiserBookMeeting,
} from "@/modules/meetings/operations-actions";
import { triggerMatchmakingBatch } from "@/modules/matchmaking/batch-actions";
import type { MeetingConflictItem } from "@/modules/meetings/conflicts";
import type { SuggestedPairing } from "@/modules/matchmaking/suggestions";
import type { HeatmapCell } from "@/modules/meetings/heatmap";
import type { RoomBoardData } from "@/modules/meetings/room-board";
import type {
  AttendeeLimitRow,
  ModerationRequestRow,
} from "@/modules/meetings/moderation";
import { MeetingsTabs, type MeetingsTabId } from "./meetings-tabs";
import { SlotHeatmapTab } from "./meetings-tab-heatmap";
import { RoomBoardTab } from "./meetings-tab-room-board";
import { ModerationTab } from "./meetings-tab-moderation";
import { TodayMeetingsTab } from "./meetings-tab-today";
import { PairingInsightDrawer } from "./pairing-insight-drawer";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-table/data-table";
import { ActionsMenu } from "@/components/data-table/actions-menu";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/status-badge";
import { cn, humanizeEnum } from "@/lib/utils";

type RoomRow = { id: string; name: string; capacity: number | null };
type MeetingRow = {
  id: string;
  status: string;
  room: string | null;
  roomId: string | null;
  when: string;
  startsAtLocal: string;
  endsAtLocal: string;
  participants: string;
  calendarStatus: "synced" | "partial" | "none" | "not_applicable";
  calendarWarnings: string[];
  isUnscheduled: boolean;
};

function calendarStatusLabel(status: MeetingRow["calendarStatus"]) {
  switch (status) {
    case "synced":
      return "Synced";
    case "partial":
      return "Partial sync";
    case "none":
      return "Not synced";
    default:
      return "—";
  }
}

function calendarStatusTone(status: MeetingRow["calendarStatus"]) {
  switch (status) {
    case "synced":
      return "text-success";
    case "partial":
      return "text-amber-700";
    case "none":
      return "text-danger";
    default:
      return "text-slate-400";
  }
}

function canChangeMeeting(status: string) {
  return status === "SCHEDULED";
}

function conflictKindLabel(kind: MeetingConflictItem["kind"]) {
  switch (kind) {
    case "room_double_booked":
      return "Room conflict";
    case "session_clash":
      return "Session clash";
    case "calendar_sync":
      return "Calendar sync";
    default:
      return "Conflict";
  }
}

function conflictKindTone(kind: MeetingConflictItem["kind"]) {
  switch (kind) {
    case "room_double_booked":
      return "bg-danger-bg text-danger";
    case "session_clash":
      return "bg-amber-500/15 text-amber-800";
    case "calendar_sync":
      return "bg-info-bg text-info";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function bandTone(band: SuggestedPairing["band"]) {
  switch (band) {
    case "strong":
      return "bg-emerald-50 text-success";
    case "good":
      return "bg-indigo-50 text-indigo-700";
    case "possible":
      return "bg-slate-100 text-slate-600";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

export function MeetingsPanel({
  orgSlug,
  eventId,
  activeTab,
  rooms,
  meetings,
  conflicts,
  suggestions,
  heatmap,
  roomBoard,
  moderationQueue,
  requestLimits,
  todaysMeetings,
  attendees,
  tabCounts,
  canManage,
  aiInsightsEnabled,
}: {
  orgSlug: string;
  eventId: string;
  activeTab: MeetingsTabId;
  rooms: RoomRow[];
  meetings: MeetingRow[];
  conflicts: MeetingConflictItem[];
  suggestions: SuggestedPairing[];
  heatmap: { cells: HeatmapCell[]; maxDemand: number; roomCount: number };
  roomBoard: RoomBoardData;
  moderationQueue: ModerationRequestRow[];
  requestLimits: AttendeeLimitRow[];
  todaysMeetings: {
    id: string;
    status: string;
    when: string;
    room: string | null;
    participants: {
      name: string;
      company: string | null;
      checkInStatus: string;
    }[];
  }[];
  attendees: { id: string; label: string }[];
  tabCounts: {
    unscheduled: number;
    conflicts: number;
    suggestions: number;
    moderation: number;
    today: number;
  };
  canManage: boolean;
  aiInsightsEnabled: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<MeetingRow | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<MeetingRow | null>(null);
  const [cancelTarget, setCancelTarget] = useState<MeetingRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [bulkResult, setBulkResult] = useState<string | null>(null);
  const [scheduleFailures, setScheduleFailures] = useState<
    Record<string, string>
  >({});
  const [refreshResult, setRefreshResult] = useState<string | null>(null);
  const [pairingOpen, setPairingOpen] = useState(false);
  const [pairingIds, setPairingIds] = useState<{
    subjectId: string;
    candidateId: string;
  } | null>(null);
  const [bookOpen, setBookOpen] = useState(false);
  const [pending, start] = useTransition();

  const unscheduledMeetings = useMemo(
    () => meetings.filter((row) => row.isUnscheduled),
    [meetings],
  );

  const failureMap = scheduleFailures;

  function openAssignDrawer(row: MeetingRow) {
    setError(null);
    if (row.when) {
      setRescheduleTarget(row);
      setRescheduleOpen(true);
      setAssignOpen(false);
    } else {
      setAssignTarget(row);
      setAssignOpen(true);
      setRescheduleOpen(false);
    }
  }

  function runAutoScheduleSingle(row: MeetingRow) {
    setError(null);
    setWarning(null);
    const fd = new FormData();
    fd.set("meetingId", row.id);
    start(async () => {
      try {
        const result = await autoScheduleSingle(orgSlug, eventId, fd);
        if (result.ok && result.data.calendarWarning) {
          setWarning(result.data.calendarWarning);
        }
        setScheduleFailures((prev) => {
          const next = { ...prev };
          delete next[row.id];
          return next;
        });
        router.refresh();
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Auto-schedule failed";
        setScheduleFailures((prev) => ({ ...prev, [row.id]: message }));
        setError(message);
      }
    });
  }

  function runBulkAutoSchedule() {
    setError(null);
    setBulkResult(null);
    setWarning(null);
    start(async () => {
      try {
        const result = await autoScheduleAll(orgSlug, eventId);
        const failureById = Object.fromEntries(
          result.failures.map((row: AutoScheduleFailure) => [
            row.meetingId,
            row.reason,
          ]),
        );
        setScheduleFailures(failureById);
        const parts = [
          `${result.scheduled} of ${result.total} meetings scheduled.`,
          result.failed > 0 ? `${result.failed} could not be scheduled.` : null,
          result.calendarWarnings.length > 0
            ? result.calendarWarnings.join(" ")
            : null,
        ].filter(Boolean);
        setBulkResult(parts.join(" "));
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Auto-schedule failed");
      }
    });
  }

  function meetingActionItems(row: MeetingRow) {
    if (!canManage || !canChangeMeeting(row.status)) return null;
    const items = [
      ...(!row.when
        ? [
            {
              id: "auto",
              label: "Auto-schedule",
              icon: (
                <Calendar className="size-3.5 shrink-0" strokeWidth={1.75} />
              ),
              onSelect: () => runAutoScheduleSingle(row),
            },
          ]
        : []),
      {
        id: "assign",
        label: row.when ? "Reschedule" : "Assign room and time",
        icon: row.when ? (
          <CalendarClock className="size-3.5 shrink-0" strokeWidth={1.75} />
        ) : (
          <Clock className="size-3.5 shrink-0" strokeWidth={1.75} />
        ),
        onSelect: () => openAssignDrawer(row),
      },
      { type: "divider" as const, id: "div" },
      {
        id: "cancel",
        label: "Cancel meeting",
        destructive: true,
        icon: <XCircle className="size-3.5 shrink-0" strokeWidth={1.75} />,
        onSelect: () => {
          setError(null);
          setCancelTarget(row);
        },
      },
    ];
    return <ActionsMenu disabled={pending} items={items} />;
  }

  const meetingColumns: DataTableColumn<MeetingRow>[] = [
    {
      id: "participants",
      header: "Participants",
      width: "2fr",
      cell: (row) => row.participants,
    },
    {
      id: "room",
      header: "Room",
      width: "1.2fr",
      cell: (row) => row.room || "—",
    },
    {
      id: "when",
      header: "When",
      width: "1.4fr",
      cell: (row) => row.when || "—",
    },
    {
      id: "status",
      header: "Status",
      width: "1.1fr",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: "calendar",
      header: "Calendar",
      width: "1fr",
      cell: (row) =>
        row.when ? (
          <span
            className={calendarStatusTone(row.calendarStatus)}
            title={row.calendarWarnings.join(" ") || undefined}
          >
            {calendarStatusLabel(row.calendarStatus)}
          </span>
        ) : (
          "—"
        ),
    },
    ...(canManage
      ? [
          {
            id: "actions",
            header: "",
            width: "60px",
            headerClassName: "sr-only",
            cellClassName: "justify-self-end",
            cell: (row: MeetingRow) => meetingActionItems(row),
          } satisfies DataTableColumn<MeetingRow>,
        ]
      : []),
  ];

  const unscheduledColumns: DataTableColumn<MeetingRow>[] = [
    {
      id: "participants",
      header: "Participants",
      width: "2fr",
      cell: (row) => row.participants,
    },
    {
      id: "status",
      header: "Status",
      width: "1fr",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: "failure",
      header: "Last result",
      width: "2fr",
      cell: (row) =>
        failureMap[row.id] ? (
          <span className="text-sm text-danger">{failureMap[row.id]}</span>
        ) : (
          <span className="text-sm text-slate-400">Not scheduled yet</span>
        ),
    },
    ...(canManage
      ? [
          {
            id: "actions",
            header: "",
            width: "60px",
            headerClassName: "sr-only",
            cellClassName: "justify-self-end",
            cell: (row: MeetingRow) => meetingActionItems(row),
          } satisfies DataTableColumn<MeetingRow>,
        ]
      : []),
  ];

  const roomColumns: DataTableColumn<RoomRow>[] = [
    {
      id: "name",
      header: "Name",
      width: "2fr",
      cell: (row) => (
        <span className="font-medium text-slate-700">{row.name}</span>
      ),
    },
    {
      id: "capacity",
      header: "Capacity",
      width: "1fr",
      cell: (row) => row.capacity ?? "—",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Networking"
        title="Meetings"
        description="Rooms, scheduling, conflicts, and matchmaking suggestions."
        actions={
          canManage ? (
            <>
              {activeTab === "unscheduled" && unscheduledMeetings.length > 0 ? (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={pending}
                  onClick={runBulkAutoSchedule}
                >
                  {pending ? "Scheduling…" : "Auto-schedule unscheduled"}
                </Button>
              ) : activeTab === "all" ? (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={pending}
                    onClick={runBulkAutoSchedule}
                  >
                    {pending ? "Scheduling…" : "Auto-schedule all"}
                  </Button>
                  {meetings.some((row) => row.calendarStatus !== "synced" && row.when) ? (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={pending}
                      onClick={() => {
                        start(async () => {
                          try {
                            const result = await retryAllCalendarSyncs(orgSlug, eventId);
                            setRefreshResult(
                              `Retried ${result.retried} meetings. ${result.synced} calendar events synced.`,
                            );
                            router.refresh();
                          } catch (e) {
                            setError(
                              e instanceof Error ? e.message : "Calendar retry failed",
                            );
                          }
                        });
                      }}
                    >
                      Retry calendar sync
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setError(null);
                      setBookOpen(true);
                    }}
                  >
                    Book on behalf
                  </Button>
                </>
              ) : null}
              <Button
                type="button"
                leadingIcon="plus"
                onClick={() => {
                  setError(null);
                  setOpen(true);
                }}
              >
                Add room
              </Button>
            </>
          ) : undefined
        }
      />

      <MeetingsTabs
        orgSlug={orgSlug}
        eventId={eventId}
        active={activeTab}
        counts={tabCounts}
      />

      {warning ? (
        <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-sm text-amber-800">
          {warning}
        </p>
      ) : null}

      {bulkResult ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-success">
          {bulkResult}
        </p>
      ) : null}

      {refreshResult ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-success">
          {refreshResult}
        </p>
      ) : null}

      {error && !open && !assignOpen && !rescheduleOpen ? (
        <p className="text-sm text-danger">{error}</p>
      ) : null}

      {activeTab === "all" ? (
        <>
          {meetings.some((row) => row.calendarWarnings.length > 0) ? (
            <div className="rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-900">
              <p className="font-medium">Calendar sync warnings</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-800">
                {Array.from(
                  new Set(meetings.flatMap((row) => row.calendarWarnings)),
                )
                  .slice(0, 6)
                  .map((item) => (
                    <li key={item}>{item}</li>
                  ))}
              </ul>
            </div>
          ) : null}

          <div>
            <h2 className="font-display text-xl text-slate-900">Rooms</h2>
            <p className="mt-1 text-[0.8125rem] text-slate-500">
              Rooms for accepted meetings.
            </p>
            {rooms.length === 0 ? (
              <p className="mt-2 text-sm text-slate-700">No rooms yet.</p>
            ) : (
              <div className="mt-3">
                <DataTable
                  rows={rooms}
                  columns={roomColumns}
                  getRowId={(row) => row.id}
                  searchPlaceholder="Search rooms…"
                  searchFilter={(row, query) =>
                    [row.name, row.capacity?.toString() ?? ""]
                      .join(" ")
                      .toLowerCase()
                      .includes(query)
                  }
                  emptyMessage="No rooms yet."
                  pageParam="rpage"
                />
              </div>
            )}
          </div>

          <div>
            <h2 className="font-display text-xl text-slate-900">
              Scheduled meetings
            </h2>
            <p className="mt-1 text-[0.8125rem] text-slate-500">
              All accepted meetings, scheduled and unscheduled.
            </p>
            {meetings.length === 0 ? (
              <p className="mt-2 text-sm text-slate-700">No meetings yet.</p>
            ) : (
              <div className="mt-3">
                <DataTable
                  rows={meetings}
                  columns={meetingColumns}
                  getRowId={(row) => row.id}
                  searchPlaceholder="Search meetings…"
                  searchFilter={(row, query) =>
                    [
                      row.participants,
                      row.room,
                      row.when,
                      humanizeEnum(row.status),
                    ]
                      .filter(Boolean)
                      .join(" ")
                      .toLowerCase()
                      .includes(query)
                  }
                  emptyMessage="No meetings yet."
                  showRowsPerPage
                  pageParam="page"
                />
              </div>
            )}
          </div>
        </>
      ) : null}

      {activeTab === "unscheduled" ? (
        <div>
          <h2 className="font-display text-xl text-slate-900">Unscheduled queue</h2>
          <p className="mt-1 text-[0.8125rem] text-slate-500">
            Accepted meetings waiting for a room and time slot.
          </p>
          {unscheduledMeetings.length === 0 ? (
            <p className="mt-4 rounded-xl bg-white px-4 py-8 text-center text-sm text-slate-600 shadow-sm">
              All meetings are scheduled.
            </p>
          ) : (
            <div className="mt-3">
              <DataTable
                rows={unscheduledMeetings}
                columns={unscheduledColumns}
                getRowId={(row) => row.id}
                searchPlaceholder="Search unscheduled…"
                searchFilter={(row, query) =>
                  row.participants.toLowerCase().includes(query)
                }
                emptyMessage="All meetings are scheduled."
                showRowsPerPage
                pageParam="upage"
              />
            </div>
          )}
        </div>
      ) : null}

      {activeTab === "conflicts" ? (
        <div>
          <h2 className="font-display text-xl text-slate-900">Conflict inbox</h2>
          <p className="mt-1 text-[0.8125rem] text-slate-500">
            Room double-bookings, agenda session clashes, and calendar sync issues.
          </p>
          {conflicts.length === 0 ? (
            <p className="mt-4 rounded-xl bg-white px-4 py-8 text-center text-sm text-slate-600 shadow-sm">
              No conflicts detected.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {conflicts.map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                            conflictKindTone(item.kind),
                          )}
                        >
                          <AlertTriangle className="size-3" strokeWidth={1.75} />
                          {conflictKindLabel(item.kind)}
                        </span>
                        <span className="text-sm font-medium text-slate-900">
                          {item.summary}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        {item.participants}
                        {item.when ? ` · ${item.when}` : ""}
                        {item.room ? ` · ${item.room}` : ""}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">{item.detail}</p>
                    </div>
                    {canManage ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          const meeting = meetings.find(
                            (row) => row.id === item.meetingId,
                          );
                          if (meeting) openAssignDrawer(meeting);
                        }}
                      >
                        {item.kind === "calendar_sync" ? "View meeting" : "Fix schedule"}
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {activeTab === "suggestions" ? (
        <div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-xl text-slate-900">
                Suggested pairings
              </h2>
              <p className="mt-1 text-[0.8125rem] text-slate-500">
                Top-ranked matches from structured scores
                {aiInsightsEnabled ? " and AI rankings" : ""}. Visible to
                organisers only.
              </p>
            </div>
            {canManage && aiInsightsEnabled ? (
              <Button
                type="button"
                variant="secondary"
                disabled={pending}
                onClick={() => {
                  setError(null);
                  setRefreshResult(null);
                  start(async () => {
                    try {
                      const result = await triggerMatchmakingBatch(
                        orgSlug,
                        eventId,
                      );
                      setRefreshResult(
                        `Refreshed ${result.scoresRecomputed} score pairs. AI ranked ${result.aiRanked}.`,
                      );
                      router.refresh();
                    } catch (e) {
                      setError(
                        e instanceof Error
                          ? e.message
                          : "Could not refresh suggestions",
                      );
                    }
                  });
                }}
              >
                <RefreshCw className="size-3.5" strokeWidth={1.75} />
                {pending ? "Refreshing…" : "Refresh suggestions"}
              </Button>
            ) : null}
          </div>

          {suggestions.length === 0 ? (
            <p className="mt-4 rounded-xl bg-white px-4 py-8 text-center text-sm text-slate-600 shadow-sm">
              No suggested pairings yet. Run the matchmaking pipeline from
              Analytics when AI insights are enabled.
            </p>
          ) : (
            <ul className="mt-4 grid gap-3 lg:grid-cols-2">
              {suggestions.map((pair) => (
                <li
                  key={pair.id}
                  className="rounded-xl bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Users className="size-4 shrink-0 text-slate-400" />
                        <p className="font-medium text-slate-900">
                          {pair.subjectName}
                          <span className="mx-1.5 text-slate-400">↔</span>
                          {pair.candidateName}
                        </p>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {[pair.subjectCompany, pair.candidateCompany]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </p>
                    </div>
                    {pair.bandLabel ? (
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
                          bandTone(pair.band),
                        )}
                      >
                        {pair.bandLabel}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {pair.reasonsSummary}
                  </p>
                  {aiInsightsEnabled && pair.aiInsight ? (
                    <p className="mt-2 flex items-start gap-1.5 text-sm text-indigo-700">
                      <Sparkles className="mt-0.5 size-3.5 shrink-0" />
                      {pair.aiInsight}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span className="tabular-nums">
                      Score {Math.round(pair.rankScore)}
                    </span>
                    <button
                      type="button"
                      className="rounded-full text-indigo-600 hover:underline"
                      onClick={() => {
                        setPairingIds({
                          subjectId: pair.subjectId,
                          candidateId: pair.candidateId,
                        });
                        setPairingOpen(true);
                      }}
                    >
                      Why this match?
                    </button>
                    <Link
                      href={`/app/${orgSlug}/events/${eventId}/attendees`}
                      className="rounded-full text-indigo-600 hover:underline"
                    >
                      View attendees
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {activeTab === "today" ? (
        <TodayMeetingsTab
          orgSlug={orgSlug}
          eventId={eventId}
          meetings={todaysMeetings}
          canManage={canManage}
        />
      ) : null}

      {activeTab === "heatmap" ? (
        <SlotHeatmapTab
          cells={heatmap.cells}
          maxDemand={heatmap.maxDemand}
          roomCount={heatmap.roomCount}
        />
      ) : null}

      {activeTab === "rooms" ? (
        <RoomBoardTab
          orgSlug={orgSlug}
          eventId={eventId}
          board={roomBoard}
          canManage={canManage}
        />
      ) : null}

      {activeTab === "moderation" ? (
        <ModerationTab
          orgSlug={orgSlug}
          eventId={eventId}
          queue={moderationQueue}
          limits={requestLimits}
          canManage={canManage}
        />
      ) : null}

      <PairingInsightDrawer
        orgSlug={orgSlug}
        eventId={eventId}
        subjectId={pairingIds?.subjectId ?? null}
        candidateId={pairingIds?.candidateId ?? null}
        open={pairingOpen}
        onClose={() => setPairingOpen(false)}
        canManage={canManage}
      />

      <Drawer
        open={bookOpen}
        onClose={() => setBookOpen(false)}
        title="Book meeting on behalf"
        description="Schedule a meeting for two attendees (VIP/staff override)."
        size="sm"
      >
        <form
          className="space-y-4"
          action={(formData) => {
            setError(null);
            formData.set("autoSchedule", "on");
            start(async () => {
              try {
                const result = await organiserBookMeeting(orgSlug, eventId, formData);
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                if (result.data.calendarWarning) setWarning(result.data.calendarWarning);
                setBookOpen(false);
                router.refresh();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Could not book meeting");
              }
            });
          }}
        >
          <div>
            <Label htmlFor="attendeeIdA">Attendee A</Label>
            <Select id="attendeeIdA" name="attendeeIdA" required className="mt-1">
              <option value="">Select…</option>
              {attendees.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="attendeeIdB">Attendee B</Label>
            <Select id="attendeeIdB" name="attendeeIdB" required className="mt-1">
              <option value="">Select…</option>
              {attendees.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </Select>
          </div>
          <p className="text-xs text-slate-500">
            Auto-schedules the first available slot. Action is audit-logged.
          </p>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <div className="flex justify-end">
            <Button disabled={pending}>{pending ? "Booking…" : "Book meeting"}</Button>
          </div>
        </form>
      </Drawer>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Add meeting room"
        description="Rooms can be assigned when a meeting is accepted."
        size="sm"
      >
        <form
          className="space-y-4"
          action={(formData) => {
            setError(null);
            start(async () => {
              try {
                await saveMeetingRoom(orgSlug, eventId, formData);
                setOpen(false);
                router.refresh();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Could not add room");
              }
            });
          }}
        >
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required placeholder="Room A" />
          </div>
          <div>
            <Label htmlFor="capacity">Capacity</Label>
            <Input id="capacity" name="capacity" type="number" min={1} />
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <div className="flex justify-end">
            <Button disabled={pending}>{pending ? "Saving…" : "Add room"}</Button>
          </div>
        </form>
      </Drawer>

      <Drawer
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title="Assign room and time"
        description={assignTarget ? `Schedule ${assignTarget.participants}` : undefined}
        size="sm"
      >
        {assignTarget ? (
          <form
            className="space-y-4"
            action={(formData) => {
              setError(null);
              setWarning(null);
              start(async () => {
                try {
                  const result = await assignMeetingSlot(orgSlug, eventId, formData);
                  if (result.ok && result.data.calendarWarning) {
                    setWarning(result.data.calendarWarning);
                  }
                  setAssignOpen(false);
                  router.refresh();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Could not assign slot");
                }
              });
            }}
          >
            <input type="hidden" name="meetingId" value={assignTarget.id} />
            {rooms.length > 0 ? (
              <div>
                <Label htmlFor="assign-roomId">Room</Label>
                <Select id="assign-roomId" name="roomId" className="mt-1">
                  <option value="">No room</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}
            <div>
              <Label htmlFor="assign-startsAt">Start</Label>
              <Input id="assign-startsAt" name="startsAt" type="datetime-local" required />
            </div>
            <div>
              <Label htmlFor="assign-endsAt">End</Label>
              <Input id="assign-endsAt" name="endsAt" type="datetime-local" required />
            </div>
            <p className="text-xs text-slate-500">
              Conflicts with other meetings, agenda sessions, rooms, and connected
              calendars are checked before saving.
            </p>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <div className="flex justify-end">
              <Button disabled={pending}>{pending ? "Saving…" : "Assign"}</Button>
            </div>
          </form>
        ) : null}
      </Drawer>

      <Drawer
        open={rescheduleOpen}
        onClose={() => setRescheduleOpen(false)}
        title="Reschedule meeting"
        description={
          rescheduleTarget
            ? `Move ${rescheduleTarget.participants} to a new slot`
            : undefined
        }
        size="sm"
      >
        {rescheduleTarget ? (
          <form
            key={rescheduleTarget.id}
            className="space-y-4"
            action={(formData) => {
              setError(null);
              setWarning(null);
              start(async () => {
                try {
                  const result = await rescheduleMeeting(orgSlug, eventId, formData);
                  if (result.ok && result.data.calendarWarning) {
                    setWarning(result.data.calendarWarning);
                  }
                  setRescheduleOpen(false);
                  router.refresh();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Could not reschedule");
                }
              });
            }}
          >
            <input type="hidden" name="meetingId" value={rescheduleTarget.id} />
            {rooms.length > 0 ? (
              <div>
                <Label htmlFor="reschedule-roomId">Room</Label>
                <Select
                  id="reschedule-roomId"
                  name="roomId"
                  className="mt-1"
                  defaultValue={rescheduleTarget.roomId ?? ""}
                >
                  <option value="">No room</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}
            <div>
              <Label htmlFor="reschedule-startsAt">Start</Label>
              <Input
                id="reschedule-startsAt"
                name="startsAt"
                type="datetime-local"
                required
                defaultValue={rescheduleTarget.startsAtLocal}
              />
            </div>
            <div>
              <Label htmlFor="reschedule-endsAt">End</Label>
              <Input
                id="reschedule-endsAt"
                name="endsAt"
                type="datetime-local"
                required
                defaultValue={rescheduleTarget.endsAtLocal}
              />
            </div>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <div className="flex justify-end">
              <Button disabled={pending}>{pending ? "Saving…" : "Reschedule"}</Button>
            </div>
          </form>
        ) : null}
      </Drawer>

      <ConfirmDialog
        open={cancelTarget != null}
        onClose={() => (pending ? undefined : setCancelTarget(null))}
        title="Cancel this meeting"
        description={
          cancelTarget
            ? `Cancel the meeting between ${cancelTarget.participants}? Synced Google and Outlook events will be removed when possible.`
            : "Cancel this meeting?"
        }
        confirmLabel="Cancel meeting"
        cancelLabel="Keep meeting"
        destructive
        pending={pending}
        onConfirm={() => {
          if (!cancelTarget) return;
          setError(null);
          setWarning(null);
          const fd = new FormData();
          fd.set("meetingId", cancelTarget.id);
          start(async () => {
            try {
              const result = await cancelMeeting(orgSlug, eventId, fd);
              if (result.ok && result.data.calendarWarning) {
                setWarning(result.data.calendarWarning);
              }
              setCancelTarget(null);
              router.refresh();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Could not cancel meeting");
            }
          });
        }}
      />
    </div>
  );
}
