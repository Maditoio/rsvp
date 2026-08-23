"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  CalendarDays,
  Clock3,
  ExternalLink,
  MapPin,
  Video,
} from "lucide-react";
import { toggleMySession } from "@/modules/sessions/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type AttendeeSessionRow = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  format: "PHYSICAL" | "ONLINE" | "HYBRID";
  dateLabel: string;
  timeLabel: string | null;
  picked: boolean;
  teamsJoinUrl: string | null;
};

function formatLabel(format: AttendeeSessionRow["format"]) {
  switch (format) {
    case "ONLINE":
      return "Online";
    case "HYBRID":
      return "Hybrid";
    default:
      return "In person";
  }
}

function SessionCard({
  row,
  pending,
  onToggle,
}: {
  row: AttendeeSessionRow;
  pending: boolean;
  onToggle: () => void;
}) {
  const locationLabel =
    row.location ||
    (row.format === "ONLINE"
      ? "Online"
      : row.format === "HYBRID"
        ? "Hybrid"
        : null);

  return (
    <article
      className={cn(
        "rounded-md border bg-white p-4 sm:p-5",
        row.picked ? "border-emerald-200" : "border-slate-200",
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-start gap-2">
            <h2 className="min-w-0 flex-1 text-[1.0625rem] font-semibold leading-snug text-slate-900">
              {row.title}
            </h2>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone={row.format === "PHYSICAL" ? "muted" : "info"}>
                {formatLabel(row.format)}
              </Badge>
              {row.picked ? (
                <Badge tone="success">On my agenda</Badge>
              ) : null}
            </div>
          </div>

          {row.description ? (
            <p className="text-sm leading-relaxed text-slate-600">
              {row.description}
            </p>
          ) : null}

          <dl className="flex flex-col gap-1.5 text-sm text-slate-700 sm:flex-row sm:flex-wrap sm:gap-x-5 sm:gap-y-1.5">
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
                <dd className="font-mono text-[0.8125rem]">{row.timeLabel}</dd>
              </div>
            ) : null}
            {locationLabel ? (
              <div className="inline-flex items-center gap-1.5">
                <MapPin
                  className="size-3.5 shrink-0 text-slate-400"
                  aria-hidden
                />
                <dt className="sr-only">Location</dt>
                <dd>{locationLabel}</dd>
              </div>
            ) : null}
            {row.teamsJoinUrl ? (
              <div className="inline-flex items-center gap-1.5">
                <Video
                  className="size-3.5 shrink-0 text-slate-400"
                  aria-hidden
                />
                <dt className="sr-only">Platform</dt>
                <dd>Microsoft Teams</dd>
              </div>
            ) : null}
          </dl>

          {row.teamsJoinUrl ? (
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5">
              <p className="text-[0.71875rem] font-semibold uppercase tracking-[0.04em] text-indigo-600">
                Join link
              </p>
              <a
                href={row.teamsJoinUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex max-w-full items-center gap-1.5 text-sm font-medium text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-slate-900"
              >
                <ExternalLink className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">Join Teams meeting</span>
              </a>
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-row flex-wrap gap-2 sm:flex-col sm:items-stretch">
          {row.teamsJoinUrl ? (
            <a
              href={row.teamsJoinUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-indigo-600 px-3 text-[0.8125rem] font-semibold text-white hover:bg-indigo-700"
            >
              <ExternalLink className="size-3.5" aria-hidden />
              Join session
            </a>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant={row.picked ? "secondary" : "primary"}
            disabled={pending}
            onClick={onToggle}
            className="sm:min-w-[7.5rem]"
          >
            {row.picked ? "Remove" : "Add to agenda"}
          </Button>
        </div>
      </div>
    </article>
  );
}

export function AttendeeAgendaPanel({
  eventId,
  sessions,
}: {
  eventId: string;
  sessions: AttendeeSessionRow[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function toggle(sessionId: string) {
    const formData = new FormData();
    formData.set("sessionId", sessionId);
    setError(null);
    setPendingId(sessionId);
    start(async () => {
      try {
        await toggleMySession(eventId, formData);
        router.refresh();
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Could not update agenda",
        );
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <div className="space-y-4">
      {sessions.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-200 bg-white px-5 py-10 text-center">
          <p className="text-sm font-medium text-slate-700">
            No sessions have been published
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Check back once the organiser adds programme sessions.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {sessions.map((row) => (
            <li key={row.id}>
              <SessionCard
                row={row}
                pending={pending && pendingId === row.id}
                onToggle={() => toggle(row.id)}
              />
            </li>
          ))}
        </ul>
      )}

      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
