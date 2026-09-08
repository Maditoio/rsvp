import type {
  CommunicationAutomationAction,
  CommunicationAutomationTrigger,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { writeAudit } from "@/modules/audit/log";
import {
  queueAutomationEventReminderCampaign,
  queueAutomationInvitationReminderCampaign,
} from "@/modules/communications/reminder-queue";

export type AutomationRow = {
  id: string;
  name: string | null;
  trigger: CommunicationAutomationTrigger;
  delayDays: number;
  action: CommunicationAutomationAction;
  enabled: boolean;
  lastRunAt: string | null;
};

export const DEFAULT_AUTOMATIONS: {
  trigger: CommunicationAutomationTrigger;
  delayDays: number;
  action: CommunicationAutomationAction;
  name: string;
}[] = [
  {
    name: "Invitation reminder after 5 days",
    trigger: "INVITATION_NOT_ACCEPTED",
    delayDays: 5,
    action: "SEND_INVITATION_REMINDER",
  },
  {
    name: "Registration reminder after 3 days",
    trigger: "INVITATION_NOT_REGISTERED",
    delayDays: 3,
    action: "SEND_REGISTRATION_REMINDER",
  },
  {
    name: "Event reminder 1 day before",
    trigger: "EVENT_STARTS_BEFORE",
    delayDays: 1,
    action: "SEND_EVENT_REMINDER",
  },
];

export async function ensureDefaultAutomations(
  organisationId: string,
  eventId: string,
) {
  const existing = await prisma.communicationAutomation.count({
    where: { organisationId, eventId },
  });
  if (existing > 0) return;

  await prisma.communicationAutomation.createMany({
    data: DEFAULT_AUTOMATIONS.map((row) => ({
      organisationId,
      eventId,
      name: row.name,
      trigger: row.trigger,
      delayDays: row.delayDays,
      action: row.action,
      enabled: false,
    })),
  });
}

export async function listAutomations(
  organisationId: string,
  eventId: string,
): Promise<AutomationRow[]> {
  await ensureDefaultAutomations(organisationId, eventId);
  const rows = await prisma.communicationAutomation.findMany({
    where: { organisationId, eventId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    trigger: row.trigger,
    delayDays: row.delayDays,
    action: row.action,
    enabled: row.enabled,
    lastRunAt: row.lastRunAt?.toISOString() ?? null,
  }));
}

async function sendInvitationReminderForAutomation(
  organisationId: string,
  eventId: string,
  audience: "unaccepted" | "unregistered",
  delayDays: number,
) {
  const event = await prisma.event.findFirst({
    where: { id: eventId, organisationId },
    include: { organisation: { select: { name: true } } },
  });
  if (!event) return 0;

  return (
    await queueAutomationInvitationReminderCampaign({
      organisationId,
      eventId,
      eventName: event.name,
      orgName: event.organisation.name,
      audience,
      delayDays,
    })
  ).queued;
}

async function sendEventReminderForAutomation(
  organisationId: string,
  eventId: string,
  daysBefore: number,
) {
  const event = await prisma.event.findFirst({
    where: { id: eventId, organisationId },
    include: { organisation: { select: { name: true } } },
  });
  if (!event) return 0;

  return (
    await queueAutomationEventReminderCampaign({
      organisationId,
      eventId,
      eventName: event.name,
      orgName: event.organisation.name,
      daysBefore,
    })
  ).queued;
}

export async function runAutomation(
  automationId: string,
): Promise<{ queued: number; skipped: boolean }> {
  const automation = await prisma.communicationAutomation.findUnique({
    where: { id: automationId },
  });
  if (!automation || !automation.enabled) {
    return { queued: 0, skipped: true };
  }

  const settings = await prisma.eventSettings.findUnique({
    where: { eventId: automation.eventId },
    select: { automationsEnabled: true },
  });
  if (settings?.automationsEnabled === false) {
    return { queued: 0, skipped: true };
  }

  let queued = 0;
  switch (automation.action) {
    case "SEND_INVITATION_REMINDER":
      queued = await sendInvitationReminderForAutomation(
        automation.organisationId,
        automation.eventId,
        "unaccepted",
        automation.delayDays,
      );
      break;
    case "SEND_REGISTRATION_REMINDER":
      queued = await sendInvitationReminderForAutomation(
        automation.organisationId,
        automation.eventId,
        "unregistered",
        automation.delayDays,
      );
      break;
    case "SEND_EVENT_REMINDER":
      queued = await sendEventReminderForAutomation(
        automation.organisationId,
        automation.eventId,
        automation.delayDays,
      );
      break;
    case "SEND_MEETING_CONFIRMATION":
      // Meeting confirmations are sent transactionally on accept; skip batch.
      break;
  }

  await prisma.communicationAutomation.update({
    where: { id: automation.id },
    data: { lastRunAt: new Date() },
  });

  if (queued > 0) {
    await writeAudit({
      organisationId: automation.organisationId,
      eventId: automation.eventId,
      action: "communications.automation.run",
      resource: "communication_automation",
      resourceId: automation.id,
      metadata: { queued, trigger: automation.trigger, action: automation.action },
    });
  }

  return { queued, skipped: false };
}

export async function runAllEnabledAutomations(): Promise<{
  processed: number;
  queued: number;
}> {
  const automations = await prisma.communicationAutomation.findMany({
    where: { enabled: true },
    include: {
      event: {
        select: {
          settings: { select: { automationsEnabled: true } },
        },
      },
    },
  });

  let processed = 0;
  let queued = 0;
  for (const automation of automations) {
    if (automation.event.settings?.automationsEnabled === false) continue;
    const result = await runAutomation(automation.id);
    processed += 1;
    queued += result.queued;
  }
  return { processed, queued };
}
