"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Calendar, Clock } from "lucide-react";
import { saveMeetingRoom, assignMeetingSlot, autoScheduleSingle, autoScheduleAll } from "@/modules/meetings/actions";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, Td, Th } from "@/components/ui/table";
import { humanizeEnum } from "@/lib/utils";

type RoomRow = { id: string; name: string; capacity: number | null };
type MeetingRow = {
  id: string;
  status: string;
  room: string | null;
  when: string;
  participants: string;
};

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
  const [assignTarget, setAssignTarget] = useState<MeetingRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bulkResult, setBulkResult] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-bronze-600">
            Networking
          </p>
          <h1 className="mt-1 font-display text-3xl text-ink-800">Meetings</h1>
          <p className="mt-1 text-sm text-stone-700">
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
                start(async () => {
                  try {
                    const result = await autoScheduleAll(orgSlug, eventId);
                    setBulkResult(
                      `${result.scheduled} of ${result.total} meetings scheduled.${result.failed > 0 ? ` ${result.failed} could not be scheduled (no available slots).` : ""}`,
                    );
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

      {bulkResult ? (
        <p className="rounded-md border border-moss-200 bg-moss-50 px-3 py-2 text-sm text-moss-800">
          {bulkResult}
        </p>
      ) : null}

      <div>
        <h2 className="font-display text-xl text-ink-800">Rooms</h2>
        {rooms.length === 0 ? (
          <p className="mt-2 text-sm text-stone-700">No rooms yet.</p>
        ) : (
          <div className="mt-3">
            <Table>
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Capacity</Th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((row) => (
                  <tr key={row.id}>
                    <Td className="font-medium text-ink-800">{row.name}</Td>
                    <Td>{row.capacity ?? "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </div>

      <div>
        <h2 className="font-display text-xl text-ink-800">Scheduled meetings</h2>
        {meetings.length === 0 ? (
          <p className="mt-2 text-sm text-stone-700">No meetings scheduled.</p>
        ) : (
          <div className="mt-3">
            <Table>
              <thead>
                <tr>
                  <Th>Participants</Th>
                  <Th>Room</Th>
                  <Th>When</Th>
                  <Th>Status</Th>
                  {canManage ? <Th></Th> : null}
                </tr>
              </thead>
              <tbody>
                {meetings.map((row) => (
                  <tr key={row.id}>
                    <Td>{row.participants}</Td>
                    <Td>{row.room || "—"}</Td>
                    <Td>{row.when || "—"}</Td>
                    <Td>{humanizeEnum(row.status)}</Td>
                    {canManage ? (
                      <Td>
                        <div className="flex items-center gap-1">
                          {!row.when ? (
                            <button
                              type="button"
                              title="Auto-schedule"
                              disabled={pending}
                              className="rounded-sm p-1.5 text-stone-500 hover:bg-stone-100 hover:text-ink-700 disabled:opacity-50"
                              onClick={() => {
                                setError(null);
                                const fd = new FormData();
                                fd.set("meetingId", row.id);
                                start(async () => {
                                  try {
                                    await autoScheduleSingle(orgSlug, eventId, fd);
                                    router.refresh();
                                  } catch (e) {
                                    setError(e instanceof Error ? e.message : "Auto-schedule failed");
                                  }
                                });
                              }}
                            >
                              <Calendar className="size-4" />
                            </button>
                          ) : null}
                          <button
                            type="button"
                            title="Assign room and time"
                            className="rounded-sm p-1.5 text-stone-500 hover:bg-stone-100 hover:text-ink-700"
                            onClick={() => {
                              setAssignTarget(row);
                              setError(null);
                              setAssignOpen(true);
                            }}
                          >
                            <Clock className="size-4" />
                          </button>
                        </div>
                      </Td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </div>

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
              start(async () => {
                try {
                  await assignMeetingSlot(orgSlug, eventId, formData);
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
                <Select
                  id="assign-roomId"
                  name="roomId"
                  className="mt-1"
                >
                  <option value="">No room</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>{room.name}</option>
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
    </div>
  );
}
