import { Suspense } from "react";
import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { hasPermission } from "@/lib/authz/permissions";
import { microsoftConnectedForUser } from "@/modules/meetings/session-teams-actions";
import { formatSessionSchedule } from "@/lib/session-schedule";
import { speakerDisplayName } from "@/modules/speakers/config";
import { mapSessionSpeakers } from "@/modules/sessions/speakers";
import { AgendaPanel } from "./agenda-panel";

export default async function AgendaPage({
  params,
}: PageProps<"/app/[orgSlug]/events/[eventId]/agenda">) {
  const { orgSlug, eventId } = await params;
  const ctx = await safe(() => requireEvent(orgSlug, eventId, "event.read"));
  const event = await prisma.event.findFirst({
    where: { id: eventId, organisationId: ctx.organisation.id },
    select: { timezone: true },
  });
  const timezone = event?.timezone || "UTC";

  const [sessions, eventSpeakers, microsoft] = await Promise.all([
    prisma.session.findMany({
      where: { eventId, organisationId: ctx.organisation.id },
      include: {
        _count: { select: { registrations: true } },
        speakers: {
          orderBy: { sortOrder: "asc" },
          include: {
            speaker: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                jobTitle: true,
                organization: true,
                photoUrl: true,
              },
            },
          },
        },
        onlineMeetings: {
          where: { provider: "TEAMS" },
          select: {
            provider: true,
            joinUrl: true,
            providerMeetingId: true,
          },
          take: 1,
        },
      },
      orderBy: [{ startsAt: "asc" }, { title: "asc" }],
    }),
    prisma.eventSpeaker.findMany({
      where: { eventId, organisationId: ctx.organisation.id },
      orderBy: [{ sortOrder: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        jobTitle: true,
        organization: true,
        hidden: true,
      },
    }),
    microsoftConnectedForUser(ctx.user.id),
  ]);

  return (
    <div>
      <Suspense fallback={null}>
        <AgendaPanel
          orgSlug={orgSlug}
          eventId={eventId}
          canManage={hasPermission(ctx.grants, "event.update")}
          microsoftConnected={microsoft.connected}
          microsoftNeedsReconnect={microsoft.needsReconnect}
          timezone={timezone}
          eventSpeakers={eventSpeakers.map((speaker) => ({
            id: speaker.id,
            name: speakerDisplayName(speaker),
            jobTitle: speaker.jobTitle,
            organization: speaker.organization,
            hidden: speaker.hidden,
          }))}
          sessions={sessions.map((row) => {
            const teams = row.onlineMeetings[0];
            const schedule = formatSessionSchedule(
              row.startsAt,
              row.endsAt,
              timezone,
            );
            return {
              id: row.id,
              title: row.title,
              description: row.description,
              location: row.location,
              format: row.format,
              meetingPolicy: row.meetingPolicy,
              registrationMode: row.registrationMode,
              dateLabel: schedule.dateLabel,
              timeLabel: schedule.timeLabel,
              startsAtValue: row.startsAt?.toISOString() ?? "",
              endsAtValue: row.endsAt?.toISOString() ?? "",
              capacity: row.capacity,
              registrations: row._count.registrations,
              speakers: mapSessionSpeakers(row.speakers),
              teamsMeeting: teams
                ? {
                    provider: "TEAMS" as const,
                    joinUrl: teams.joinUrl,
                    providerMeetingId: teams.providerMeetingId,
                  }
                : null,
            };
          })}
        />
      </Suspense>
    </div>
  );
}
