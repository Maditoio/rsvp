"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireEvent, requireUser } from "@/lib/authz/require";
import { writeAudit } from "@/modules/audit/log";
import { AuthzError } from "@/lib/db/tenant";

async function myAttendee(eventId: string) {
  const user = await requireUser();
  const attendee = await prisma.attendee.findFirst({
    where: { eventId, userId: user.id },
  });
  if (!attendee) throw new AuthzError("You are not registered for this event", 403);
  return attendee;
}

export async function requestMeeting(eventId: string, formData: FormData) {
  const requester = await myAttendee(eventId);
  const targetId = z.string().min(1).parse(String(formData.get("targetId") ?? ""));
  const message = z.string().max(500).optional().or(z.literal("")).parse(
    String(formData.get("message") ?? ""),
  );
  if (targetId === requester.id) throw new Error("You cannot request a meeting with yourself.");

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

export async function respondToMeeting(eventId: string, formData: FormData) {
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
  if (!request) throw new Error("Meeting request not found");

  if (decision === "decline") {
    await prisma.meetingRequest.update({
      where: { id: request.id },
      data: { status: "DECLINED" },
    });
  } else {
    await prisma.$transaction(async (tx) => {
      await tx.meetingRequest.update({
        where: { id: request.id },
        data: { status: "ACCEPTED" },
      });
      const meeting = await tx.meeting.create({
        data: {
          organisationId: attendee.organisationId,
          eventId,
          status: "SCHEDULED",
        },
      });
      await tx.meetingParticipant.createMany({
        data: [
          {
            organisationId: attendee.organisationId,
            eventId,
            meetingId: meeting.id,
            attendeeId: request.requesterId,
          },
          {
            organisationId: attendee.organisationId,
            eventId,
            meetingId: meeting.id,
            attendeeId: request.targetId,
          },
        ],
      });
    });
  }
  revalidatePath(`/me/events/${eventId}/meetings`);
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
