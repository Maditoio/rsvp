"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, Clock3, MapPin, Mic2, Users } from "lucide-react";
import { deleteSession, saveSession } from "@/modules/sessions/actions";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Radio } from "@/components/ui/radio";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { parseOptionalDateRange } from "@/lib/validation";
import { toDatetimeLocalValue } from "@/lib/timezone";
import {
  sessionMeetingPolicyHelp,
  sessionMeetingPolicyLabel,
  sessionMeetingPolicyTone,
  type SessionMeetingPolicyValue,
} from "@/modules/meetings/meeting-policy";
import {
  sessionRegistrationModeHelp,
  sessionRegistrationModeLabel,
  sessionRegistrationModeTone,
  type SessionRegistrationModeValue,
} from "@/modules/sessions/registration-mode";
import type { SessionSpeakerPreview } from "@/modules/sessions/speakers";
import { AgendaImport } from "./agenda-import";
import {
  SessionOnlineControls,
  type SessionOnlineMeeting,
} from "./session-online-controls";
import { SessionProviderIcons } from "./session-provider-icons";

type EventSpeakerOption = {
  id: string;
  name: string;
  jobTitle: string | null;
  organization: string | null;
  hidden: boolean;
};

type SessionRow = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  format: "PHYSICAL" | "ONLINE" | "HYBRID";
  meetingPolicy: SessionMeetingPolicyValue;
  registrationMode: SessionRegistrationModeValue;
  dateLabel: string;
  timeLabel: string | null;
  startsAtValue: string;
  endsAtValue: string;
  capacity: number | null;
  registrations: number;
  speakers: SessionSpeakerPreview[];
  teamsMeeting: SessionOnlineMeeting | null;
};

function toDatetimeLocalValueForEvent(iso: string, timezone: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return toDatetimeLocalValue(date, timezone);
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

function speakerNames(speakers: SessionSpeakerPreview[]) {
  return speakers.map((speaker) => speaker.name).join(", ");
}

function SessionListRow({
  row,
  canManage,
  onEdit,
  onEditOnline,
}: {
  row: SessionRow;
  canManage: boolean;
  onEdit: () => void;
  onEditOnline: () => void;
}) {
  const teamsMeetingUrl =
    row.teamsMeeting?.provider === "TEAMS" ? row.teamsMeeting.joinUrl : null;
  const zoomMeetingUrl =
    row.teamsMeeting?.provider === "ZOOM" ? row.teamsMeeting.joinUrl : null;
  const locationLabel =
    row.location ||
    (row.format === "ONLINE"
      ? "Online"
      : row.format === "HYBRID"
        ? "Hybrid"
        : null);

  function handleTeamsClick() {
    if (teamsMeetingUrl) {
      window.open(teamsMeetingUrl, "_blank", "noopener,noreferrer");
      return;
    }
    onEditOnline();
  }

  function handleZoomClick() {
    if (zoomMeetingUrl) {
      window.open(zoomMeetingUrl, "_blank", "noopener,noreferrer");
      return;
    }
    onEditOnline();
  }

  return (
    <div className="flex items-start gap-4 px-4 py-3.5 sm:items-center">
      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate font-medium text-slate-900">{row.title}</p>
        <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
          <div className="inline-flex items-center gap-1.5">
            <CalendarDays
              className="size-3.5 shrink-0 text-slate-400"
              aria-hidden
            />
            <dt className="sr-only">Date</dt>
            <dd>{row.dateLabel}</dd>
          </div>
          {row.timeLabel ? (
            <div className="inline-flex items-center gap-1.5">
              <Clock3
                className="size-3.5 shrink-0 text-slate-400"
                aria-hidden
              />
              <dt className="sr-only">Time</dt>
              <dd className="font-mono text-[0.8125rem] text-slate-700">
                {row.timeLabel}
              </dd>
            </div>
          ) : null}
          {locationLabel ? (
            <div className="inline-flex items-center gap-1.5">
              <MapPin
                className="size-3.5 shrink-0 text-slate-400"
                aria-hidden
              />
              <dt className="sr-only">Location</dt>
              <dd className="truncate">{locationLabel}</dd>
            </div>
          ) : null}
          {row.speakers.length > 0 ? (
            <div className="inline-flex min-w-0 items-center gap-1.5">
              <Mic2 className="size-3.5 shrink-0 text-slate-400" aria-hidden />
              <dt className="sr-only">Speakers</dt>
              <dd className="truncate">{speakerNames(row.speakers)}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      <div className="flex shrink-0 items-center gap-3 self-center">
        {row.format !== "PHYSICAL" ? (
          <Badge tone="muted" className="hidden sm:inline-flex">
            {formatLabel(row.format)}
          </Badge>
        ) : null}
        {row.registrationMode !== "OPEN" ? (
          <Badge
            tone={sessionRegistrationModeTone(row.registrationMode)}
            className="hidden lg:inline-flex"
          >
            {sessionRegistrationModeLabel(row.registrationMode)}
          </Badge>
        ) : null}
        <Badge
          tone={sessionMeetingPolicyTone(row.meetingPolicy)}
          className="hidden sm:inline-flex"
        >
          {sessionMeetingPolicyLabel(row.meetingPolicy)}
        </Badge>
        {canManage && row.format !== "PHYSICAL" ? (
          <SessionProviderIcons
            format={row.format}
            teamsMeetingUrl={teamsMeetingUrl}
            zoomMeetingUrl={zoomMeetingUrl}
            interactive
            onTeamsClick={handleTeamsClick}
            onZoomClick={handleZoomClick}
          />
        ) : row.format !== "PHYSICAL" ? (
          <SessionProviderIcons
            format={row.format}
            teamsMeetingUrl={teamsMeetingUrl}
            zoomMeetingUrl={zoomMeetingUrl}
          />
        ) : null}
        <span
          className="inline-flex items-center gap-1 text-xs text-slate-500"
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
  timezone,
  sessions,
  eventSpeakers,
  canManage,
  microsoftConnected,
  microsoftNeedsReconnect,
}: {
  orgSlug: string;
  eventId: string;
  timezone: string;
  sessions: SessionRow[];
  eventSpeakers: EventSpeakerOption[];
  canManage: boolean;
  microsoftConnected: boolean;
  microsoftNeedsReconnect: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const onlineSectionRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SessionRow | null>(null);
  const [format, setFormat] = useState<SessionRow["format"]>("PHYSICAL");
  const [meetingPolicy, setMeetingPolicy] =
    useState<SessionMeetingPolicyValue>("BLOCK_REGISTERED");
  const [registrationMode, setRegistrationMode] =
    useState<SessionRegistrationModeValue>("OPEN");
  const [selectedSpeakerIds, setSelectedSpeakerIds] = useState<string[]>([]);
  const [focusOnline, setFocusOnline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const focusSessionId = searchParams.get("session");
  const teamsStatus = searchParams.get("teams");

  const visibleSpeakers = eventSpeakers.filter(
    (speaker) =>
      !speaker.hidden || selectedSpeakerIds.includes(speaker.id),
  );

  useEffect(() => {
    if (!focusSessionId || !canManage) return;
    const row = sessions.find((s) => s.id === focusSessionId);
    if (!row) return;
    setEditing(row);
    setFormat(row.format);
    setMeetingPolicy(row.meetingPolicy);
    setRegistrationMode(row.registrationMode);
    setSelectedSpeakerIds(row.speakers.map((speaker) => speaker.id));
    setError(null);
    setOpen(true);
  }, [focusSessionId, sessions, canManage]);

  useEffect(() => {
    if (!focusOnline || !open) return;
    const timer = window.setTimeout(() => {
      onlineSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
      setFocusOnline(false);
    }, 150);
    return () => window.clearTimeout(timer);
  }, [focusOnline, open]);

  function openCreate() {
    setEditing(null);
    setFormat("PHYSICAL");
    setMeetingPolicy("BLOCK_REGISTERED");
    setRegistrationMode("OPEN");
    setSelectedSpeakerIds([]);
    setFocusOnline(false);
    setError(null);
    setOpen(true);
  }

  function openEdit(row: SessionRow) {
    setEditing(row);
    setFormat(row.format);
    setMeetingPolicy(row.meetingPolicy);
    setRegistrationMode(row.registrationMode);
    setSelectedSpeakerIds(row.speakers.map((speaker) => speaker.id));
    setFocusOnline(false);
    setError(null);
    setOpen(true);
  }

  function openEditOnline(row: SessionRow) {
    setEditing(row);
    setFormat(row.format);
    setMeetingPolicy(row.meetingPolicy);
    setRegistrationMode(row.registrationMode);
    setSelectedSpeakerIds(row.speakers.map((speaker) => speaker.id));
    setFocusOnline(true);
    setError(null);
    setOpen(true);
  }

  function toggleSpeaker(speakerId: string) {
    setSelectedSpeakerIds((current) =>
      current.includes(speakerId)
        ? current.filter((id) => id !== speakerId)
        : [...current, speakerId],
    );
  }

  const whenLabel =
    editing && editing.timeLabel
      ? `${editing.dateLabel} · ${editing.timeLabel}`
      : editing?.dateLabel ?? "";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Programme"
        title="Agenda"
        description={
          <>
            Download the template, fill in all sessions, then import the file to
            build the programme. Datetimes in the file use the event timezone.
            You can also add or edit sessions one at a time.
            {canManage ? (
              <span className="mt-2 block text-xs text-slate-500">
                Times shown in {timezone.replace(/_/g, " ")}. Mark agenda items
                as meeting windows or no-meeting blocks to guide
                auto-scheduling visually.
              </span>
            ) : null}
          </>
        }
        actions={
          canManage ? (
            <>
              <AgendaImport orgSlug={orgSlug} eventId={eventId} timezone={timezone} />
              <Button type="button" leadingIcon="plus" onClick={openCreate}>
                Add session
              </Button>
            </>
          ) : undefined
        }
      />

      {sessions.length === 0 ? (
        <p className="text-sm text-slate-700">No sessions yet.</p>
      ) : (
        <>
          {canManage ? (
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">
                Meeting scheduling uses the agenda
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone="success">
                  {sessionMeetingPolicyLabel("MEETING_WINDOW")}
                </Badge>
                <Badge tone="warning">
                  {sessionMeetingPolicyLabel("BLOCK_ALL")}
                </Badge>
                <Badge tone="muted">
                  {sessionMeetingPolicyLabel("BLOCK_REGISTERED")}
                </Badge>
              </div>
              <p className="mt-3 text-sm text-slate-600">
                If you add at least one meeting window, auto-scheduling will
                only place meetings inside those agenda slots.
              </p>
            </div>
          ) : null}
          <div className="divide-y divide-slate-100 rounded-xl bg-white shadow-sm">
            {sessions.map((row) => (
              <SessionListRow
                key={row.id}
                row={row}
                canManage={canManage}
                onEdit={() => openEdit(row)}
                onEditOnline={() => openEditOnline(row)}
              />
            ))}
          </div>
        </>
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
            formData.set("meetingPolicy", meetingPolicy);
            formData.set("registrationMode", registrationMode);
            formData.delete("speakerIds");
            for (const speakerId of selectedSpeakerIds) {
              formData.append("speakerIds", speakerId);
            }
            setError(null);
            const title = String(formData.get("title") ?? "").trim();
            if (title.length < 2) {
              setError("Session title must be at least 2 characters.");
              return;
            }
            const slot = parseOptionalDateRange(
              String(formData.get("startsAt") ?? ""),
              String(formData.get("endsAt") ?? ""),
              timezone,
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
            <legend className="text-sm font-medium text-slate-700">
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
                  "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm",
                  format === value
                    ? "border-indigo-600 bg-indigo-50 text-slate-900"
                    : "border-slate-200 text-slate-700",
                )}
              >
                <Radio
                  name="formatRadio"
                  value={value}
                  checked={format === value}
                  onChange={() => setFormat(value)}
                />
                {label}
              </label>
            ))}
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-slate-700">
              Attendee registration
            </legend>
            {(["OPEN", "REQUIRED", "CLOSED"] as const).map((value) => (
              <label
                key={value}
                className={cn(
                  "block cursor-pointer rounded-md border px-3 py-2 text-sm",
                  registrationMode === value
                    ? "border-indigo-600 bg-indigo-50"
                    : "border-slate-200",
                )}
              >
                <div className="flex items-start gap-2 rounded-md">
                  <Radio
                    name="registrationModeRadio"
                    value={value}
                    checked={registrationMode === value}
                    onChange={() => setRegistrationMode(value)}
                  />
                  <div>
                    <span className="font-medium text-slate-900">
                      {sessionRegistrationModeLabel(value)}
                    </span>
                    <p className="mt-1 text-xs text-slate-500">
                      {sessionRegistrationModeHelp(value)}
                    </p>
                  </div>
                </div>
              </label>
            ))}
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-slate-700">
              Speakers
            </legend>
            {visibleSpeakers.length === 0 ? (
              <p className="rounded-md border border-dashed border-slate-200 px-3 py-3 text-sm text-slate-500">
                No speakers yet. Add them under Speakers, then link them here.
              </p>
            ) : (
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-slate-200 p-2">
                {visibleSpeakers.map((speaker) => {
                  const checked = selectedSpeakerIds.includes(speaker.id);
                  const subtitle = [speaker.jobTitle, speaker.organization]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <label
                      key={speaker.id}
                      className={cn(
                        "flex cursor-pointer items-start gap-2 rounded-md px-2 py-2 text-sm",
                        checked ? "bg-indigo-50" : "hover:bg-slate-50",
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onChange={() => toggleSpeaker(speaker.id)}
                        aria-label={`Select ${speaker.name}`}
                      />
                      <span className="min-w-0">
                        <span className="block font-medium text-slate-900">
                          {speaker.name}
                          {speaker.hidden ? (
                            <span className="ml-1 text-xs font-normal text-slate-400">
                              (hidden)
                            </span>
                          ) : null}
                        </span>
                        {subtitle ? (
                          <span className="mt-0.5 block truncate text-xs text-slate-500">
                            {subtitle}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-slate-700">
              Meeting scheduling
            </legend>
            {(
              [
                "BLOCK_REGISTERED",
                "BLOCK_ALL",
                "MEETING_WINDOW",
              ] as const
            ).map((value) => (
              <label
                key={value}
                className={cn(
                  "block cursor-pointer rounded-md border px-3 py-2 text-sm",
                  meetingPolicy === value
                    ? "border-indigo-600 bg-indigo-50"
                    : "border-slate-200",
                )}
              >
                <div className="flex items-start gap-2 rounded-md">
                  <Radio
                    name="meetingPolicy"
                    value={value}
                    checked={meetingPolicy === value}
                    onChange={() => setMeetingPolicy(value)}
                  />
                  <div>
                    <span className="font-medium text-slate-900">
                      {sessionMeetingPolicyLabel(value)}
                    </span>
                    <p className="mt-1 text-xs text-slate-500">
                      {sessionMeetingPolicyHelp(value)}
                    </p>
                  </div>
                </div>
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
                editing
                  ? toDatetimeLocalValueForEvent(editing.startsAtValue, timezone)
                  : ""
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
                editing
                  ? toDatetimeLocalValueForEvent(editing.endsAtValue, timezone)
                  : ""
              }
            />
          </div>
          <p className="text-xs text-slate-500">
            Session times use the event timezone ({timezone.replace(/_/g, " ")}).
          </p>

          {canManage ? (
            <SessionOnlineControls
              ref={onlineSectionRef}
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
