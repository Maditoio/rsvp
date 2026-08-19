import { prisma } from "@/lib/db/prisma";
import { refreshGoogleToken } from "./google";

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

interface CalendarConnectionRecord {
  id: string;
  accessTokenEnc: string;
  refreshTokenEnc: string | null;
  expiresAt: Date | null;
  provider: string;
}

async function getValidAccessToken(connection: CalendarConnectionRecord): Promise<string> {
  if (connection.expiresAt && connection.expiresAt > new Date(Date.now() + 60_000)) {
    return connection.accessTokenEnc;
  }
  if (!connection.refreshTokenEnc) {
    throw new Error("No refresh token available and access token expired");
  }
  const refreshed = await refreshGoogleToken(connection.refreshTokenEnc);
  await prisma.calendarConnection.update({
    where: { id: connection.id },
    data: {
      accessTokenEnc: refreshed.accessToken,
      expiresAt: refreshed.expiresAt,
    },
  });
  return refreshed.accessToken;
}

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

export async function createCalendarEvent(
  meeting: MeetingInfo,
  attendees: AttendeeInfo[],
  connection: CalendarConnectionRecord,
  eventName: string,
  roomName?: string | null,
): Promise<string | null> {
  if (connection.provider !== "google") return null;

  const accessToken = await getValidAccessToken(connection);
  const otherNames = attendees.map((a) => `${a.firstName} ${a.lastName}`).join(", ");

  const body = {
    summary: `${eventName} — Meeting with ${otherNames}`,
    location: roomName || meeting.location || undefined,
    start: { dateTime: meeting.startsAt.toISOString() },
    end: { dateTime: meeting.endsAt.toISOString() },
    attendees: attendees.map((a) => ({ email: a.email })),
  };

  const res = await fetch(`${GOOGLE_CALENDAR_API}/calendars/primary/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) return null;

  const data = await res.json();
  const externalId = data.id as string;

  await prisma.calendarEvent.create({
    data: {
      organisationId: meeting.organisationId,
      eventId: meeting.eventId,
      meetingId: meeting.id,
      connectionId: connection.id,
      externalId,
    },
  });

  return externalId;
}

export async function updateCalendarEvent(
  externalId: string,
  meeting: MeetingInfo,
  connection: CalendarConnectionRecord,
  roomName?: string | null,
): Promise<boolean> {
  if (connection.provider !== "google") return false;

  const accessToken = await getValidAccessToken(connection);

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
}

export async function deleteCalendarEvent(
  externalId: string,
  connection: CalendarConnectionRecord,
): Promise<boolean> {
  if (connection.provider !== "google") return false;

  const accessToken = await getValidAccessToken(connection);

  const res = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/primary/events/${externalId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  return res.ok || res.status === 404 || res.status === 410;
}

export async function syncCalendarForMeeting(meetingId: string) {
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: {
      participants: {
        include: {
          attendee: { select: { email: true, firstName: true, lastName: true, userId: true } },
        },
      },
      room: { select: { name: true } },
      event: { select: { name: true } },
    },
  });

  if (!meeting || !meeting.startsAt || !meeting.endsAt) return;

  const userIds = meeting.participants
    .map((p) => p.attendee.userId)
    .filter((id): id is string => id !== null);

  if (userIds.length === 0) return;

  const connections = await prisma.calendarConnection.findMany({
    where: { userId: { in: userIds } },
  });

  const meetingInfo: MeetingInfo = {
    id: meeting.id,
    eventId: meeting.eventId,
    organisationId: meeting.organisationId,
    startsAt: meeting.startsAt,
    endsAt: meeting.endsAt,
  };

  const attendeeInfos: AttendeeInfo[] = meeting.participants.map((p) => ({
    email: p.attendee.email,
    firstName: p.attendee.firstName,
    lastName: p.attendee.lastName,
  }));

  for (const conn of connections) {
    try {
      await createCalendarEvent(
        meetingInfo,
        attendeeInfos,
        conn,
        meeting.event.name,
        meeting.room?.name,
      );
    } catch {
      // Calendar sync failures must not block the platform (spec §105-106)
    }
  }
}
