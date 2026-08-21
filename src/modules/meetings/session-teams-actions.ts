"use server";

import { revalidatePath } from "next/cache";
import { OnlineMeetingProvider, SessionFormat } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { writeAudit } from "@/modules/audit/log";
import { getAppUrl } from "@/lib/utils";
import { getMicrosoftAuthUrl } from "@/modules/calendar/microsoft";
import {
  createTeamsMeeting,
  deleteTeamsMeeting,
  updateTeamsMeeting,
} from "@/modules/meetings/microsoft-teams";
import { isActiveOnlineMeetingProvider } from "@/modules/meetings/providers";

function toGraphIso(date: Date) {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

async function loadMicrosoftConnection(userId: string) {
  return prisma.calendarConnection.findFirst({
    where: {
      userId,
      provider: { in: ["microsoft", "outlook"] },
    },
  });
}

function connectionRecord(
  row: NonNullable<Awaited<ReturnType<typeof loadMicrosoftConnection>>>,
) {
  return {
    id: row.id,
    accessTokenEnc: row.accessTokenEnc,
    refreshTokenEnc: row.refreshTokenEnc,
    expiresAt: row.expiresAt,
    provider: row.provider,
  };
}

function hasOnlineMeetingsScope(scopes: string | null | undefined) {
  if (!scopes) return false;
  return /OnlineMeetings\.ReadWrite/i.test(scopes);
}

/** Build Microsoft OAuth URL that returns to the event agenda after connect. */
export async function getTeamsMicrosoftConnectUrl(
  orgSlug: string,
  eventId: string,
  sessionId: string,
) {
  const ctx = await requireEvent(orgSlug, eventId, "event.update");
  const session = await prisma.session.findFirst({
    where: {
      id: sessionId,
      eventId,
      organisationId: ctx.organisation.id,
    },
    select: { id: true },
  });
  if (!session) throw new Error("Session not found");

  const state = `teams:${orgSlug}:${eventId}:${sessionId}`;
  return getMicrosoftAuthUrl(getAppUrl(), state);
}

export async function createSessionTeamsMeeting(
  orgSlug: string,
  eventId: string,
  sessionId: string,
) {
  const ctx = await requireEvent(orgSlug, eventId, "event.update");
  const session = await prisma.session.findFirst({
    where: {
      id: sessionId,
      eventId,
      organisationId: ctx.organisation.id,
    },
    include: {
      onlineMeetings: { where: { provider: OnlineMeetingProvider.TEAMS } },
    },
  });
  if (!session) throw new Error("Session not found");
  if (session.format === SessionFormat.PHYSICAL) {
    throw new Error(
      "Switch the session to Online or Hybrid before creating a Teams meeting.",
    );
  }
  if (!session.startsAt || !session.endsAt) {
    throw new Error(
      "Set the session start and end times before creating a Teams meeting.",
    );
  }
  if (session.endsAt <= session.startsAt) {
    throw new Error("Session end time must be after the start time.");
  }

  const existing = session.onlineMeetings[0];
  if (existing?.providerMeetingId && existing.joinUrl) {
    throw new Error(
      "This session already has a Teams meeting. Remove it before creating another.",
    );
  }

  const connection = await loadMicrosoftConnection(ctx.user.id);
  if (!connection?.refreshTokenEnc && !connection?.accessTokenEnc) {
    throw new Error(
      "Microsoft needs to be connected before you can create a Teams meeting.",
    );
  }
  if (!hasOnlineMeetingsScope(connection.scopes)) {
    throw new Error(
      "Microsoft needs to be reconnected before you can create a Teams meeting. Reconnect and grant online meeting access.",
    );
  }

  const created = await createTeamsMeeting(connectionRecord(connection), {
    subject: session.title,
    startIso: toGraphIso(session.startsAt),
    endIso: toGraphIso(session.endsAt),
  });

  const meeting = await prisma.onlineMeeting.upsert({
    where: {
      sessionId_provider: {
        sessionId: session.id,
        provider: OnlineMeetingProvider.TEAMS,
      },
    },
    create: {
      organisationId: ctx.organisation.id,
      eventId,
      sessionId: session.id,
      provider: OnlineMeetingProvider.TEAMS,
      providerMeetingId: created.providerMeetingId,
      joinUrl: created.joinUrl,
      metadata: created.raw as object,
      createdByUserId: ctx.user.id,
    },
    update: {
      providerMeetingId: created.providerMeetingId,
      joinUrl: created.joinUrl,
      metadata: created.raw as object,
      createdByUserId: ctx.user.id,
    },
  });

  await writeAudit({
    organisationId: ctx.organisation.id,
    eventId,
    userId: ctx.user.id,
    action: "session.teams.create",
    resource: "online_meeting",
    resourceId: meeting.id,
  });

  revalidatePath(`/app/${orgSlug}/events/${eventId}/agenda`);
  revalidatePath(`/me/events/${eventId}/agenda`);
  return {
    id: meeting.id,
    joinUrl: meeting.joinUrl,
    providerMeetingId: meeting.providerMeetingId,
  };
}

export async function removeSessionTeamsMeeting(
  orgSlug: string,
  eventId: string,
  sessionId: string,
) {
  const ctx = await requireEvent(orgSlug, eventId, "event.update");
  const meeting = await prisma.onlineMeeting.findFirst({
    where: {
      sessionId,
      eventId,
      organisationId: ctx.organisation.id,
      provider: OnlineMeetingProvider.TEAMS,
    },
  });
  if (!meeting) throw new Error("No Teams meeting is linked to this session.");

  if (meeting.providerMeetingId) {
    const connection = await loadMicrosoftConnection(ctx.user.id);
    if (connection) {
      try {
        await deleteTeamsMeeting(
          connectionRecord(connection),
          meeting.providerMeetingId,
        );
      } catch (error) {
        console.error(
          "[teams] delete failed",
          error instanceof Error ? error.message : error,
        );
      }
    }
  }

  await prisma.onlineMeeting.delete({ where: { id: meeting.id } });

  await writeAudit({
    organisationId: ctx.organisation.id,
    eventId,
    userId: ctx.user.id,
    action: "session.teams.remove",
    resource: "online_meeting",
    resourceId: meeting.id,
  });

  revalidatePath(`/app/${orgSlug}/events/${eventId}/agenda`);
  revalidatePath(`/me/events/${eventId}/agenda`);
}

export async function syncSessionTeamsMeetingIfNeeded(input: {
  organisationId: string;
  eventId: string;
  sessionId: string;
  userId: string;
  title: string;
  startsAt: Date | null;
  endsAt: Date | null;
}) {
  const meeting = await prisma.onlineMeeting.findFirst({
    where: {
      sessionId: input.sessionId,
      organisationId: input.organisationId,
      eventId: input.eventId,
      provider: OnlineMeetingProvider.TEAMS,
    },
  });
  if (!meeting?.providerMeetingId) return;
  if (!input.startsAt || !input.endsAt) return;

  const connection = await loadMicrosoftConnection(input.userId);
  if (!connection) {
    throw new Error(
      "Session times were saved, but the Teams meeting could not be updated because Microsoft is not connected. Reconnect Microsoft or remove the Teams meeting.",
    );
  }

  try {
    const updated = await updateTeamsMeeting(
      connectionRecord(connection),
      meeting.providerMeetingId,
      {
        subject: input.title,
        startIso: toGraphIso(input.startsAt),
        endIso: toGraphIso(input.endsAt),
      },
    );
    await prisma.onlineMeeting.update({
      where: { id: meeting.id },
      data: {
        joinUrl: updated.joinUrl,
        metadata: updated.raw as object,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Could not update the Teams meeting in Microsoft.";
    throw new Error(
      `Session saved, but Teams meeting update failed: ${message}`,
    );
  }
}

export async function assertProviderSelectable(provider: string) {
  if (!isActiveOnlineMeetingProvider(provider)) {
    throw new Error("That online platform is not available yet.");
  }
  return provider as "TEAMS";
}

export async function microsoftConnectedForUser(userId: string) {
  const connection = await loadMicrosoftConnection(userId);
  if (!connection) {
    return { connected: false, needsReconnect: false };
  }
  return {
    connected: true,
    needsReconnect: !hasOnlineMeetingsScope(connection.scopes),
  };
}
