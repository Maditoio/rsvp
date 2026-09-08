"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { writeAudit } from "@/modules/audit/log";
import { rateLimit } from "@/lib/rate-limit";
import { queueManualReminderCampaign } from "@/modules/communications/reminder-queue";

export async function sendEventReminders(
  orgSlug: string,
  eventId: string,
  formData: FormData,
) {
  const ctx = await requireEvent(orgSlug, eventId, "invitations.write");

  const limited = await rateLimit(`reminders:${eventId}`, 3, 3600);
  if (!limited.success) throw new Error("Reminder limit reached. Try again later.");

  const audience = z.enum(["unaccepted", "unregistered"]).parse(
    String(formData.get("audience") ?? ""),
  );

  const invitations = await prisma.invitation.findMany({
    where: {
      eventId,
      organisationId: ctx.organisation.id,
      status:
        audience === "unaccepted"
          ? { in: ["SENT", "DELIVERED", "OPENED"] }
          : "ACCEPTED",
    },
    include: { contact: true, attendees: { select: { id: true }, take: 1 } },
  });

  const event = await prisma.event.findFirst({
    where: { id: eventId, organisationId: ctx.organisation.id },
  });
  if (!event) throw new Error("Event not found");

  const queued = (
    await queueManualReminderCampaign({
      organisationId: ctx.organisation.id,
      eventId,
      eventName: event.name,
      orgName: ctx.organisation.name,
      audience,
    })
  ).queued;

  await writeAudit({
    organisationId: ctx.organisation.id,
    eventId,
    userId: ctx.user.id,
    action: "communications.reminder",
    resource: "invitation",
    metadata: { audience, queued, candidates: invitations.length },
  });
  revalidatePath(`/app/${orgSlug}/events/${eventId}/communications`);
  return { queued };
}
