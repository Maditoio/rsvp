"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ExternalLink } from "lucide-react";
import {
  setAllOrganisationEventsSuspended,
  setEventSuspended,
  setOrganisationSuspended,
} from "@/modules/platform/governance";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  PlatformStatusTag,
  formatPlatformDate,
} from "../../platform-ui";

type EventRow = {
  id: string;
  name: string;
  slug: string;
  suspendedAt: Date | null;
  startsAt: Date | null;
  endsAt: Date | null;
};

type Props = {
  organisation: {
    id: string;
    name: string;
    slug: string;
    suspendedAt: Date | null;
  };
  events: EventRow[];
};

export function PlatformOrganisationControls({ organisation, events }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const orgSuspended = Boolean(organisation.suspendedAt);
  const activeEvents = events.filter((event) => !event.suspendedAt);
  const suspendedEvents = events.filter((event) => event.suspendedAt);

  const toggleOrg = (suspended: boolean) => {
    setBusyId("org");
    start(async () => {
      const result = await setOrganisationSuspended(organisation.id, suspended);
      setBusyId(null);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        suspended
          ? `${organisation.name} has been suspended.`
          : `${organisation.name} is active again.`,
      );
      router.refresh();
    });
  };

  const toggleEvent = (event: EventRow, suspended: boolean) => {
    setBusyId(event.id);
    start(async () => {
      const result = await setEventSuspended(event.id, suspended);
      setBusyId(null);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        suspended
          ? `${event.name} has been suspended.`
          : `${event.name} is active again.`,
      );
      router.refresh();
    });
  };

  const toggleAllEvents = (suspended: boolean) => {
    setBusyId("all-events");
    start(async () => {
      const result = await setAllOrganisationEventsSuspended(
        organisation.id,
        suspended,
      );
      setBusyId(null);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        suspended
          ? `Suspended ${result.data?.updated ?? 0} event(s).`
          : `Restored ${result.data?.updated ?? 0} event(s).`,
      );
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-medium text-slate-900">
              {organisation.name}
            </h2>
            <PlatformStatusTag suspended={orgSuspended} />
          </div>
          <p className="mt-1 text-sm text-slate-500">{organisation.slug}</p>
          {orgSuspended ? (
            <p className="mt-2 text-sm text-slate-600">
              Suspended since {formatPlatformDate(organisation.suspendedAt)}.
              Organisers cannot access this company; public event sites are
              hidden.
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/app/${organisation.slug}`}
            className="inline-flex h-10 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Open organiser
            <ExternalLink className="size-4" strokeWidth={1.75} aria-hidden />
          </Link>
          <Button
            type="button"
            variant={orgSuspended ? "primary" : "destructive"}
            disabled={pending}
            onClick={() => toggleOrg(!orgSuspended)}
          >
            {busyId === "org"
              ? "Saving…"
              : orgSuspended
                ? "Restore company"
                : "Suspend company"}
          </Button>
        </div>
      </div>

      <div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="font-medium text-slate-900">Events</h3>
            <p className="mt-1 text-sm text-slate-600">
              {events.length} total · {activeEvents.length} active ·{" "}
              {suspendedEvents.length} suspended
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeEvents.length > 0 ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={pending}
                onClick={() => toggleAllEvents(true)}
              >
                {busyId === "all-events" ? "Saving…" : "Suspend all events"}
              </Button>
            ) : null}
            {suspendedEvents.length > 0 ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={pending}
                onClick={() => toggleAllEvents(false)}
              >
                {busyId === "all-events" ? "Saving…" : "Restore all events"}
              </Button>
            ) : null}
          </div>
        </div>

        {events.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">No events yet.</p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-[0.04em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">Dates</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {events.map((event) => {
                  const eventSuspended = Boolean(event.suspendedAt);
                  const effectiveSuspended = orgSuspended || eventSuspended;
                  return (
                    <tr key={event.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{event.name}</p>
                        <p className="text-slate-500">{event.slug}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatPlatformDate(event.startsAt)}
                        {event.endsAt ? ` – ${formatPlatformDate(event.endsAt)}` : ""}
                      </td>
                      <td className="px-4 py-3">
                        {orgSuspended ? (
                          <PlatformStatusTag
                            suspended
                            label="Company suspended"
                          />
                        ) : (
                          <PlatformStatusTag suspended={eventSuspended} />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/app/${organisation.slug}/events/${event.id}`}
                            className="inline-flex h-9 items-center rounded-full border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Open
                          </Link>
                          <Button
                            type="button"
                            size="sm"
                            variant={effectiveSuspended ? "primary" : "destructive"}
                            disabled={pending || orgSuspended}
                            onClick={() => toggleEvent(event, !eventSuspended)}
                          >
                            {busyId === event.id
                              ? "Saving…"
                              : eventSuspended
                                ? "Restore"
                                : "Suspend"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {orgSuspended ? (
          <p className="mt-2 text-xs text-slate-500">
            Individual event controls are disabled while the company is suspended.
          </p>
        ) : null}
      </div>
    </div>
  );
}
