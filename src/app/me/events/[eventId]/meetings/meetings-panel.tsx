"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Hourglass,
  Lightbulb,
  MapPin,
} from "lucide-react";
import { respondToMeeting, cancelMyMeeting, rescheduleMyMeeting } from "@/modules/meetings/actions";
import { Button, ButtonPlusIcon } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Radio } from "@/components/ui/radio";
import { Badge } from "@/components/ui/badge";
import { cn, displayName, humanizeEnum } from "@/lib/utils";
import { parseDateRange } from "@/lib/validation";
import { useToast } from "@/components/ui/toast";

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
  title: string;
  counterpartInitials: string;
  eventName: string;
  status: string;
  dateLabel: string | null;
  timeLabel: string | null;
  room: string | null;
  roomId: string | null;
  durationMins: number | null;
  isPast: boolean;
  isToday: boolean;
  startsAtIso: string | null;
  endsAtIso: string | null;
};

type TabId = "upcoming" | "requests" | "past";

type DrawerMode = "request" | "detail" | "reschedule" | null;

function toDatetimeLocalValue(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function AttendeeMeetingsPanel({
  eventId,
  eventName,
  rooms = [],
  incoming,
  outgoing,
  meetings,
}: {
  eventId: string;
  eventName: string;
  rooms?: RoomOption[];
  incoming: RequestRow[];
  outgoing: RequestRow[];
  meetings: MeetingRow[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<TabId>(
    incoming.length > 0 ? "requests" : "upcoming",
  );
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [current, setCurrent] = useState<RequestRow | null>(null);
  const [detailMeeting, setDetailMeeting] = useState<MeetingRow | null>(null);
  const [cancelTarget, setCancelTarget] = useState<MeetingRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const upcoming = useMemo(
    () => meetings.filter((m) => !m.isPast && m.status !== "CANCELLED"),
    [meetings],
  );
  const past = useMemo(() => meetings.filter((m) => m.isPast), [meetings]);
  const pendingOutgoing = outgoing.filter((r) => r.status === "PENDING");

  const todayMeetings = upcoming.filter((m) => m.isToday);
  const laterMeetings = upcoming.filter((m) => !m.isToday);

  const directoryHref = `/me/events/${eventId}/directory`;

  function openMeetingDetail(meeting: MeetingRow) {
    setDetailMeeting(meeting);
    setCurrent(null);
    setError(null);
    setDrawerMode("detail");
  }

  function openReschedule(meeting: MeetingRow) {
    setDetailMeeting(meeting);
    setCurrent(null);
    setError(null);
    setDrawerMode("reschedule");
  }

  return (
    <div className="space-y-8">
      {incoming.length > 0 ? (
        <div
          className="rounded-xl bg-amber-500/10 px-4 py-4 sm:px-5"
          role="status"
        >
          <p className="text-[0.71875rem] font-semibold uppercase tracking-[0.04em] text-indigo-600">
            Action required
          </p>
          <p className="mt-1 font-display text-xl text-slate-900">
            {incoming.length === 1
              ? "You have a pending connection request"
              : `You have ${incoming.length} pending connection requests`}
          </p>
          <p className="mt-1 text-sm text-slate-700">
            Review incoming requests below or use the notification bell to accept
            or decline.
          </p>
          <button
            type="button"
            onClick={() => setTab("requests")}
            className="mt-3 inline-flex text-sm font-semibold text-slate-700 underline-offset-4 hover:underline"
          >
            Review requests
          </button>
        </div>
      ) : null}

      {warning ? (
        <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-sm text-amber-800">
          {warning}
        </p>
      ) : null}

      <PageHeader
        eyebrow={eventName}
        title="Meetings"
        description="Manage your networking meetings and requests."
        actions={
          <Link
            href={directoryHref}
            className="inline-flex h-11 items-center gap-1.5 rounded-full bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            <ButtonPlusIcon />
            Request a meeting
          </Link>
        }
      />

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard
          icon={<Hourglass className="size-5 text-indigo-600" strokeWidth={1.75} />}
          iconBg="bg-amber-500/15"
          title="Pending requests"
          value={incoming.length}
          hint={
            incoming.length === 0
              ? "No action required"
              : `${incoming.length} awaiting your response`
          }
          active={tab === "requests"}
          onClick={() => setTab("requests")}
        />
        <SummaryCard
          icon={<CalendarDays className="size-5 text-success" strokeWidth={1.75} />}
          iconBg="bg-emerald-50"
          title="Upcoming meetings"
          value={upcoming.length}
          hint={
            upcoming.length === 0
              ? "Nothing scheduled yet"
              : `${todayMeetings.length} today`
          }
          active={tab === "upcoming"}
          onClick={() => setTab("upcoming")}
        />
        <SummaryCard
          icon={<CheckCircle2 className="size-5 text-info" strokeWidth={1.75} />}
          iconBg="bg-info-bg"
          title="Completed"
          value={past.filter((m) => m.status !== "CANCELLED").length}
          hint={past.length === 0 ? "No past meetings" : "View history"}
          active={tab === "past"}
          onClick={() => setTab("past")}
        />
      </div>

      {/* Tabs */}
      <div>
        <div className="flex gap-1 border-b border-slate-200">
          {(
            [
              { id: "upcoming", label: `Upcoming (${upcoming.length})` },
              {
                id: "requests",
                label: `Requests (${incoming.length + pendingOutgoing.length})`,
              },
              { id: "past", label: `Past (${past.length})` },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "relative px-4 py-3 text-sm transition-colors",
                tab === item.id
                  ? "font-semibold text-indigo-700"
                  : "text-slate-600 hover:text-slate-900",
              )}
            >
              {item.label}
              {tab === item.id ? (
                <span
                  className="absolute inset-x-4 bottom-0 h-0.5 bg-amber-500/100"
                  aria-hidden
                />
              ) : null}
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-8">
          {tab === "upcoming" ? (
            upcoming.length === 0 ? (
              <EmptyState
                title="No upcoming meetings"
                body="Browse the directory to request a meeting with another attendee."
                href={directoryHref}
                cta="Request a meeting"
              />
            ) : (
              <>
                {todayMeetings.length > 0 ? (
                  <MeetingGroup
                    eventId={eventId}
                    label="Today"
                    meetings={todayMeetings}
                    onView={openMeetingDetail}
                  />
                ) : null}
                {laterMeetings.length > 0 ? (
                  <MeetingGroup
                    eventId={eventId}
                    label="Upcoming"
                    meetings={laterMeetings}
                    onView={openMeetingDetail}
                  />
                ) : null}
              </>
            )
          ) : null}

          {tab === "requests" ? (
            <div className="space-y-8">
              <section>
                <h2 className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-slate-500">
                  Incoming
                </h2>
                {incoming.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-700">
                    No pending requests.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {incoming.map((row) => (
                      <RequestCard
                        key={row.id}
                        row={row}
                        onReview={() => {
                          setCurrent(row);
                          setDetailMeeting(null);
                          setError(null);
                          setDrawerMode("request");
                        }}
                      />
                    ))}
                  </ul>
                )}
              </section>
              <section>
                <h2 className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-slate-500">
                  Sent
                </h2>
                {outgoing.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-700">
                    You have not sent any requests.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {outgoing.map((row) => (
                      <RequestCard key={row.id} row={row} />
                    ))}
                  </ul>
                )}
              </section>
            </div>
          ) : null}

          {tab === "past" ? (
            past.length === 0 ? (
              <EmptyState
                title="No past meetings"
                body="Completed and cancelled meetings will appear here."
              />
            ) : (
              <MeetingGroup
                eventId={eventId}
                label="Past"
                meetings={past}
                onView={openMeetingDetail}
              />
            )
          ) : null}
        </div>
      </div>

      {/* Connection CTA */}
      <div className="flex flex-col gap-4 rounded-xl bg-white shadow-sm p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex gap-4">
          <div
            className="hidden size-14 shrink-0 items-center justify-center rounded-md bg-amber-500/10 sm:flex"
            aria-hidden
          >
            <HandshakeGlyph />
          </div>
          <div>
            <h2 className="font-display text-xl text-slate-900">
              Make meaningful connections
            </h2>
            <p className="mt-1 max-w-xl text-sm text-slate-700">
              Request meetings with people who match your goals. Accepting a
              request creates a meeting; rooms are assigned by the organiser.
            </p>
          </div>
        </div>
        <Link
          href={directoryHref}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Request a meeting
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>

      {/* Tip */}
      <div className="flex items-start gap-3 rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-800">
        <Lightbulb className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} aria-hidden />
        <p>
          <span className="font-semibold">Tip:</span> Be on time for your
          meetings and come prepared with topics you&apos;d like to discuss.
        </p>
      </div>

      {/* Review request drawer */}
      <Drawer
        open={drawerMode === "request"}
        onClose={() => setDrawerMode(null)}
        title="Review meeting request"
        description="Accepting creates a meeting. Declining does not."
      >
        {current ? (
          <form
            className="space-y-4"
            action={(formData) => {
              setError(null);
              setWarning(null);
              const decision = String(formData.get("decision") ?? "");
              if (decision !== "accept" && decision !== "decline") {
                const message = "Choose Accept or Decline before submitting.";
                setError(message);
                toast.error(message);
                return;
              }
              const startsAtRaw = String(formData.get("startsAt") ?? "").trim();
              const endsAtRaw = String(formData.get("endsAt") ?? "").trim();
              if (startsAtRaw || endsAtRaw) {
                const slot = parseDateRange(startsAtRaw, endsAtRaw);
                if (!slot.ok) {
                  setError(slot.error);
                  toast.error(slot.error);
                  return;
                }
              }
              start(async () => {
                const result = await respondToMeeting(eventId, formData);
                if (!result.ok) {
                  setError(result.error);
                  toast.error(result.error);
                  return;
                }
                if (result.data.calendarWarning) {
                  setWarning(result.data.calendarWarning);
                  toast.toast({
                    message: result.data.calendarWarning,
                    tone: "default",
                    title: "Calendar note",
                  });
                } else {
                  toast.success("Meeting request updated.");
                }
                setDrawerMode(null);
                router.refresh();
              });
            }}
          >
            <input type="hidden" name="requestId" value={current.id} />
            <p className="font-medium text-slate-900">
              {displayName(current.counterpart)}
            </p>
            {current.message ? (
              <p className="text-sm text-slate-700">{current.message}</p>
            ) : null}
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 rounded-md border border-slate-200 p-3 text-body">
                <Radio name="decision" value="accept" required />
                Accept
              </label>
              <label className="flex items-center gap-2 rounded-md border border-slate-200 p-3 text-body">
                <Radio name="decision" value="decline" required />
                Decline
              </label>
            </div>
            <p className="text-label text-slate-500">
              Optional scheduling
            </p>
            <label className="flex items-start gap-3 text-body text-slate-700">
              <Checkbox name="autoSchedule" value="on" className="mt-0.5" />
              <span>Auto-schedule (find the first available slot)</span>
            </label>
            {rooms.length > 0 ? (
              <div>
                <Label htmlFor="roomId">Room</Label>
                <select
                  id="roomId"
                  name="roomId"
                  className="mt-1 block w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900"
                >
                  <option value="">No room</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
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

      {/* Meeting detail drawer */}
      <Drawer
        open={drawerMode === "detail"}
        onClose={() => setDrawerMode(null)}
        title="Meeting details"
        description={detailMeeting?.eventName}
      >
        {detailMeeting ? (
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-display text-xl text-slate-900">
                {detailMeeting.title}
              </p>
              <div className="mt-2">
                <MeetingStatusBadge status={detailMeeting.status} />
              </div>
            </div>
            <dl className="space-y-3">
              <DetailRow label="Date" value={detailMeeting.dateLabel ?? "TBC"} />
              <DetailRow label="Time" value={detailMeeting.timeLabel ?? "TBC"} />
              <DetailRow label="Location" value={detailMeeting.room ?? "TBC"} />
              <DetailRow
                label="Duration"
                value={
                  detailMeeting.durationMins
                    ? `${detailMeeting.durationMins} min`
                    : "—"
                }
              />
            </dl>
            {detailMeeting.status === "SCHEDULED" && !detailMeeting.isPast ? (
              <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={pending}
                  onClick={() => openReschedule(detailMeeting)}
                >
                  Reschedule
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={pending}
                  onClick={() => setCancelTarget(detailMeeting)}
                >
                  Cancel meeting
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </Drawer>

      {/* Reschedule drawer */}
      <Drawer
        open={drawerMode === "reschedule"}
        onClose={() => setDrawerMode(null)}
        title="Reschedule meeting"
        description={detailMeeting ? `Propose a new time for ${detailMeeting.title}` : undefined}
        size="sm"
      >
        {detailMeeting ? (
          <form
            key={detailMeeting.id}
            className="space-y-4"
            action={(formData) => {
              setError(null);
              setWarning(null);
              const slot = parseDateRange(
                String(formData.get("startsAt") ?? ""),
                String(formData.get("endsAt") ?? ""),
              );
              if (!slot.ok) {
                setError(slot.error);
                toast.error(slot.error);
                return;
              }
              start(async () => {
                const result = await rescheduleMyMeeting(eventId, formData);
                if (!result.ok) {
                  setError(result.error);
                  toast.error(result.error);
                  return;
                }
                if (result.data.calendarWarning) {
                  setWarning(result.data.calendarWarning);
                  toast.toast({
                    message: result.data.calendarWarning,
                    tone: "default",
                    title: "Calendar note",
                  });
                } else {
                  toast.success("Meeting rescheduled.");
                }
                setDrawerMode(null);
                router.refresh();
              });
            }}
          >
            <input type="hidden" name="meetingId" value={detailMeeting.id} />
            {rooms.length > 0 ? (
              <div>
                <Label htmlFor="my-reschedule-roomId">Room</Label>
                <select
                  id="my-reschedule-roomId"
                  name="roomId"
                  defaultValue={detailMeeting.roomId ?? ""}
                  className="mt-1 block w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900"
                >
                  <option value="">No room</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div>
              <Label htmlFor="my-reschedule-startsAt">Start</Label>
              <Input
                id="my-reschedule-startsAt"
                name="startsAt"
                type="datetime-local"
                required
                defaultValue={toDatetimeLocalValue(detailMeeting.startsAtIso)}
              />
            </div>
            <div>
              <Label htmlFor="my-reschedule-endsAt">End</Label>
              <Input
                id="my-reschedule-endsAt"
                name="endsAt"
                type="datetime-local"
                required
                defaultValue={toDatetimeLocalValue(detailMeeting.endsAtIso)}
              />
            </div>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={pending}
                onClick={() => setDrawerMode("detail")}
              >
                Back
              </Button>
              <Button disabled={pending}>
                {pending ? "Saving…" : "Reschedule"}
              </Button>
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
            ? `Cancel ${cancelTarget.title}? Synced Google and Outlook events will be removed when possible.`
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
            const result = await cancelMyMeeting(eventId, fd);
            if (!result.ok) {
              setError(result.error);
              toast.error(result.error);
              return;
            }
            if (result.data.calendarWarning) {
              setWarning(result.data.calendarWarning);
              toast.toast({
                message: result.data.calendarWarning,
                tone: "default",
                title: "Calendar note",
              });
            } else {
              toast.success("Meeting cancelled.");
            }
            setCancelTarget(null);
            setDrawerMode(null);
            router.refresh();
          });
        }}
      />
    </div>
  );
}

function SummaryCard({
  icon,
  iconBg,
  title,
  value,
  hint,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  value: number;
  hint: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-md border bg-white p-4 text-left transition-colors",
        active
          ? "border-indigo-400 ring-1 ring-indigo-600/10"
          : "border-slate-200 hover:border-slate-200 hover:bg-slate-50",
      )}
    >
      <span
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-md",
          iconBg,
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-slate-600">{title}</span>
        <span className="mt-0.5 block text-2xl font-semibold tabular-nums text-slate-900">
          {value}
        </span>
        <span className="mt-0.5 block text-xs text-slate-500">{hint}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-slate-400" aria-hidden />
    </button>
  );
}

function MeetingGroup({
  eventId,
  label,
  meetings,
  onView,
}: {
  eventId: string;
  label: string;
  meetings: MeetingRow[];
  onView: (m: MeetingRow) => void;
}) {
  return (
    <section>
      <h2 className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-slate-500">
        {label}
      </h2>
      <ul className="mt-3 space-y-3">
        {meetings.map((meeting) => (
          <li key={meeting.id}>
            <MeetingCard
              eventId={eventId}
              meeting={meeting}
              onView={() => onView(meeting)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function MeetingCard({
  eventId,
  meeting,
  onView,
}: {
  eventId: string;
  meeting: MeetingRow;
  onView: () => void;
}) {
  return (
    <article className="rounded-xl bg-white shadow-sm p-4 sm:p-5">
      <div className="flex flex-wrap items-start gap-4">
        <div
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700"
          aria-hidden
        >
          {meeting.counterpartInitials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-[0.9375rem] font-semibold text-slate-900">
                {meeting.title}
              </h3>
              <p className="mt-0.5 text-sm text-slate-500">{meeting.eventName}</p>
            </div>
            <MeetingStatusBadge status={meeting.status} />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-slate-700">
            {meeting.dateLabel ? (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-3.5 text-slate-400" aria-hidden />
                {meeting.dateLabel}
              </span>
            ) : null}
            {meeting.timeLabel ? (
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="size-3.5 text-slate-400" aria-hidden />
                {meeting.timeLabel}
              </span>
            ) : null}
            {meeting.room ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5 text-slate-400" aria-hidden />
                {meeting.room}
              </span>
            ) : null}
          </div>
          {meeting.durationMins ? (
            <p className="mt-2 inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600">
              {meeting.durationMins} min meeting
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
            {meeting.roomId ? (
              <Link
                href={`/me/events/${eventId}/map?room=${meeting.roomId}`}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-slate-900"
              >
                <MapPin className="size-3.5" aria-hidden />
                Navigate
              </Link>
            ) : null}
            <button
              type="button"
              onClick={onView}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-700 hover:text-indigo-800"
            >
              View details
              <ArrowRight className="size-3.5" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function RequestCard({
  row,
  onReview,
}: {
  row: RequestRow;
  onReview?: () => void;
}) {
  const initials = displayName(row.counterpart)
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <article className="rounded-xl bg-white shadow-sm p-4 sm:p-5">
      <div className="flex flex-wrap items-start gap-4">
        <div
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700"
          aria-hidden
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-[0.9375rem] font-semibold text-slate-900">
                {displayName(row.counterpart)}
              </h3>
              <p className="mt-0.5 text-sm text-slate-500">
                {row.counterpart.company || (row.inbound ? "Incoming request" : "Sent request")}
              </p>
            </div>
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
          </div>
          {row.message ? (
            <p className="mt-2 text-sm text-slate-700">{row.message}</p>
          ) : null}
          <p className="mt-2 text-xs text-slate-500">{row.createdAt}</p>
          {onReview ? (
            <div className="mt-4 flex justify-end">
              <Button type="button" size="sm" variant="secondary" onClick={onReview}>
                Review
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function MeetingStatusBadge({ status }: { status: string }) {
  const tone =
    status === "COMPLETED"
      ? "success"
      : status === "CANCELLED" || status === "NO_SHOW"
        ? "danger"
        : status === "SCHEDULED"
          ? "info"
          : "default";
  return <Badge tone={tone}>{humanizeEnum(status)}</Badge>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function EmptyState({
  title,
  body,
  href,
  cta,
}: {
  title: string;
  body: string;
  href?: string;
  cta?: string;
}) {
  return (
    <div className="rounded-md border border-dashed border-slate-200 bg-white px-6 py-10 text-center">
      <p className="font-medium text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-600">{body}</p>
      {href && cta ? (
        <Link
          href={href}
          className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-full bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          <ButtonPlusIcon />
          {cta}
        </Link>
      ) : null}
    </div>
  );
}

function HandshakeGlyph() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="text-indigo-600"
      aria-hidden
    >
      <path d="M11 12h2a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-1" />
      <path d="M13 12h-2a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h1" />
      <path d="m8 14 1.5 1.5a2 2 0 0 0 2.8 0L14 14" />
      <path d="M4 10v4a8 8 0 0 0 16 0v-4" />
    </svg>
  );
}
