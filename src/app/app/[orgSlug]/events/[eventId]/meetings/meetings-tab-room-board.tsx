"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { assignMeetingSlot } from "@/modules/meetings/actions";
import type { RoomBoardData } from "@/modules/meetings/room-board";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

function isoToDatetimeLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function RoomBoardTab({
  orgSlug,
  eventId,
  board,
  canManage,
}: {
  orgSlug: string;
  eventId: string;
  board: RoomBoardData;
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [assignOpen, setAssignOpen] = useState(false);
  const [targetMeetingId, setTargetMeetingId] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ startsAt: string; endsAt: string } | null>(
    null,
  );
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [error, setError] = useState<string | null>(null);

  function openAssign(meetingId: string, slot: { startsAt: string; endsAt: string }, roomId: string) {
    setTargetMeetingId(meetingId);
    setSelectedSlot(slot);
    setSelectedRoomId(roomId);
    setAssignOpen(true);
    setError(null);
  }

  if (board.rooms.length === 0) {
    return (
      <p className="rounded-xl bg-white px-4 py-8 text-center text-sm text-slate-600 shadow-sm">
        Add meeting rooms to use the room board.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl text-slate-900">Room board</h2>
        <p className="mt-1 text-[0.8125rem] text-slate-500">
          Grid of rooms by time slot. Click an empty cell to assign an unplaced meeting.
        </p>
      </div>

      {board.unassigned.length > 0 ? (
        <div className="rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-900">
          {board.unassigned.length} meeting{board.unassigned.length === 1 ? "" : "s"} without a
          room — click a free cell to assign.
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl bg-white p-4 shadow-sm">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="p-2 text-left font-medium text-slate-500">Room</th>
              {board.slots.map((slot) => (
                <th
                  key={slot.startsAt}
                  className="whitespace-nowrap p-2 text-center text-xs font-medium text-slate-500"
                >
                  {slot.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {board.rooms.map((room) => (
              <tr key={room.id}>
                <td className="whitespace-nowrap p-2 font-medium text-slate-800">{room.name}</td>
                {board.slots.map((slot) => {
                  const occupied = board.meetings.find(
                    (m) =>
                      m.roomId === room.id &&
                      m.startsAt === slot.startsAt &&
                      m.endsAt === slot.endsAt,
                  );
                  const unassigned = board.unassigned[0];
                  return (
                    <td key={`${room.id}-${slot.startsAt}`} className="p-1">
                      {occupied ? (
                        <div
                          className="rounded-md bg-indigo-50 px-2 py-1.5 text-xs text-indigo-800"
                          title={occupied.participants}
                        >
                          <span className="line-clamp-2">{occupied.participants}</span>
                        </div>
                      ) : canManage && unassigned ? (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => openAssign(unassigned.id, slot, room.id)}
                          className={cn(
                            "h-10 w-full rounded-md border border-dashed border-slate-200 text-xs text-slate-400",
                            "hover:border-indigo-400 hover:bg-indigo-50/50 hover:text-indigo-600",
                          )}
                        >
                          Assign
                        </button>
                      ) : (
                        <div className="h-10 rounded-md bg-slate-50" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Drawer
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title="Assign to room"
        size="sm"
      >
        {targetMeetingId && selectedSlot ? (
          <form
            className="space-y-4"
            action={(formData) => {
              setError(null);
              start(async () => {
                try {
                  formData.set("meetingId", targetMeetingId);
                  formData.set("roomId", selectedRoomId);
                  formData.set("startsAt", isoToDatetimeLocal(selectedSlot.startsAt));
                  formData.set("endsAt", isoToDatetimeLocal(selectedSlot.endsAt));
                  await assignMeetingSlot(orgSlug, eventId, formData);
                  setAssignOpen(false);
                  router.refresh();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Could not assign");
                }
              });
            }}
          >
            <div>
              <Label htmlFor="board-room">Room</Label>
              <Select
                id="board-room"
                name="roomId"
                className="mt-1"
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
              >
                {board.rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </div>
            <p className="text-sm text-slate-600">
              Slot: {new Date(selectedSlot.startsAt).toLocaleString("en-GB")}
            </p>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <div className="flex justify-end">
              <Button disabled={pending}>{pending ? "Saving…" : "Assign slot"}</Button>
            </div>
          </form>
        ) : null}
      </Drawer>
    </div>
  );
}
