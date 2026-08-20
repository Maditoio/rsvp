import { prisma } from "@/lib/db/prisma";
import {
  getValidGoogleAccessToken,
  type CalendarConnectionRecord,
} from "./google";
import {
  getValidMicrosoftAccessToken,
  createMicrosoftCalendarEvent,
  updateMicrosoftCalendarEvent,
  deleteMicrosoftCalendarEvent,
} from "./microsoft";

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
  const existing = await prisma.calendarEvent.findFirst({
    where: { meetingId: meeting.id, connectionId: connection.id },
    select: { id: true, externalId: true },
  });

  const otherNames = attendees.map((a) => `${a.firstName} ${a.lastName}`).join(", ");
  const subject = `${eventName} — Meeting with ${otherNames}`;
  const location = roomName || meeting.location || undefined;

  try {
    if (connection.provider === "microsoft") {
      const accessToken = await getValidMicrosoftAccessToken(connection);

      if (existing?.externalId) {
        const ok = await updateMicrosoftCalendarEvent(accessToken, existing.externalId, {
          subject,
          location,
          startDateTime: meeting.startsAt.toISOString(),
          endDateTime: meeting.endsAt.toISOString(),
        });
        if (!ok) return { error: "Could not update Outlook calendar event." };
        return { externalId: existing.externalId };
      }

      const result = await createMicrosoftCalendarEvent(accessToken, {
        subject,
        location,
        startDateTime: meeting.startsAt.toISOString(),
        endDateTime: meeting.endsAt.toISOString(),
        attendees: attendees.map((a) => ({ email: a.email })),
      });

      if ("error" in result) return result;

      if (existing) {
        await prisma.calendarEvent.update({
          where: { id: existing.id },
          data: { externalId: result.id },
        });
      } else {
        await prisma.calendarEvent.create({
          data: {
            organisationId: meeting.organisationId,
            eventId: meeting.eventId,
            meetingId: meeting.id,
            connectionId: connection.id,
            externalId: result.id,
          },
        });
      }
      return { externalId: result.id };
    }

    if (connection.provider !== "google") {
      return { error: `Unsupported calendar provider: ${connection.provider}` };
    }

    const accessToken = await getValidGoogleAccessToken(connection);

    const body = {
      summary: subject,
      location,
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
      error instanceof Error ? error.message : "Calendar sync failed";
    return { error: message };
  }
}

export async function updateCalendarEvent(
  externalId: string,
  meeting: MeetingInfo,
  connection: CalendarConnectionRecord,
  roomName?: string | null,
): Promise<boolean> {
  try {
    if (connection.provider === "microsoft") {
      const accessToken = await getValidMicrosoftAccessToken(connection);
      return updateMicrosoftCalendarEvent(accessToken, externalId, {
        location: roomName || meeting.location || undefined,
        startDateTime: meeting.startsAt.toISOString(),
        endDateTime: meeting.endsAt.toISOString(),
      });
    }

    if (connection.provider !== "google") return false;

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
  try {
    if (connection.provider === "microsoft") {
      const accessToken = await getValidMicrosoftAccessToken(connection);
      return deleteMicrosoftCalendarEvent(accessToken, externalId);
    }

    if (connection.provider !== "google") return false;

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
    where: { userId: { in: userIds }, provider: { in: ["google", "microsoft"] } },
    include: { user: { select: { firstName: true, lastName: true, email: true } } },
  });

  const connsByUserId = new Map<string, typeof connections>();
  for (const c of connections) {
    const existing = connsByUserId.get(c.userId) ?? [];
    existing.push(c);
    connsByUserId.set(c.userId, existing);
  }

  for (const attendee of linked) {
    if (!attendee.userId) continue;
    if (!connsByUserId.has(attendee.userId)) {
      skipped += 1;
      warnings.push(
        `${attendee.firstName} ${attendee.lastName} has not connected a calendar.`,
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

/** Delete provider calendar events for a meeting and remove local sync rows. */
export async function removeMeetingCalendars(
  meetingId: string,
): Promise<CalendarSyncResult> {
  const warnings: string[] = [];
  let synced = 0;
  let skipped = 0;

  const rows = await prisma.calendarEvent.findMany({
    where: { meetingId },
    include: {
      connection: {
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
      },
    },
  });

  if (rows.length === 0) {
    return { synced: 0, skipped: 0, warnings: [] };
  }

  const removedIds: string[] = [];

  for (const row of rows) {
    if (!row.externalId) {
      removedIds.push(row.id);
      synced += 1;
      continue;
    }

    const ok = await deleteCalendarEvent(row.externalId, row.connection);
    if (ok) {
      removedIds.push(row.id);
      synced += 1;
    } else {
      skipped += 1;
      const name =
        [row.connection.user.firstName, row.connection.user.lastName]
          .filter(Boolean)
          .join(" ") || row.connection.user.email;
      const provider =
        row.connection.provider === "microsoft" ? "Outlook" : "Google";
      warnings.push(
        `${name}: could not remove the ${provider} Calendar event. Try reconnecting calendars.`,
      );
    }
  }

  if (removedIds.length > 0) {
    await prisma.calendarEvent.deleteMany({
      where: { id: { in: removedIds } },
    });
  }

  return { synced, skipped, warnings };
}

export async function removeMeetingCalendarsWithWarning(
  meetingId: string,
): Promise<string | undefined> {
  try {
    const result = await removeMeetingCalendars(meetingId);
    return calendarSyncWarningMessage(result);
  } catch {
    return "Meeting was cancelled, but calendar events could not be removed. Try reconnecting calendars.";
  }
}
