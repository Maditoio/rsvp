"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireEvent, requireUser } from "@/lib/authz/require";
import { writeAudit } from "@/modules/audit/log";
import { AuthzError } from "@/lib/db/tenant";
import { rateLimit } from "@/lib/rate-limit";
import { validateMeetingSlot } from "@/modules/calendar/conflicts";
import {
  removeMeetingCalendarsWithWarning,
  syncMeetingCalendarsWithWarning,
} from "@/modules/calendar/sync";
import { autoScheduleMeeting, AutoScheduleError, pickFirstAvailableSlot } from "@/modules/meetings/scheduler";

export type MeetingActionResult = {
  calendarWarning?: string;
};

async function myAttendee(eventId: string) {
  const user = await requireUser();
  const attendee = await prisma.attendee.findFirst({
    where: { eventId, userId: user.id },
  });
  if (!attendee) throw new AuthzError("You are not registered for this event", 403);
  return attendee;
}

async function meetingParticipantIds(meetingId: string): Promise<string[]> {
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: { participants: { select: { attendeeId: true } } },
  });
  if (!meeting) throw new Error("Meeting not found");
  return meeting.participants.map((p) => p.attendeeId);
}

async function scheduleMeetingCalendars(meetingId: string): Promise<string | undefined> {
  try {
    return await syncMeetingCalendarsWithWarning(meetingId);
  } catch {
    return "Meeting was scheduled, but Google Calendar could not be updated. Try reconnecting calendars.";
  }
}

export async function requestMeeting(eventId: string, formData: FormData) {
  const requester = await myAttendee(eventId);
  const targetId = z.string().min(1).parse(String(formData.get("targetId") ?? ""));
  const message = z.string().max(500).optional().or(z.literal("")).parse(
    String(formData.get("message") ?? ""),
  );
  if (targetId === requester.id) throw new Error("You cannot request a meeting with yourself.");

  const limited = await rateLimit(`meeting-req:${requester.id}`, 10, 60);
  if (!limited.success) throw new Error("Too many requests. Please wait before trying again.");

  const pendingCount = await prisma.meetingRequest.count({
    where: { eventId, requesterId: requester.id, status: "PENDING" },
  });
  if (pendingCount >= 20) {
    throw new Error(
      "You have too many pending meeting requests. Wait for responses before sending more.",
    );
  }

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const dailyCount = await prisma.meetingRequest.count({
    where: { eventId, requesterId: requester.id, createdAt: { gte: oneDayAgo } },
  });
  if (dailyCount >= 50) {
    throw new Error("Daily meeting request limit reached. Try again tomorrow.");
  }

  const target = await prisma.attendee.findFirst({
    where: { id: targetId, eventId, organisationId: requester.organisationId },
    include: { privacy: true },
  });
  if (!target) throw new Error("Attendee not found");
  if (target.privacy && !target.privacy.profileVisible) {
    throw new Error("This attendee is not visible for meetings.");
  }

  const existing = await prisma.meetingRequest.findFirst({
    where: {
      eventId,
      requesterId: requester.id,
      targetId,
      status: "PENDING",
    },
  });
  if (existing) throw new Error("A meeting request is already pending.");

  await prisma.meetingRequest.create({
    data: {
      organisationId: requester.organisationId,
      eventId,
      requesterId: requester.id,
      targetId,
      message: message || null,
    },
  });
  revalidatePath(`/me/events/${eventId}/meetings`);
  revalidatePath(`/me/events/${eventId}/directory`);
}

export async function respondToMeeting(
  eventId: string,
  formData: FormData,
): Promise<MeetingActionResult> {
  const attendee = await myAttendee(eventId);
  const requestId = z.string().min(1).parse(String(formData.get("requestId") ?? ""));
  const decision = z.enum(["accept", "decline"]).parse(String(formData.get("decision") ?? ""));

  const request = await prisma.meetingRequest.findFirst({
    where: {
      id: requestId,
      eventId,
      targetId: attendee.id,
      status: "PENDING",
    },
  });

  if (!request) {
    const alreadyAccepted = await prisma.meetingRequest.findFirst({
      where: {
        id: requestId,
        eventId,
        targetId: attendee.id,
        status: "ACCEPTED",
      },
    });
    if (alreadyAccepted) {
      throw new Error(
        "This request was already accepted. Check the Meetings section below — ask the organiser to assign a time if none is set.",
      );
    }
    throw new Error("Meeting request not found or no longer pending.");
  }

  if (decision === "decline") {
    await prisma.meetingRequest.update({
      where: { id: request.id },
      data: { status: "DECLINED" },
    });
    revalidatePath(`/me/events/${eventId}/meetings`);
    return {};
  }

  const roomId = String(formData.get("roomId") ?? "").trim() || null;
  const startsAtRaw = String(formData.get("startsAt") ?? "").trim();
  const endsAtRaw = String(formData.get("endsAt") ?? "").trim();
  const startsAt = startsAtRaw ? new Date(startsAtRaw) : null;
  const endsAt = endsAtRaw ? new Date(endsAtRaw) : null;
  const participantIds = [request.requesterId, request.targetId];

  const shouldAutoSchedule =
    !startsAt && !endsAt && String(formData.get("autoSchedule") ?? "") === "on";

  let autoSlot: Awaited<ReturnType<typeof pickFirstAvailableSlot>> | null = null;
  if (shouldAutoSchedule) {
    try {
      autoSlot = await pickFirstAvailableSlot(
        eventId,
        request.requesterId,
        request.targetId,
      );
    } catch (error) {
      if (error instanceof AutoScheduleError) throw error;
      throw new Error("Could not auto-schedule this meeting.");
    }
  } else if (startsAt && endsAt) {
    await validateMeetingSlot(eventId, participantIds, startsAt, endsAt, { roomId });
  }

  const resolvedStartsAt = autoSlot?.startsAt ?? startsAt;
  const resolvedEndsAt = autoSlot?.endsAt ?? endsAt;
  const resolvedRoomId = autoSlot?.roomId ?? roomId;

  const meeting = await prisma.$transaction(async (tx) => {
    await tx.meetingRequest.update({
      where: { id: request.id },
      data: { status: "ACCEPTED" },
    });
    const m = await tx.meeting.create({
      data: {
        organisationId: attendee.organisationId,
        eventId,
        roomId: resolvedRoomId,
        startsAt: resolvedStartsAt,
        endsAt: resolvedEndsAt,
        status: "SCHEDULED",
      },
    });
    await tx.meetingParticipant.createMany({
      data: [
        {
          organisationId: attendee.organisationId,
          eventId,
          meetingId: m.id,
          attendeeId: request.requesterId,
        },
        {
          organisationId: attendee.organisationId,
          eventId,
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

  revalidatePath(`/me/events/${eventId}/meetings`);
  return { calendarWarning };
}

export async function assignMeetingSlot(
  orgSlug: string,
  eventId: string,
  formData: FormData,
): Promise<MeetingActionResult> {
  const ctx = await requireEvent(orgSlug, eventId, "event.update");
  const meetingId = z.string().min(1).parse(String(formData.get("meetingId") ?? ""));
  const roomId = String(formData.get("roomId") ?? "").trim() || null;
  const startsAtRaw = String(formData.get("startsAt") ?? "").trim();
  const endsAtRaw = String(formData.get("endsAt") ?? "").trim();
  const startsAt = startsAtRaw ? new Date(startsAtRaw) : null;
  const endsAt = endsAtRaw ? new Date(endsAtRaw) : null;

  const meeting = await prisma.meeting.findFirst({
    where: { id: meetingId, eventId, organisationId: ctx.organisation.id },
  });
  if (!meeting) throw new Error("Meeting not found");

  let calendarWarning: string | undefined;
  if (startsAt && endsAt) {
    const participantIds = await meetingParticipantIds(meetingId);
    await validateMeetingSlot(eventId, participantIds, startsAt, endsAt, {
      excludeMeetingId: meetingId,
      roomId,
    });
  }

  await prisma.meeting.update({
    where: { id: meetingId },
    data: { roomId, startsAt, endsAt },
  });

  if (startsAt && endsAt) {
    calendarWarning = await scheduleMeetingCalendars(meetingId);
  }

  await writeAudit({
    organisationId: ctx.organisation.id,
    eventId,
    userId: ctx.user.id,
    action: "meeting.assign_slot",
    resource: "meeting",
    resourceId: meetingId,
  });
  revalidatePath(`/app/${orgSlug}/events/${eventId}/meetings`);
  return { calendarWarning };
}

export async function saveMeetingRoom(orgSlug: string, eventId: string, formData: FormData) {
  const ctx = await requireEvent(orgSlug, eventId, "event.update");
  const name = z.string().min(1).max(80).parse(String(formData.get("name") ?? ""));
  const capacityRaw = String(formData.get("capacity") ?? "");
  const capacity = capacityRaw ? z.coerce.number().int().positive().parse(capacityRaw) : null;
  await prisma.meetingRoom.create({
    data: {
      organisationId: ctx.organisation.id,
      eventId,
      name,
      capacity,
    },
  });
  await writeAudit({
    organisationId: ctx.organisation.id,
    eventId,
    userId: ctx.user.id,
    action: "meeting.room.create",
    resource: "meeting_room",
  });
  revalidatePath(`/app/${orgSlug}/events/${eventId}/meetings`);
}

export async function autoScheduleSingle(
  orgSlug: string,
  eventId: string,
  formData: FormData,
): Promise<MeetingActionResult> {
  const ctx = await requireEvent(orgSlug, eventId, "event.update");
  const meetingId = z.string().min(1).parse(String(formData.get("meetingId") ?? ""));

  const meeting = await prisma.meeting.findFirst({
    where: { id: meetingId, eventId, organisationId: ctx.organisation.id },
  });
  if (!meeting) throw new Error("Meeting not found");

  try {
    await autoScheduleMeeting(eventId, meetingId);
  } catch (error) {
    if (error instanceof AutoScheduleError) throw error;
    throw new Error("Could not auto-schedule this meeting.");
  }

  const calendarWarning = await scheduleMeetingCalendars(meetingId);

  await writeAudit({
    organisationId: ctx.organisation.id,
    eventId,
    userId: ctx.user.id,
    action: "meeting.auto_schedule",
    resource: "meeting",
    resourceId: meetingId,
  });
  revalidatePath(`/app/${orgSlug}/events/${eventId}/meetings`);
  return { calendarWarning };
}

export async function autoScheduleAll(orgSlug: string, eventId: string) {
  const ctx = await requireEvent(orgSlug, eventId, "event.update");

  const unscheduled = await prisma.meeting.findMany({
    where: {
      eventId,
      organisationId: ctx.organisation.id,
      status: "SCHEDULED",
      startsAt: null,
    },
    select: { id: true },
  });

  let scheduled = 0;
  let failed = 0;
  const calendarWarnings: string[] = [];
  const errors: string[] = [];

  for (const m of unscheduled) {
    try {
      await autoScheduleMeeting(eventId, m.id);
      scheduled += 1;
      const warning = await scheduleMeetingCalendars(m.id);
      if (warning) calendarWarnings.push(warning);
    } catch (error) {
      failed += 1;
      if (error instanceof AutoScheduleError) {
        errors.push(error.message);
      }
    }
  }

  await writeAudit({
    organisationId: ctx.organisation.id,
    eventId,
    userId: ctx.user.id,
    action: "meeting.auto_schedule_all",
    resource: "meeting",
    metadata: { scheduled, failed, total: unscheduled.length },
  });
  revalidatePath(`/app/${orgSlug}/events/${eventId}/meetings`);
  return {
    scheduled,
    failed,
    total: unscheduled.length,
    calendarWarnings,
    error: errors[0],
  };
}

async function loadActiveMeeting(params: {
  meetingId: string;
  eventId: string;
  organisationId: string;
}) {
  const meeting = await prisma.meeting.findFirst({
    where: {
      id: params.meetingId,
      eventId: params.eventId,
      organisationId: params.organisationId,
    },
    include: { participants: { select: { attendeeId: true } } },
  });
  if (!meeting) throw new Error("Meeting not found");
  if (meeting.status === "CANCELLED") {
    throw new Error("This meeting is already cancelled.");
  }
  if (meeting.status === "COMPLETED" || meeting.status === "NO_SHOW") {
    throw new Error("This meeting can no longer be changed.");
  }
  return meeting;
}

async function applyCancelMeeting(params: {
  meetingId: string;
  eventId: string;
  organisationId: string;
  userId: string;
  actor: "organiser" | "attendee";
}): Promise<MeetingActionResult> {
  const meeting = await loadActiveMeeting({
    meetingId: params.meetingId,
    eventId: params.eventId,
    organisationId: params.organisationId,
  });

  await prisma.meeting.update({
    where: { id: meeting.id },
    data: { status: "CANCELLED" },
  });

  const calendarWarning = await removeMeetingCalendarsWithWarning(meeting.id);

  await writeAudit({
    organisationId: params.organisationId,
    eventId: params.eventId,
    userId: params.userId,
    action: "meeting.cancel",
    resource: "meeting",
    resourceId: meeting.id,
    metadata: { actor: params.actor },
  });

  return { calendarWarning };
}

async function applyRescheduleMeeting(params: {
  meetingId: string;
  eventId: string;
  organisationId: string;
  userId: string;
  actor: "organiser" | "attendee";
  startsAt: Date;
  endsAt: Date;
  roomId: string | null;
}): Promise<MeetingActionResult> {
  const meeting = await loadActiveMeeting({
    meetingId: params.meetingId,
    eventId: params.eventId,
    organisationId: params.organisationId,
  });

  const participantIds = meeting.participants.map((p) => p.attendeeId);
  await validateMeetingSlot(
    params.eventId,
    participantIds,
    params.startsAt,
    params.endsAt,
    { excludeMeetingId: meeting.id, roomId: params.roomId },
  );

  if (params.roomId) {
    const room = await prisma.meetingRoom.findFirst({
      where: {
        id: params.roomId,
        eventId: params.eventId,
        organisationId: params.organisationId,
      },
      select: { id: true },
    });
    if (!room) throw new Error("Meeting room not found");
  }

  await prisma.meeting.update({
    where: { id: meeting.id },
    data: {
      startsAt: params.startsAt,
      endsAt: params.endsAt,
      roomId: params.roomId,
      status: "SCHEDULED",
    },
  });

  const calendarWarning = await scheduleMeetingCalendars(meeting.id);

  await writeAudit({
    organisationId: params.organisationId,
    eventId: params.eventId,
    userId: params.userId,
    action: "meeting.reschedule",
    resource: "meeting",
    resourceId: meeting.id,
    metadata: { actor: params.actor },
  });

  return { calendarWarning };
}

function parseRescheduleSlot(formData: FormData) {
  const startsAtRaw = String(formData.get("startsAt") ?? "").trim();
  const endsAtRaw = String(formData.get("endsAt") ?? "").trim();
  if (!startsAtRaw || !endsAtRaw) {
    throw new Error("Start and end times are required to reschedule.");
  }
  const startsAt = new Date(startsAtRaw);
  const endsAt = new Date(endsAtRaw);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    throw new Error("Invalid start or end time.");
  }
  const roomId = String(formData.get("roomId") ?? "").trim() || null;
  return { startsAt, endsAt, roomId };
}

export async function cancelMeeting(
  orgSlug: string,
  eventId: string,
  formData: FormData,
): Promise<MeetingActionResult> {
  const ctx = await requireEvent(orgSlug, eventId, "event.update");
  const meetingId = z.string().min(1).parse(String(formData.get("meetingId") ?? ""));

  const result = await applyCancelMeeting({
    meetingId,
    eventId,
    organisationId: ctx.organisation.id,
    userId: ctx.user.id,
    actor: "organiser",
  });

  revalidatePath(`/app/${orgSlug}/events/${eventId}/meetings`);
  revalidatePath(`/me/events/${eventId}/meetings`);
  return result;
}

export async function rescheduleMeeting(
  orgSlug: string,
  eventId: string,
  formData: FormData,
): Promise<MeetingActionResult> {
  const ctx = await requireEvent(orgSlug, eventId, "event.update");
  const meetingId = z.string().min(1).parse(String(formData.get("meetingId") ?? ""));
  const slot = parseRescheduleSlot(formData);

  const result = await applyRescheduleMeeting({
    meetingId,
    eventId,
    organisationId: ctx.organisation.id,
    userId: ctx.user.id,
    actor: "organiser",
    ...slot,
  });

  revalidatePath(`/app/${orgSlug}/events/${eventId}/meetings`);
  revalidatePath(`/me/events/${eventId}/meetings`);
  return result;
}

export async function cancelMyMeeting(
  eventId: string,
  formData: FormData,
): Promise<MeetingActionResult> {
  const attendee = await myAttendee(eventId);
  if (!attendee.userId) throw new AuthzError("You are not registered for this event", 403);
  const meetingId = z.string().min(1).parse(String(formData.get("meetingId") ?? ""));

  const participant = await prisma.meetingParticipant.findFirst({
    where: {
      meetingId,
      eventId,
      organisationId: attendee.organisationId,
      attendeeId: attendee.id,
    },
    select: { id: true },
  });
  if (!participant) throw new AuthzError("You are not a participant in this meeting", 403);

  const result = await applyCancelMeeting({
    meetingId,
    eventId,
    organisationId: attendee.organisationId,
    userId: attendee.userId,
    actor: "attendee",
  });

  revalidatePath(`/me/events/${eventId}/meetings`);
  return result;
}

export async function rescheduleMyMeeting(
  eventId: string,
  formData: FormData,
): Promise<MeetingActionResult> {
  const attendee = await myAttendee(eventId);
  if (!attendee.userId) throw new AuthzError("You are not registered for this event", 403);
  const meetingId = z.string().min(1).parse(String(formData.get("meetingId") ?? ""));
  const slot = parseRescheduleSlot(formData);

  const participant = await prisma.meetingParticipant.findFirst({
    where: {
      meetingId,
      eventId,
      organisationId: attendee.organisationId,
      attendeeId: attendee.id,
    },
    select: { id: true },
  });
  if (!participant) throw new AuthzError("You are not a participant in this meeting", 403);

  const result = await applyRescheduleMeeting({
    meetingId,
    eventId,
    organisationId: attendee.organisationId,
    userId: attendee.userId,
    actor: "attendee",
    ...slot,
  });

  revalidatePath(`/me/events/${eventId}/meetings`);
  return result;
}
