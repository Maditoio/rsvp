"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { respondToMeeting } from "@/modules/meetings/actions";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, Td, Th } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { displayName, humanizeEnum } from "@/lib/utils";

type RequestRow = {
  id: string;
  status: string;
  message: string | null;
  counterpart: { firstName: string; lastName: string; company: string | null };
  inbound: boolean;
  createdAt: string;
};

type RoomOption = { id: string; name: string };

type MeetingRow = {
  id: string;
  status: string;
  when: string;
  room: string | null;
  participants: string;
};

export function AttendeeMeetingsPanel({
  eventId,
  rooms = [],
  incoming,
  outgoing,
  meetings,
}: {
  eventId: string;
  rooms?: RoomOption[];
  incoming: RequestRow[];
  outgoing: RequestRow[];
  meetings: MeetingRow[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<RequestRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-8">
      {warning ? (
        <p className="rounded-md border border-bronze-200 bg-bronze-50 px-3 py-2 text-sm text-bronze-800">
          {warning}
        </p>
      ) : null}
      <section>
        <h2 className="font-display text-xl text-ink-800">Incoming requests</h2>
        {incoming.length === 0 ? (
          <p className="mt-2 text-sm text-stone-700">No pending requests.</p>
        ) : (
          <div className="mt-3">
            <Table>
              <thead>
                <tr>
                  <Th>From</Th>
                  <Th>Note</Th>
                  <Th>Received</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {incoming.map((row) => (
                  <tr key={row.id}>
                    <Td>
                      <p className="font-medium text-ink-800">
                        {displayName(row.counterpart)}
                      </p>
                      <p className="text-xs text-stone-500">
                        {row.counterpart.company || "—"}
                      </p>
                    </Td>
                    <Td>{row.message || "—"}</Td>
                    <Td>{row.createdAt}</Td>
                    <Td>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setCurrent(row);
                          setError(null);
                          setOpen(true);
                        }}
                      >
                        Review
                      </Button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display text-xl text-ink-800">Sent requests</h2>
        {outgoing.length === 0 ? (
          <p className="mt-2 text-sm text-stone-700">You have not sent any requests.</p>
        ) : (
          <div className="mt-3">
            <Table>
              <thead>
                <tr>
                  <Th>To</Th>
                  <Th>Status</Th>
                  <Th>Sent</Th>
                </tr>
              </thead>
              <tbody>
                {outgoing.map((row) => (
                  <tr key={row.id}>
                    <Td>{displayName(row.counterpart)}</Td>
                    <Td>
                      <Badge
                        tone={
                          row.status === "ACCEPTED"
                            ? "success"
                            : row.status === "DECLINED"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {humanizeEnum(row.status)}
                      </Badge>
                    </Td>
                    <Td>{row.createdAt}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display text-xl text-ink-800">Meetings</h2>
        {meetings.length === 0 ? (
          <p className="mt-2 text-sm text-stone-700">No accepted meetings yet.</p>
        ) : (
          <div className="mt-3">
            <Table>
              <thead>
                <tr>
                  <Th>Participants</Th>
                  <Th>Room</Th>
                  <Th>When</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {meetings.map((row) => (
                  <tr key={row.id}>
                    <Td>{row.participants}</Td>
                    <Td>{row.room || "—"}</Td>
                    <Td>{row.when || "—"}</Td>
                    <Td>{humanizeEnum(row.status)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </section>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Review meeting request"
        description="Accepting creates a meeting. Declining does not."
      >
        {current ? (
          <form
            className="space-y-4"
            action={(formData) => {
              setError(null);
              setWarning(null);
              start(async () => {
                try {
                  const result = await respondToMeeting(eventId, formData);
                  if (result.calendarWarning) {
                    setWarning(result.calendarWarning);
                  }
                  setOpen(false);
                  router.refresh();
                } catch (e) {
                  setError(
                    e instanceof Error ? e.message : "Could not update request",
                  );
                }
              });
            }}
          >
            <input type="hidden" name="requestId" value={current.id} />
            <p className="font-medium text-ink-800">
              {displayName(current.counterpart)}
            </p>
            {current.message ? (
              <p className="text-sm text-stone-700">{current.message}</p>
            ) : null}
            <div className="grid grid-cols-2 gap-2">
              <label className="rounded-sm border border-stone-200 p-3 text-sm">
                <input
                  type="radio"
                  name="decision"
                  value="accept"
                  required
                  className="mr-2"
                />
                Accept
              </label>
              <label className="rounded-sm border border-stone-200 p-3 text-sm">
                <input
                  type="radio"
                  name="decision"
                  value="decline"
                  required
                  className="mr-2"
                />
                Decline
              </label>
            </div>
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-stone-500">
              Optional scheduling
            </p>
            <label className="flex items-start gap-3 text-sm text-ink-700">
              <input
                type="checkbox"
                name="autoSchedule"
                value="on"
                className="mt-1 size-4 accent-ink-700"
              />
              <span>Auto-schedule (find the first available slot)</span>
            </label>
            {rooms.length > 0 ? (
              <div>
                <Label htmlFor="roomId">Room</Label>
                <select
                  id="roomId"
                  name="roomId"
                  className="mt-1 block w-full rounded-sm border border-stone-200 bg-stone-0 px-3 py-2 text-sm text-ink-800"
                >
                  <option value="">No room</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>{room.name}</option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="startsAt">Start</Label>
                <Input id="startsAt" name="startsAt" type="datetime-local" />
              </div>
              <div>
                <Label htmlFor="endsAt">End</Label>
                <Input id="endsAt" name="endsAt" type="datetime-local" />
              </div>
            </div>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <div className="flex justify-end">
              <Button disabled={pending}>
                {pending ? "Saving…" : "Record decision"}
              </Button>
            </div>
          </form>
        ) : null}
      </Drawer>
    </div>
  );
}
