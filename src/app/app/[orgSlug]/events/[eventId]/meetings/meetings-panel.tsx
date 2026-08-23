"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Calendar, CalendarClock, Clock, XCircle } from "lucide-react";
import {
  saveMeetingRoom,
  assignMeetingSlot,
  autoScheduleSingle,
  autoScheduleAll,
  cancelMeeting,
  rescheduleMeeting,
} from "@/modules/meetings/actions";
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
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/status-badge";
import { humanizeEnum } from "@/lib/utils";

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
};

function canChangeMeeting(status: string) {
  return status === "SCHEDULED";
}

export function MeetingsPanel({
  orgSlug,
  eventId,
  rooms,
  meetings,
  canManage,
}: {
  orgSlug: string;
  eventId: string;
  rooms: RoomRow[];
  meetings: MeetingRow[];
  canManage: boolean;
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
  const [pending, start] = useTransition();

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
    ...(canManage
      ? [
          {
            id: "actions",
            header: "",
            width: "60px",
            headerClassName: "sr-only",
            cellClassName: "justify-self-end",
            cell: (row: MeetingRow) => {
              if (!canChangeMeeting(row.status)) return null;
              const items = [
                ...(!row.when
                  ? [
                      {
                        id: "auto",
                        label: "Auto-schedule",
                        icon: (
                          <Calendar
                            className="size-3.5 shrink-0"
                            strokeWidth={1.75}
                          />
                        ),
                        onSelect: () => {
                          setError(null);
                          setWarning(null);
                          const fd = new FormData();
                          fd.set("meetingId", row.id);
                          start(async () => {
                            try {
                              const result = await autoScheduleSingle(
                                orgSlug,
                                eventId,
                                fd,
                              );
                              if (result.ok && result.data.calendarWarning) {
                                setWarning(result.data.calendarWarning);
                              }
                              router.refresh();
                            } catch (e) {
                              setError(
                                e instanceof Error
                                  ? e.message
                                  : "Auto-schedule failed",
                              );
                            }
                          });
                        },
                      },
                    ]
                  : []),
                {
                  id: "assign",
                  label: row.when ? "Reschedule" : "Assign room and time",
                  icon: row.when ? (
                    <CalendarClock
                      className="size-3.5 shrink-0"
                      strokeWidth={1.75}
                    />
                  ) : (
                    <Clock className="size-3.5 shrink-0" strokeWidth={1.75} />
                  ),
                  onSelect: () => {
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
                  },
                },
                { type: "divider" as const, id: "div" },
                {
                  id: "cancel",
                  label: "Cancel meeting",
                  destructive: true,
                  icon: (
                    <XCircle className="size-3.5 shrink-0" strokeWidth={1.75} />
                  ),
                  onSelect: () => {
                    setError(null);
                    setCancelTarget(row);
                  },
                },
              ];
              return <ActionsMenu disabled={pending} items={items} />;
            },
          } satisfies DataTableColumn<MeetingRow>,
        ]
      : []),
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[0.71875rem] font-semibold uppercase tracking-[0.04em] text-indigo-600">
            Networking
          </p>
          <h1 className="mt-1 font-display text-3xl text-slate-900">Meetings</h1>
          <p className="mt-1 text-sm text-slate-700">
            Rooms for accepted meetings. Attendees request meetings from the
            directory.
          </p>
        </div>
        {canManage ? (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => {
                setError(null);
                setBulkResult(null);
                setWarning(null);
                start(async () => {
                  try {
                    const result = await autoScheduleAll(orgSlug, eventId);
                    const parts = [
                      `${result.scheduled} of ${result.total} meetings scheduled.`,
                      result.failed > 0
                        ? `${result.failed} could not be scheduled.`
                        : null,
                      result.error ?? null,
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
              }}
            >
              {pending ? "Scheduling…" : "Auto-schedule all"}
            </Button>
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
          </div>
        ) : null}
      </div>

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
        <h2 className="font-display text-xl text-slate-900">Scheduled meetings</h2>
        <p className="mt-1 text-[0.8125rem] text-slate-500">
          Attendees request meetings from the directory.
        </p>
        {meetings.length === 0 ? (
          <p className="mt-2 text-sm text-slate-700">No meetings scheduled.</p>
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
              emptyMessage="No meetings scheduled."
              showRowsPerPage
              pageParam="page"
            />
          </div>
        )}
      </div>

      {error && !open && !assignOpen && !rescheduleOpen ? (
        <p className="text-sm text-danger">{error}</p>
      ) : null}

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
              <Input id="assign-startsAt" name="startsAt" type="datetime-local" />
            </div>
            <div>
              <Label htmlFor="assign-endsAt">End</Label>
              <Input id="assign-endsAt" name="endsAt" type="datetime-local" />
            </div>
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
