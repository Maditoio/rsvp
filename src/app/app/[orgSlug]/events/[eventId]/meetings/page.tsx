import { Suspense } from "react";
import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { hasPermission } from "@/lib/authz/permissions";
import { displayName } from "@/lib/utils";
import { loadMeetingCalendarStatuses } from "@/modules/meetings/calendar-status";
import { loadMeetingConflicts } from "@/modules/meetings/conflicts";
import { loadSuggestedPairings } from "@/modules/matchmaking/suggestions";
import { computeSlotHeatmap } from "@/modules/meetings/heatmap";
import { loadRoomBoard } from "@/modules/meetings/room-board";
import {
  loadModerationQueue,
  loadAttendeeRequestLimits,
} from "@/modules/meetings/moderation";
import { loadTodaysMeetings } from "@/modules/events/analytics-advanced";
import { MeetingsPanel } from "./meetings-panel";
import type { MeetingsTabId } from "./meetings-tabs";

function toDatetimeLocalValue(date: Date | null | undefined) {
  if (!date) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const VALID_TABS = new Set<MeetingsTabId>([
  "all",
  "today",
  "unscheduled",
  "conflicts",
  "suggestions",
  "heatmap",
  "room-list",
  "rooms",
  "moderation",
]);

export default async function EventMeetingsPage({
  params,
  searchParams,
}: PageProps<"/app/[orgSlug]/events/[eventId]/meetings">) {
  const { orgSlug, eventId } = await params;
  const query = await searchParams;
  const tabParam = typeof query.tab === "string" ? query.tab : "all";
  const activeTab: MeetingsTabId = VALID_TABS.has(tabParam as MeetingsTabId)
    ? (tabParam as MeetingsTabId)
    : "all";

  const ctx = await safe(() => requireEvent(orgSlug, eventId, "event.read"));

  const eventMeta = await prisma.event.findFirst({
    where: { id: eventId, organisationId: ctx.organisation.id },
    select: { timezone: true },
  });

  const [
    rooms,
    meetings,
    settings,
    conflicts,
    suggestions,
    heatmap,
    roomBoard,
    moderationQueue,
    requestLimits,
    todaysMeetings,
    attendees,
  ] = await Promise.all([
    prisma.meetingRoom.findMany({
      where: { eventId, organisationId: ctx.organisation.id },
      orderBy: { name: "asc" },
    }),
    prisma.meeting.findMany({
      where: { eventId, organisationId: ctx.organisation.id },
      include: {
        room: { select: { name: true } },
        participants: {
          include: {
            attendee: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { startsAt: "asc" },
    }),
    prisma.eventSettings.findUnique({
      where: { eventId },
      select: { aiInsightsEnabled: true },
    }),
    loadMeetingConflicts(ctx.organisation.id, eventId),
    loadSuggestedPairings(ctx.organisation.id, eventId),
    computeSlotHeatmap(ctx.organisation.id, eventId),
    loadRoomBoard(ctx.organisation.id, eventId),
    loadModerationQueue(ctx.organisation.id, eventId),
    loadAttendeeRequestLimits(ctx.organisation.id, eventId),
    loadTodaysMeetings(
      ctx.organisation.id,
      eventId,
      eventMeta?.timezone ?? "UTC",
    ),
    prisma.attendee.findMany({
      where: { eventId, organisationId: ctx.organisation.id },
      select: { id: true, firstName: true, lastName: true, company: true },
      orderBy: { lastName: "asc" },
    }),
  ]);

  const calendarStatuses = await loadMeetingCalendarStatuses(
    ctx.organisation.id,
    eventId,
    meetings.map((row) => row.id),
  );

  const meetingRows = meetings.map((row) => {
    const cal = calendarStatuses.get(row.id);
    return {
      id: row.id,
      status: row.status,
      room: row.room?.name ?? null,
      roomId: row.roomId,
      when: row.startsAt?.toLocaleString("en-GB") ?? "",
      startsAtLocal: toDatetimeLocalValue(row.startsAt),
      endsAtLocal: toDatetimeLocalValue(row.endsAt),
      participants: row.participants
        .map((participant) => displayName(participant.attendee))
        .join(" · "),
      calendarStatus: cal?.status ?? "not_applicable",
      calendarWarnings: cal?.warnings ?? [],
      isUnscheduled: row.status === "SCHEDULED" && !row.startsAt,
    };
  });

  const unscheduledCount = meetingRows.filter((row) => row.isUnscheduled).length;
  const pendingModeration = moderationQueue.length;

  return (
    <div>
      <Suspense fallback={<div className="h-40 rounded-xl bg-white shadow-sm" />}>
        <MeetingsPanel
          orgSlug={orgSlug}
          eventId={eventId}
          activeTab={activeTab}
          canManage={hasPermission(ctx.grants, "event.update")}
          aiInsightsEnabled={settings?.aiInsightsEnabled === true}
          rooms={rooms.map((row) => ({
            id: row.id,
            name: row.name,
            capacity: row.capacity,
          }))}
          attendees={attendees.map((a) => ({
            id: a.id,
            label: [displayName(a), a.company].filter(Boolean).join(" · "),
          }))}
          meetings={meetingRows}
          conflicts={conflicts}
          suggestions={suggestions}
          heatmap={heatmap}
          roomBoard={roomBoard}
          moderationQueue={moderationQueue}
          requestLimits={requestLimits}
          todaysMeetings={todaysMeetings}
          tabCounts={{
            unscheduled: unscheduledCount,
            conflicts: conflicts.length,
            suggestions: suggestions.length,
            moderation: pendingModeration,
            today: todaysMeetings.length,
          }}
        />
      </Suspense>
    </div>
  );
}
