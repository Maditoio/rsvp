import { prisma } from "@/lib/db/prisma";
import {
  getValidGoogleAccessToken,
  type CalendarConnectionRecord,
} from "./google";

/**
 * Microsoft Graph integration patterns (future implementation):
 * - Auth: https://login.microsoftonline.com/{tenant}/oauth2/v2/authorize
 * - Token: https://login.microsoftonline.com/{tenant}/oauth2/v2/token
 * - Create event: POST https://graph.microsoft.com/v1.0/me/events
 * - Update event: PATCH https://graph.microsoft.com/v1.0/me/events/{id}
 * - Delete event: DELETE https://graph.microsoft.com/v1.0/me/events/{id}
 * - Scopes: Calendars.ReadWrite
 */

const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";

export type { CalendarConnectionRecord };

interface MeetingInfo {
  id: string;
  eventId: string;
  organisationId: string;
  startsAt: Date;
  endsAt: Date;
  location?: string | null;
}

interface AttendeeInfo {
  email: string;
  firstName: string;
  lastName: string;
}

export type CalendarSyncResult = {
  synced: number;
  skipped: number;
  warnings: string[];
};

function formatSyncWarnings(warnings: string[]): string | undefined {
  if (warnings.length === 0) return undefined;
  return warnings.join(" ");
}

export async function createCalendarEvent(
  meeting: MeetingInfo,
  attendees: AttendeeInfo[],
  connection: CalendarConnectionRecord,
  eventName: string,
  roomName?: string | null,
): Promise<{ externalId: string } | { error: string }> {
  if (connection.provider !== "google") {
    return { error: "Only Google Calendar sync is supported." };
  }

  const existing = await prisma.calendarEvent.findFirst({
    where: { meetingId: meeting.id, connectionId: connection.id },
    select: { id: true, externalId: true },
  });

  try {
    const accessToken = await getValidGoogleAccessToken(connection);
    const otherNames = attendees.map((a) => `${a.firstName} ${a.lastName}`).join(", ");

    const body = {
      summary: `${eventName} — Meeting with ${otherNames}`,
      location: roomName || meeting.location || undefined,
      start: { dateTime: meeting.startsAt.toISOString() },
      end: { dateTime: meeting.endsAt.toISOString() },
      attendees: attendees.map((a) => ({ email: a.email })),
    };

    if (existing?.externalId) {
      const res = await fetch(
        `${GOOGLE_CALENDAR_API}/calendars/primary/events/${existing.externalId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) {
        const text = await res.text();
        return {
          error: `Could not update Google Calendar event (${res.status}). ${text.slice(0, 120)}`,
        };
      }
      return { externalId: existing.externalId };
    }

    const res = await fetch(`${GOOGLE_CALENDAR_API}/calendars/primary/events`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      return {
        error: `Could not create Google Calendar event (${res.status}). ${text.slice(0, 120)}`,
      };
    }

    const data = await res.json();
    const externalId = data.id as string;

    if (existing) {
      await prisma.calendarEvent.update({
        where: { id: existing.id },
        data: { externalId },
      });
    } else {
      await prisma.calendarEvent.create({
        data: {
          organisationId: meeting.organisationId,
          eventId: meeting.eventId,
          meetingId: meeting.id,
          connectionId: connection.id,
          externalId,
        },
      });
    }

    return { externalId };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Google Calendar sync failed";
    return { error: message };
  }
}

export async function updateCalendarEvent(
  externalId: string,
  meeting: MeetingInfo,
  connection: CalendarConnectionRecord,
  roomName?: string | null,
): Promise<boolean> {
  if (connection.provider !== "google") return false;

  try {
    const accessToken = await getValidGoogleAccessToken(connection);

    const body = {
      start: { dateTime: meeting.startsAt.toISOString() },
      end: { dateTime: meeting.endsAt.toISOString() },
      location: roomName || meeting.location || undefined,
    };

    const res = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/primary/events/${externalId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteCalendarEvent(
  externalId: string,
  connection: CalendarConnectionRecord,
): Promise<boolean> {
  if (connection.provider !== "google") return false;

  try {
    const accessToken = await getValidGoogleAccessToken(connection);

    const res = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/primary/events/${externalId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    return res.ok || res.status === 404 || res.status === 410;
  } catch {
    return false;
  }
}

export async function syncCalendarForMeeting(
  meetingId: string,
): Promise<CalendarSyncResult> {
  const warnings: string[] = [];
  let synced = 0;
  let skipped = 0;

  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: {
      participants: {
        include: {
          attendee: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
              userId: true,
            },
          },
        },
      },
      room: { select: { name: true } },
      event: { select: { name: true } },
    },
  });

  if (!meeting || !meeting.startsAt || !meeting.endsAt) {
    return {
      synced: 0,
      skipped: 0,
      warnings: ["Meeting has no scheduled time, so calendars were not updated."],
    };
  }

  const participants = meeting.participants.map((p) => p.attendee);
  const linked = participants.filter((a) => a.userId);
  const unlinked = participants.filter((a) => !a.userId);

  for (const attendee of unlinked) {
    skipped += 1;
    warnings.push(
      `${attendee.firstName} ${attendee.lastName} is not linked to a signed-in account, so their calendar could not be updated.`,
    );
  }

  const userIds = linked
    .map((a) => a.userId)
    .filter((id): id is string => id !== null);

  if (userIds.length === 0) {
    return { synced, skipped, warnings };
  }

  const connections = await prisma.calendarConnection.findMany({
    where: { userId: { in: userIds }, provider: "google" },
    include: { user: { select: { firstName: true, lastName: true, email: true } } },
  });

  const connByUserId = new Map(connections.map((c) => [c.userId, c]));

  for (const attendee of linked) {
    if (!attendee.userId) continue;
    if (!connByUserId.has(attendee.userId)) {
      skipped += 1;
      warnings.push(
        `${attendee.firstName} ${attendee.lastName} has not connected Google Calendar.`,
      );
    }
  }

  const meetingInfo: MeetingInfo = {
    id: meeting.id,
    eventId: meeting.eventId,
    organisationId: meeting.organisationId,
    startsAt: meeting.startsAt,
    endsAt: meeting.endsAt,
  };

  const attendeeInfos: AttendeeInfo[] = participants.map((a) => ({
    email: a.email,
    firstName: a.firstName,
    lastName: a.lastName,
  }));

  for (const conn of connections) {
    const result = await createCalendarEvent(
      meetingInfo,
      attendeeInfos,
      conn,
      meeting.event.name,
      meeting.room?.name,
    );
    if ("error" in result) {
      skipped += 1;
      const name =
        [conn.user.firstName, conn.user.lastName].filter(Boolean).join(" ") ||
        conn.user.email;
      warnings.push(`${name}: ${result.error}`);
    } else {
      synced += 1;
    }
  }

  return { synced, skipped, warnings };
}

export function calendarSyncWarningMessage(result: CalendarSyncResult): string | undefined {
  return formatSyncWarnings(result.warnings);
}

export async function syncMeetingCalendarsWithWarning(
  meetingId: string,
): Promise<string | undefined> {
  const result = await syncCalendarForMeeting(meetingId);
  return calendarSyncWarningMessage(result);
}
