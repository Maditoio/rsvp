"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Clock3, Users } from "lucide-react";
import { deleteSession, saveSession } from "@/modules/sessions/actions";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { parseOptionalDateRange } from "@/lib/validation";
import { AgendaImport } from "./agenda-import";
import {
  SessionOnlineControls,
  type SessionOnlineMeeting,
} from "./session-online-controls";
import { SessionProviderIcons } from "./session-provider-icons";

type SessionRow = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  format: "PHYSICAL" | "ONLINE" | "HYBRID";
  startsAt: string;
  endsAt: string;
  startsAtValue: string;
  endsAtValue: string;
  capacity: number | null;
  registrations: number;
  teamsMeeting: SessionOnlineMeeting | null;
};

function toDatetimeLocalValue(iso: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatLabel(format: SessionRow["format"]) {
  switch (format) {
    case "ONLINE":
      return "Online";
    case "HYBRID":
      return "Hybrid";
    default:
      return "Physical";
  }
}

function compactTimeLabel(row: SessionRow) {
  if (!row.startsAt && !row.endsAt) return "TBC";
  const start = row.startsAt || "TBC";
  if (!row.endsAt) return start;
  const endTime = row.endsAt.includes(",")
    ? row.endsAt.split(", ").slice(1).join(", ")
    : row.endsAt;
  return `${start} – ${endTime}`;
}

function SessionListRow({
  row,
  canManage,
  onEdit,
}: {
  row: SessionRow;
  canManage: boolean;
  onEdit: () => void;
}) {
  const teamsMeetingUrl =
    row.teamsMeeting?.provider === "TEAMS" ? row.teamsMeeting.joinUrl : null;
  const zoomMeetingUrl =
    row.teamsMeeting?.provider === "ZOOM" ? row.teamsMeeting.joinUrl : null;
  const secondary =
    row.location ||
    (row.format === "ONLINE"
      ? "Online"
      : row.format === "HYBRID"
        ? "Hybrid session"
        : null);

  return (
    <div className="flex items-center gap-4 px-4 py-3.5">
      <div className="w-[7.25rem] shrink-0 self-start pt-0.5">
        <span className="inline-flex items-start gap-1 font-mono text-[0.75rem] leading-snug text-stone-500">
          <Clock3 className="mt-0.5 size-3 shrink-0" aria-hidden />
          {compactTimeLabel(row)}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-ink-800">{row.title}</p>
        {secondary ? (
          <p className="mt-0.5 truncate text-sm text-stone-500">{secondary}</p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-3 self-center">
        {row.format !== "PHYSICAL" ? (
          <Badge tone="muted" className="hidden sm:inline-flex">
            {formatLabel(row.format)}
          </Badge>
        ) : null}
        <SessionProviderIcons
          format={row.format}
          teamsMeetingUrl={teamsMeetingUrl}
          zoomMeetingUrl={zoomMeetingUrl}
        />
        <span
          className="inline-flex items-center gap-1 text-xs text-stone-500"
          title="Attendees who picked this session"
        >
          <Users className="size-3" aria-hidden />
          <span className="font-mono">
            {row.registrations}
            {row.capacity !== null ? `/${row.capacity}` : ""}
          </span>
        </span>
        {canManage ? (
          <Button type="button" size="sm" variant="secondary" onClick={onEdit}>
            Edit
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function AgendaPanel({
  orgSlug,
  eventId,
  sessions,
  canManage,
  microsoftConnected,
  microsoftNeedsReconnect,
}: {
  orgSlug: string;
  eventId: string;
  sessions: SessionRow[];
  canManage: boolean;
  microsoftConnected: boolean;
  microsoftNeedsReconnect: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SessionRow | null>(null);
  const [format, setFormat] = useState<SessionRow["format"]>("PHYSICAL");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const focusSessionId = searchParams.get("session");
  const teamsStatus = searchParams.get("teams");

  useEffect(() => {
    if (!focusSessionId || !canManage) return;
    const row = sessions.find((s) => s.id === focusSessionId);
    if (!row) return;
    setEditing(row);
    setFormat(row.format);
    setError(null);
    setOpen(true);
  }, [focusSessionId, sessions, canManage]);

  function openCreate() {
    setEditing(null);
    setFormat("PHYSICAL");
    setError(null);
    setOpen(true);
  }

  function openEdit(row: SessionRow) {
    setEditing(row);
    setFormat(row.format);
    setError(null);
    setOpen(true);
  }

  const whenLabel =
    editing && (editing.startsAt || editing.endsAt)
      ? `${editing.startsAt || "TBC"}${editing.endsAt ? ` – ${editing.endsAt}` : ""}`
      : "";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-bronze-600">
            Programme
          </p>
          <h1 className="mt-1 font-display text-3xl text-ink-800">Agenda</h1>
          <p className="mt-1 text-sm text-stone-700">
            Sessions attendees can add to their personal agenda. Import from a
            spreadsheet or add sessions one at a time.
          </p>
        </div>
        {canManage ? (
          <div className="flex flex-wrap items-center gap-2">
            <AgendaImport orgSlug={orgSlug} eventId={eventId} />
            <Button type="button" onClick={openCreate}>
              Add session
            </Button>
          </div>
        ) : null}
      </div>

      {sessions.length === 0 ? (
        <p className="text-sm text-stone-700">No sessions yet.</p>
      ) : (
        <div className="divide-y divide-stone-100 rounded-md border border-stone-200 bg-stone-0">
          {sessions.map((row) => (
            <SessionListRow
              key={row.id}
              row={row}
              canManage={canManage}
              onEdit={() => openEdit(row)}
            />
          ))}
        </div>
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
            formData.set("format", format);
            setError(null);
            const title = String(formData.get("title") ?? "").trim();
            if (title.length < 2) {
              setError("Session title must be at least 2 characters.");
              return;
            }
            const slot = parseOptionalDateRange(
              String(formData.get("startsAt") ?? ""),
              String(formData.get("endsAt") ?? ""),
            );
            if (!slot.ok) {
              setError(slot.error);
              return;
            }
            start(async () => {
              try {
                await saveSession(orgSlug, eventId, formData);
                setOpen(false);
                router.refresh();
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "Could not save session",
                );
              }
            });
          }}
        >
          {editing ? (
            <input type="hidden" name="sessionId" value={editing.id} />
          ) : null}
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              required
              defaultValue={editing?.title ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={editing?.description ?? ""}
            />
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-ink-700">
              Session format
            </legend>
            {(
              [
                ["PHYSICAL", "Physical"],
                ["ONLINE", "Online"],
                ["HYBRID", "Hybrid"],
              ] as const
            ).map(([value, label]) => (
              <label
                key={value}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-sm border px-3 py-2 text-sm",
                  format === value
                    ? "border-ink-700 bg-stone-50 text-ink-800"
                    : "border-stone-200 text-stone-700",
                )}
              >
                <input
                  type="radio"
                  name="formatRadio"
                  className="accent-ink-700"
                  checked={format === value}
                  onChange={() => setFormat(value)}
                />
                {label}
              </label>
            ))}
          </fieldset>

          <div>
            <Label htmlFor="location">
              {format === "ONLINE" ? "Location (optional)" : "Location"}
            </Label>
            <Input
              id="location"
              name="location"
              defaultValue={editing?.location ?? ""}
              placeholder={
                format === "ONLINE" ? "Optional notes" : "Room or venue"
              }
            />
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
              defaultValue={
                editing ? toDatetimeLocalValue(editing.endsAtValue) : ""
              }
            />
          </div>

          {canManage ? (
            <SessionOnlineControls
              orgSlug={orgSlug}
              eventId={eventId}
              sessionId={editing?.id ?? null}
              sessionTitle={editing?.title ?? "Session"}
              whenLabel={whenLabel}
              format={format}
              meeting={editing?.teamsMeeting ?? null}
              microsoftConnected={microsoftConnected}
              microsoftNeedsReconnect={microsoftNeedsReconnect}
              teamsStatus={
                focusSessionId && editing?.id === focusSessionId
                  ? teamsStatus
                  : null
              }
            />
          ) : null}

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
                        e instanceof Error
                          ? e.message
                          : "Could not delete session",
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
            <Button disabled={pending}>
              {pending ? "Saving…" : "Save session"}
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
