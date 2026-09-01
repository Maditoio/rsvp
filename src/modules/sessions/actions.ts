"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { SessionFormat } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireEvent, requireUser } from "@/lib/authz/require";
import { writeAudit } from "@/modules/audit/log";
import { AuthzError } from "@/lib/db/tenant";
import { syncSessionTeamsMeetingIfNeeded } from "@/modules/meetings/session-teams-actions";
import { parseOptionalDateRange } from "@/lib/validation";

const sessionSchema = z.object({
  sessionId: z.string().optional(),
  title: z.string().min(2).max(160),
  description: z.string().max(2000).optional().or(z.literal("")),
  location: z.string().max(160).optional().or(z.literal("")),
  startsAt: z.string().optional().or(z.literal("")),
  endsAt: z.string().optional().or(z.literal("")),
  capacity: z.string().optional().or(z.literal("")),
  format: z.enum(["PHYSICAL", "ONLINE", "HYBRID"]).default("PHYSICAL"),
});

export async function saveSession(orgSlug: string, eventId: string, formData: FormData) {
  const ctx = await requireEvent(orgSlug, eventId, "event.update");
  const event = await prisma.event.findFirst({
    where: { id: eventId, organisationId: ctx.organisation.id },
    select: { timezone: true },
  });
  const timezone = event?.timezone || "UTC";

  const input = sessionSchema.parse({
    sessionId: String(formData.get("sessionId") ?? "") || undefined,
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    location: String(formData.get("location") ?? ""),
    startsAt: String(formData.get("startsAt") ?? ""),
    endsAt: String(formData.get("endsAt") ?? ""),
    capacity: String(formData.get("capacity") ?? ""),
    format: String(formData.get("format") ?? "PHYSICAL") || "PHYSICAL",
  });

  const capacityValue = input.capacity
    ? z.coerce.number().int().positive().parse(input.capacity)
    : null;

  const slot = parseOptionalDateRange(
    input.startsAt ?? "",
    input.endsAt ?? "",
    timezone,
  );
  if (!slot.ok) {
    throw new Error(slot.error);
  }

  const data = {
    organisationId: ctx.organisation.id,
    eventId,
    title: input.title,
    description: input.description || null,
    location: input.location || null,
    startsAt: slot.startsAt,
    endsAt: slot.endsAt,
    capacity: capacityValue,
    format: input.format as SessionFormat,
  };

  let sessionId = input.sessionId;

  if (input.sessionId) {
    const existing = await prisma.session.findFirst({
      where: {
        id: input.sessionId,
        eventId,
        organisationId: ctx.organisation.id,
      },
    });
    if (!existing) throw new Error("Session not found");
    await prisma.session.update({
      where: { id: existing.id },
      data: {
        title: data.title,
        description: data.description,
        location: data.location,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        capacity: data.capacity,
        format: data.format,
      },
    });

    if (data.format !== SessionFormat.PHYSICAL) {
      await syncSessionTeamsMeetingIfNeeded({
        organisationId: ctx.organisation.id,
        eventId,
        sessionId: existing.id,
        userId: ctx.user.id,
        title: data.title,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
      });
    }
  } else {
    const created = await prisma.session.create({ data });
    sessionId = created.id;
  }

  await writeAudit({
    organisationId: ctx.organisation.id,
    eventId,
    userId: ctx.user.id,
    action: "session.save",
    resource: "session",
    resourceId: sessionId,
  });
  revalidatePath(`/app/${orgSlug}/events/${eventId}/agenda`);
  revalidatePath(`/me/events/${eventId}/agenda`);
  return { sessionId };
}

export async function deleteSession(orgSlug: string, eventId: string, formData: FormData) {
  const ctx = await requireEvent(orgSlug, eventId, "event.update");
  const sessionId = z.string().min(1).parse(String(formData.get("sessionId") ?? ""));
  const existing = await prisma.session.findFirst({
    where: { id: sessionId, eventId, organisationId: ctx.organisation.id },
  });
  if (!existing) throw new Error("Session not found");
  await prisma.session.delete({ where: { id: existing.id } });
  await writeAudit({
    organisationId: ctx.organisation.id,
    eventId,
    userId: ctx.user.id,
    action: "session.delete",
    resource: "session",
    resourceId: sessionId,
  });
  revalidatePath(`/app/${orgSlug}/events/${eventId}/agenda`);
  revalidatePath(`/me/events/${eventId}/agenda`);
}

export async function toggleMySession(eventId: string, formData: FormData) {
  const user = await requireUser();
  const sessionId = z.string().min(1).parse(String(formData.get("sessionId") ?? ""));
  const attendee = await prisma.attendee.findFirst({
    where: { eventId, userId: user.id },
  });
  if (!attendee) throw new AuthzError("You are not registered for this event", 403);

  const session = await prisma.session.findFirst({
    where: { id: sessionId, eventId, organisationId: attendee.organisationId },
  });
  if (!session) throw new Error("Session not found");

  const existing = await prisma.sessionRegistration.findUnique({
    where: { sessionId_attendeeId: { sessionId, attendeeId: attendee.id } },
  });
  if (existing) {
    await prisma.sessionRegistration.delete({ where: { id: existing.id } });
  } else {
    if (session.capacity !== null) {
      const count = await prisma.sessionRegistration.count({
        where: { sessionId },
      });
      if (count >= session.capacity) {
        throw new Error("This session is full.");
      }
    }
    await prisma.sessionRegistration.create({
      data: {
        organisationId: attendee.organisationId,
        eventId,
        sessionId,
        attendeeId: attendee.id,
      },
    });
  }
  revalidatePath(`/me/events/${eventId}/agenda`);
}
