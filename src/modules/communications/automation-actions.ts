"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { writeAudit } from "@/modules/audit/log";
import { runAutomation } from "./automations";

const saveSchema = z.object({
  automationId: z.string().min(1),
  enabled: z.boolean(),
  delayDays: z.number().int().min(0).max(90),
  name: z.string().max(120).optional(),
});

export async function saveCommunicationAutomation(
  orgSlug: string,
  eventId: string,
  formData: FormData,
) {
  const ctx = await requireEvent(orgSlug, eventId, "invitations.write");
  const parsed = saveSchema.parse({
    automationId: String(formData.get("automationId") ?? ""),
    enabled: formData.get("enabled") === "on" || formData.get("enabled") === "true",
    delayDays: Number(formData.get("delayDays") ?? 0),
    name: String(formData.get("name") ?? "").trim() || undefined,
  });

  const automation = await prisma.communicationAutomation.findFirst({
    where: {
      id: parsed.automationId,
      eventId,
      organisationId: ctx.organisation.id,
    },
  });
  if (!automation) throw new Error("Automation not found");

  await prisma.communicationAutomation.update({
    where: { id: automation.id },
    data: {
      enabled: parsed.enabled,
      delayDays: parsed.delayDays,
      name: parsed.name ?? automation.name,
    },
  });

  await writeAudit({
    organisationId: ctx.organisation.id,
    eventId,
    userId: ctx.user.id,
    action: "communications.automation.update",
    resource: "communication_automation",
    resourceId: automation.id,
    metadata: { enabled: parsed.enabled, delayDays: parsed.delayDays },
  });

  revalidatePath(`/app/${orgSlug}/events/${eventId}/communications`);
}

export async function runCommunicationAutomationNow(
  orgSlug: string,
  eventId: string,
  automationId: string,
) {
  const ctx = await requireEvent(orgSlug, eventId, "invitations.write");
  const automation = await prisma.communicationAutomation.findFirst({
    where: {
      id: automationId,
      eventId,
      organisationId: ctx.organisation.id,
    },
  });
  if (!automation) throw new Error("Automation not found");

  const result = await runAutomation(automation.id);
  revalidatePath(`/app/${orgSlug}/events/${eventId}/communications`);
  return result;
}

export async function updateAutomationsEnabled(
  orgSlug: string,
  eventId: string,
  enabled: boolean,
) {
  const ctx = await requireEvent(orgSlug, eventId, "event.update");
  await prisma.eventSettings.update({
    where: { eventId },
    data: { automationsEnabled: enabled },
  });
  await writeAudit({
    organisationId: ctx.organisation.id,
    eventId,
    userId: ctx.user.id,
    action: "communications.automations.toggle",
    resource: "event_settings",
    resourceId: eventId,
    metadata: { enabled },
  });
  revalidatePath(`/app/${orgSlug}/events/${eventId}/communications`);
  revalidatePath(`/app/${orgSlug}/events/${eventId}/settings`);
}
