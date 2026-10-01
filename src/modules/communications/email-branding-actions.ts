"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { writeAudit } from "@/modules/audit/log";
import { parseEmailHexColor } from "@/modules/communications/email-branding";

const brandingSchema = z.object({
  emailAccentColor: z
    .string()
    .trim()
    .regex(/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/, "Use a valid hex colour")
    .optional()
    .or(z.literal("")),
});

export async function saveEmailBranding(
  orgSlug: string,
  eventId: string,
  formData: FormData,
) {
  const ctx = await requireEvent(orgSlug, eventId, "invitations.write");
  const parsed = brandingSchema.parse({
    emailAccentColor: String(formData.get("emailAccentColor") ?? ""),
  });

  const emailAccentColor = parsed.emailAccentColor
    ? parseEmailHexColor(parsed.emailAccentColor)
    : null;

  await prisma.eventSettings.upsert({
    where: { eventId },
    create: {
      organisationId: ctx.organisation.id,
      eventId,
      emailAccentColor,
    },
    update: { emailAccentColor },
  });

  await writeAudit({
    organisationId: ctx.organisation.id,
    eventId,
    userId: ctx.user.id,
    action: "communications.email_branding.update",
    resource: "event_settings",
    resourceId: eventId,
    metadata: { emailAccentColor },
  });

  revalidatePath(`/app/${orgSlug}/events/${eventId}/communications`);
  revalidatePath(`/app/${orgSlug}/events/${eventId}/settings`);
}
