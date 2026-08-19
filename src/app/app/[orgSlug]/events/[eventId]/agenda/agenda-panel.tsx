"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteSession, saveSession } from "@/modules/sessions/actions";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, Td, Th } from "@/components/ui/table";

type SessionRow = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string;
  startsAtValue: string;
  endsAtValue: string;
  capacity: number | null;
  registrations: number;
};

function toDatetimeLocalValue(iso: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function AgendaPanel({
  orgSlug,
  eventId,
  sessions,
  canManage,
}: {
  orgSlug: string;
  eventId: string;
  sessions: SessionRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SessionRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-bronze-600">
            Programme
          </p>
          <h1 className="mt-1 font-display text-3xl text-ink-800">Agenda</h1>
          <p className="mt-1 text-sm text-stone-700">
            Sessions attendees can add to their personal agenda.
          </p>
        </div>
        {canManage ? (
          <Button
            type="button"
            onClick={() => {
              setEditing(null);
              setError(null);
              setOpen(true);
            }}
          >
            Add session
          </Button>
        ) : null}
      </div>

      {sessions.length === 0 ? (
        <p className="text-sm text-stone-700">No sessions yet.</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Session</Th>
              <Th>When</Th>
              <Th>Location</Th>
              <Th>Picked</Th>
              {canManage ? <Th></Th> : null}
            </tr>
          </thead>
          <tbody>
            {sessions.map((row) => (
              <tr key={row.id}>
                <Td>
                  <p className="font-medium text-ink-800">{row.title}</p>
                  {row.description ? (
                    <p className="text-xs text-stone-500">{row.description}</p>
                  ) : null}
                </Td>
                <Td className="text-stone-700">
                  {row.startsAt || "TBC"}
                  {row.endsAt ? ` – ${row.endsAt}` : ""}
                </Td>
                <Td>{row.location || "—"}</Td>
                <Td>
                  {row.registrations}
                  {row.capacity !== null ? ` / ${row.capacity}` : ""}
                </Td>
                {canManage ? (
                  <Td>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setEditing(row);
                        setError(null);
                        setOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                  </Td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit session" : "Add session"}
        description="Only one session is edited at a time."
      >
        <form
          className="space-y-4"
          action={(formData) => {
            setError(null);
            start(async () => {
              try {
                await saveSession(orgSlug, eventId, formData);
                setOpen(false);
                router.refresh();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Could not save session");
              }
            });
          }}
        >
          {editing ? <input type="hidden" name="sessionId" value={editing.id} /> : null}
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required defaultValue={editing?.title ?? ""} />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={editing?.description ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="location">Location</Label>
            <Input id="location" name="location" defaultValue={editing?.location ?? ""} />
          </div>
          <div>
            <Label htmlFor="capacity">Capacity</Label>
            <Input
              id="capacity"
              name="capacity"
              type="number"
              min="1"
              placeholder="Unlimited"
              defaultValue={editing?.capacity ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="startsAt">Starts</Label>
            <Input
              id="startsAt"
              name="startsAt"
              type="datetime-local"
              defaultValue={
                editing ? toDatetimeLocalValue(editing.startsAtValue) : ""
              }
            />
          </div>
          <div>
            <Label htmlFor="endsAt">Ends</Label>
            <Input
              id="endsAt"
              name="endsAt"
              type="datetime-local"
              defaultValue={editing ? toDatetimeLocalValue(editing.endsAtValue) : ""}
            />
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <div className="flex justify-between">
            {editing ? (
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => {
                  const formData = new FormData();
                  formData.set("sessionId", editing.id);
                  setError(null);
                  start(async () => {
                    try {
                      await deleteSession(orgSlug, eventId, formData);
                      setOpen(false);
                      router.refresh();
                    } catch (e) {
                      setError(
                        e instanceof Error ? e.message : "Could not delete session",
                      );
                    }
                  });
                }}
              >
                Remove session
              </Button>
            ) : (
              <span />
            )}
            <Button disabled={pending}>{pending ? "Saving…" : "Save session"}</Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
