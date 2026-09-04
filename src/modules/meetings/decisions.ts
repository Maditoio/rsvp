import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { validateMeetingSlot } from "@/modules/calendar/conflicts";
import { syncMeetingCalendarsWithWarning } from "@/modules/calendar/sync";
import {
  type ActionResult,
  actionFail,
  actionOk,
  publicActionError,
} from "@/lib/action-result";
import { createNotification } from "@/modules/notifications/service";
import { recomputeMatchScoresForAttendee } from "@/modules/matchmaking/score";
import { displayName } from "@/lib/utils";
import { loadMeetingRequestByToken } from "@/modules/meetings/respond-token";
import { AutoScheduleError, pickFirstAvailableSlot } from "@/modules/meetings/scheduler";

export type MeetingActionResult = ActionResult<{ calendarWarning?: string }>;

async function refreshMatchScoresForPair(
  eventId: string,
  requesterId: string,
  targetId: string,
) {
  await Promise.all([
    recomputeMatchScoresForAttendee(eventId, requesterId),
    recomputeMatchScoresForAttendee(eventId, targetId),
  ]);
}

function safeRevalidateMeetingPaths(eventId: string) {
  try {
    revalidatePath(`/me/events/${eventId}/meetings`);
    revalidatePath(`/me/events/${eventId}/directory`);
  } catch (error) {
    // Email-link responses run during page render, where revalidatePath can throw.
    console.error("revalidatePath after meeting decision failed", error);
  }
}

async function scheduleMeetingCalendars(meetingId: string): Promise<string | undefined> {
  try {
    return await syncMeetingCalendarsWithWarning(meetingId);
  } catch {
    return "Meeting was scheduled, but Google Calendar could not be updated. Try reconnecting calendars.";
  }
}

export async function applyMeetingRequestDecision(input: {
  requestId: string;
  eventId: string;
  organisationId: string;
  decision: "accept" | "decline";
  roomId?: string | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
  autoSchedule?: boolean;
}): Promise<MeetingActionResult> {
  const request = await prisma.meetingRequest.findFirst({
    where: {
      id: input.requestId,
      eventId: input.eventId,
      status: "PENDING",
    },
  });

  if (!request) {
    const existing = await prisma.meetingRequest.findFirst({
      where: {
        id: input.requestId,
        eventId: input.eventId,
      },
      select: { status: true },
    });
    // Idempotent: a second accept/decline after success should not look like a failure.
    if (existing?.status === "ACCEPTED" && input.decision === "accept") {
      return actionOk({});
    }
    if (existing?.status === "DECLINED" && input.decision === "decline") {
      return actionOk({});
    }
    if (existing?.status === "ACCEPTED") {
      return actionFail(
        "This request was already accepted. Open Meetings to view or reschedule it.",
      );
    }
    return actionFail("Meeting request not found or no longer pending.");
  }

  if (input.decision === "decline") {
    await prisma.meetingRequest.update({
      where: { id: request.id },
      data: { status: "DECLINED", responseTokenHash: null },
    });
    try {
      await refreshMatchScoresForPair(
        input.eventId,
        request.requesterId,
        request.targetId,
      );
    } catch (error) {
      console.error("refreshMatchScoresForPair after decline failed", error);
    }
    safeRevalidateMeetingPaths(input.eventId);
    return actionOk({});
  }

  const roomId = input.roomId ?? null;
  const startsAt = input.startsAt ?? null;
  const endsAt = input.endsAt ?? null;
  const participantIds = [request.requesterId, request.targetId];
  const shouldAutoSchedule = input.autoSchedule ?? (!startsAt && !endsAt);

  let autoSlot: Awaited<ReturnType<typeof pickFirstAvailableSlot>> | null = null;
  if (shouldAutoSchedule) {
    try {
      autoSlot = await pickFirstAvailableSlot(
        input.eventId,
        request.requesterId,
        request.targetId,
      );
    } catch (error) {
      if (error instanceof AutoScheduleError) {
        return actionFail(error.message);
      }
      return actionFail("Could not auto-schedule this meeting.");
    }
  } else if (startsAt && endsAt) {
    try {
      await validateMeetingSlot(input.eventId, participantIds, startsAt, endsAt, { roomId });
    } catch (error) {
      return actionFail(publicActionError(error, "Could not schedule this meeting."));
    }
  }

  const resolvedStartsAt = autoSlot?.startsAt ?? startsAt;
  const resolvedEndsAt = autoSlot?.endsAt ?? endsAt;
  const resolvedRoomId = autoSlot?.roomId ?? roomId;

  const meeting = await prisma.$transaction(async (tx) => {
    await tx.meetingRequest.update({
      where: { id: request.id },
      data: { status: "ACCEPTED", responseTokenHash: null },
    });
    const m = await tx.meeting.create({
      data: {
        organisationId: input.organisationId,
        eventId: input.eventId,
        roomId: resolvedRoomId,
        startsAt: resolvedStartsAt,
        endsAt: resolvedEndsAt,
        status: "SCHEDULED",
      },
    });
    await tx.meetingParticipant.createMany({
      data: [
        {
          organisationId: input.organisationId,
          eventId: input.eventId,
          meetingId: m.id,
          attendeeId: request.requesterId,
        },
        {
          organisationId: input.organisationId,
          eventId: input.eventId,
          meetingId: m.id,
          attendeeId: request.targetId,
        },
      ],
    });
    return m;
  });

  let calendarWarning: string | undefined;
  if (resolvedStartsAt && resolvedEndsAt) {
    calendarWarning = await scheduleMeetingCalendars(meeting.id);
  }

  // Meeting is already committed — never fail the accept because of side effects.
  try {
    await refreshMatchScoresForPair(
      input.eventId,
      request.requesterId,
      request.targetId,
    );
  } catch (error) {
    console.error("refreshMatchScoresForPair after accept failed", error);
  }

  safeRevalidateMeetingPaths(input.eventId);
  return actionOk({ calendarWarning });
}

/**
 * Public email-link accept/decline. Safe to call from a Server Component page
 * (not a Server Action) so post-commit cache revalidation cannot break the UX.
 */
export async function respondToMeetingByToken(
  rawToken: string,
  decision: "accept" | "decline",
): Promise<MeetingActionResult & { eventId?: string }> {
  const request = await loadMeetingRequestByToken(rawToken);
  if (!request) {
    return actionFail("This response link is not valid or has already been used.");
  }

  const eventId = request.eventId;
  const requestId = request.id;

  if (request.status !== "PENDING") {
    if (
      (request.status === "ACCEPTED" && decision === "accept") ||
      (request.status === "DECLINED" && decision === "decline")
    ) {
      return { ...actionOk({}), eventId };
    }
    return {
      ...actionFail("This connection request has already been answered."),
      eventId,
    };
  }

  try {
    const result = await applyMeetingRequestDecision({
      requestId,
      eventId,
      organisationId: request.organisationId,
      decision,
      autoSchedule: decision === "accept",
    });

    if (result.ok && decision === "accept" && request.requester.userId) {
      try {
        await createNotification({
          organisationId: request.organisationId,
          eventId,
          userId: request.requester.userId,
          title: "Connection accepted",
          body: `${displayName(request.target)} accepted your connection request. A meeting has been created — open Meetings to view or reschedule it.`,
        });
      } catch (error) {
        console.error("connection accepted notification failed", error);
      }
    }

    return { ...result, eventId };
  } catch (error) {
    const settled = await prisma.meetingRequest.findFirst({
      where: { id: requestId },
      select: { status: true },
    });
    if (
      (decision === "accept" && settled?.status === "ACCEPTED") ||
      (decision === "decline" && settled?.status === "DECLINED")
    ) {
      console.error("respondToMeetingByToken failed after decision committed", error);
      return { ...actionOk({}), eventId };
    }
    return {
      ...actionFail(
        publicActionError(error, "Could not respond to connection request."),
      ),
      eventId,
    };
  }
}
