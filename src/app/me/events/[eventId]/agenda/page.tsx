import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { AuthzError } from "@/lib/db/tenant";
import { formatSessionSchedule } from "@/lib/session-schedule";
import { AttendeeAgendaPanel } from "./agenda-panel";

export default async function AttendeeAgendaPage({
  params,
}: PageProps<"/me/events/[eventId]/agenda">) {
  const { eventId } = await params;
  const user = await safe(() => requireUser());
  const attendee = await prisma.attendee.findFirst({
    where: { eventId, userId: user.id },
    include: { event: { select: { name: true, timezone: true } } },
  });
  if (!attendee) {
    await safe(async () => {
      throw new AuthzError("You are not registered for this event", 403);
    });
    return null;
  }

  const timezone = attendee.event.timezone || "UTC";

  const sessions = await prisma.session.findMany({
    where: { eventId, organisationId: attendee.organisationId },
    include: {
      registrations: {
        where: { attendeeId: attendee.id },
        select: { id: true },
      },
      onlineMeetings: {
        where: { provider: "TEAMS" },
        select: { joinUrl: true },
        take: 1,
      },
    },
    orderBy: [{ startsAt: "asc" }, { title: "asc" }],
  });

  const pickedCount = sessions.filter((row) => row.registrations.length > 0).length;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-bronze-600">
          {attendee.event.name}
        </p>
        <h1 className="mt-1 font-display text-3xl text-ink-800">Agenda</h1>
        <p className="mt-1 max-w-2xl text-sm text-stone-700">
          Choose the sessions you plan to attend. Online and hybrid sessions show
          a Teams join link when the organiser has created one.
        </p>
        {sessions.length > 0 ? (
          <p className="mt-3 text-xs text-stone-500">
            Times shown in {timezone.replace(/_/g, " ")}
            {pickedCount > 0
              ? ` · ${pickedCount} selected`
              : null}
          </p>
        ) : null}
      </div>

      <AttendeeAgendaPanel
        eventId={eventId}
        sessions={sessions.map((row) => {
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
            dateLabel: schedule.dateLabel,
            timeLabel: schedule.timeLabel,
            picked: row.registrations.length > 0,
            teamsJoinUrl: row.onlineMeetings[0]?.joinUrl ?? null,
          };
        })}
      />
    </div>
  );
}
