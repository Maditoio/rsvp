"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { writeAudit } from "@/modules/audit/log";
import { generateOpaqueToken } from "@/lib/crypto/tokens";
import { rateLimit } from "@/lib/rate-limit";
import { getAppUrl } from "@/lib/utils";
import { sendReminderEmail } from "@/modules/communications/email";

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

  let sent = 0;
  for (const invitation of invitations) {
    if (audience === "unregistered" && invitation.attendees.length > 0) continue;
    const token = generateOpaqueToken();
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { tokenHash: token.hash },
    });
    const href = `${getAppUrl()}/i/${token.raw}${audience === "unregistered" ? "/register" : ""}`;
    await sendReminderEmail({
      organisationId: ctx.organisation.id,
      eventId,
      invitationId: invitation.id,
      toEmail: invitation.contact.email,
      toName: `${invitation.contact.firstName} ${invitation.contact.lastName}`,
      eventName: event.name,
      orgName: ctx.organisation.name,
      href,
      kind: audience === "unaccepted" ? "invitation" : "registration",
    });
    sent += 1;
  }

  await writeAudit({
    organisationId: ctx.organisation.id,
    eventId,
    userId: ctx.user.id,
    action: "communications.reminder",
    resource: "invitation",
    metadata: { audience, sent },
  });
  revalidatePath(`/app/${orgSlug}/events/${eventId}/communications`);
  return { sent };
}
