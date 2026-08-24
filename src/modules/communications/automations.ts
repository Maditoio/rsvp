import type {
  CommunicationAutomationAction,
  CommunicationAutomationTrigger,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { generateOpaqueToken } from "@/lib/crypto/tokens";
import { getAppUrl } from "@/lib/utils";
import { sendReminderEmail } from "@/modules/communications/email";
import { writeAudit } from "@/modules/audit/log";

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

function cutoffDaysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
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

  const cutoff = cutoffDaysAgo(delayDays);
  const invitations = await prisma.invitation.findMany({
    where: {
      organisationId,
      eventId,
      updatedAt: { lte: cutoff },
      status:
        audience === "unaccepted"
          ? { in: ["SENT", "DELIVERED", "OPENED"] }
          : "ACCEPTED",
    },
    include: { contact: true, attendees: { select: { id: true }, take: 1 } },
  });

  let sent = 0;
  for (const invitation of invitations) {
    if (audience === "unregistered" && invitation.attendees.length > 0) continue;

    const recent = await prisma.emailMessage.findFirst({
      where: {
        organisationId,
        eventId,
        invitationId: invitation.id,
        createdAt: { gte: cutoff },
      },
    });
    if (recent) continue;

    const token = generateOpaqueToken();
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { tokenHash: token.hash },
    });
    const href = `${getAppUrl()}/i/${token.raw}${audience === "unregistered" ? "/register" : ""}`;
    await sendReminderEmail({
      organisationId,
      eventId,
      invitationId: invitation.id,
      toEmail: invitation.contact.email,
      toName: `${invitation.contact.firstName} ${invitation.contact.lastName}`,
      eventName: event.name,
      orgName: event.organisation.name,
      href,
      kind: audience === "unaccepted" ? "invitation" : "registration",
    });
    sent += 1;
  }
  return sent;
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
  if (!event?.startsAt) return 0;

  const targetDay = new Date(event.startsAt);
  targetDay.setDate(targetDay.getDate() - daysBefore);
  const now = new Date();
  const windowStart = new Date(targetDay);
  windowStart.setHours(0, 0, 0, 0);
  const windowEnd = new Date(targetDay);
  windowEnd.setHours(23, 59, 59, 999);
  if (now < windowStart || now > windowEnd) return 0;

  const attendees = await prisma.attendee.findMany({
    where: { organisationId, eventId, status: { in: ["REGISTERED", "CONFIRMED"] } },
    select: { email: true, firstName: true, lastName: true },
  });

  let sent = 0;
  for (const attendee of attendees) {
    const recent = await prisma.emailMessage.findFirst({
      where: {
        organisationId,
        eventId,
        toEmail: attendee.email,
        subject: { contains: "starts" },
        createdAt: { gte: windowStart },
      },
    });
    if (recent) continue;

    await sendReminderEmail({
      organisationId,
      eventId,
      toEmail: attendee.email,
      toName: `${attendee.firstName} ${attendee.lastName}`,
      eventName: event.name,
      orgName: event.organisation.name,
      href: `${getAppUrl()}/me/events/${eventId}`,
      kind: "registration",
    });
    sent += 1;
  }
  return sent;
}

export async function runAutomation(
  automationId: string,
): Promise<{ sent: number; skipped: boolean }> {
  const automation = await prisma.communicationAutomation.findUnique({
    where: { id: automationId },
  });
  if (!automation || !automation.enabled) {
    return { sent: 0, skipped: true };
  }

  const settings = await prisma.eventSettings.findUnique({
    where: { eventId: automation.eventId },
    select: { automationsEnabled: true },
  });
  if (settings?.automationsEnabled === false) {
    return { sent: 0, skipped: true };
  }

  let sent = 0;
  switch (automation.action) {
    case "SEND_INVITATION_REMINDER":
      sent = await sendInvitationReminderForAutomation(
        automation.organisationId,
        automation.eventId,
        "unaccepted",
        automation.delayDays,
      );
      break;
    case "SEND_REGISTRATION_REMINDER":
      sent = await sendInvitationReminderForAutomation(
        automation.organisationId,
        automation.eventId,
        "unregistered",
        automation.delayDays,
      );
      break;
    case "SEND_EVENT_REMINDER":
      sent = await sendEventReminderForAutomation(
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

  if (sent > 0) {
    await writeAudit({
      organisationId: automation.organisationId,
      eventId: automation.eventId,
      action: "communications.automation.run",
      resource: "communication_automation",
      resourceId: automation.id,
      metadata: { sent, trigger: automation.trigger, action: automation.action },
    });
  }

  return { sent, skipped: false };
}

export async function runAllEnabledAutomations(): Promise<{
  processed: number;
  sent: number;
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
  let sent = 0;
  for (const automation of automations) {
    if (automation.event.settings?.automationsEnabled === false) continue;
    const result = await runAutomation(automation.id);
    processed += 1;
    sent += result.sent;
  }
  return { processed, sent };
}
