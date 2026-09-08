import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { generateOpaqueToken } from "@/lib/crypto/tokens";
import { getAppUrl } from "@/lib/utils";
import { inngest } from "@/modules/jobs/client";
import { sendReminderEmail } from "@/modules/communications/email";
import {
  reminderEmailSubject,
  type ReminderEmailKind,
} from "@/modules/communications/reminder-copy";

export type ReminderAudience = "unaccepted" | "unregistered";

export type ReminderSendEvent = {
  name: "communication/reminders.send";
  data: {
    messageId: string;
    organisationId: string;
    eventId: string;
    invitationId?: string;
    toEmail: string;
    toName: string;
    eventName: string;
    orgName: string;
    href: string;
    kind: ReminderEmailKind;
    throttleKey: string;
  };
};

const REMINDER_THROTTLE_KEY = "resend-reminders";
const MANUAL_REMINDER_DEDUPE_MS = 60 * 60 * 1000;

function compactEvents(
  events: Array<ReminderSendEvent["data"] | null>,
): ReminderSendEvent["data"][] {
  return events.filter((event) => event != null);
}

function cutoffDaysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function audienceToKind(audience: ReminderAudience): ReminderEmailKind {
  return audience === "unaccepted" ? "invitation" : "registration";
}

function reminderHref(rawToken: string, audience: ReminderAudience) {
  return `${getAppUrl()}/i/${rawToken}${audience === "unregistered" ? "/register" : ""}`;
}

async function dispatchReminderEvents(events: ReminderSendEvent["data"][]) {
  if (events.length === 0) return;

  if (process.env.INNGEST_EVENT_KEY) {
    await inngest.send(
      events.map((data) => ({
        name: "communication/reminders.send" as const,
        data,
      })),
    );
    return;
  }

  for (const data of events) {
    await sendReminderEmail({
      organisationId: data.organisationId,
      eventId: data.eventId,
      invitationId: data.invitationId,
      messageId: data.messageId,
      toEmail: data.toEmail,
      toName: data.toName,
      eventName: data.eventName,
      orgName: data.orgName,
      href: data.href,
      kind: data.kind,
    });
  }
}

function manualReminderBucket() {
  return Math.floor(Date.now() / MANUAL_REMINDER_DEDUPE_MS);
}

function invitationReminderDedupeKey(input: {
  audience: ReminderAudience;
  eventId: string;
  invitationId: string;
  bucket: string | number;
}) {
  return `${input.audience}:${input.eventId}:${input.invitationId}:${input.bucket}`;
}

function eventReminderDedupeKey(input: {
  eventId: string;
  toEmail: string;
  targetDay: string;
}) {
  return `event:${input.eventId}:${input.toEmail.toLowerCase()}:${input.targetDay}`;
}

async function createQueuedReminderMessage(input: {
  organisationId: string;
  eventId: string;
  invitationId?: string;
  campaignId: string;
  toEmail: string;
  subject: string;
  dedupeKey: string;
}) {
  try {
    return await prisma.emailMessage.create({
      data: {
        organisationId: input.organisationId,
        eventId: input.eventId,
        invitationId: input.invitationId,
        campaignId: input.campaignId,
        toEmail: input.toEmail,
        subject: input.subject,
        status: "QUEUED",
        dedupeKey: input.dedupeKey,
      },
      select: { id: true },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return null;
    }
    throw error;
  }
}

async function queueInvitationReminderMessages(input: {
  organisationId: string;
  eventId: string;
  eventName: string;
  orgName: string;
  audience: ReminderAudience;
  dedupeSince: Date;
  eligibleUpdatedBefore?: Date;
  dedupeBucket: string | number;
  campaignName: string;
}) {
  const subject = reminderEmailSubject(audienceToKind(input.audience), input.eventName);
  const invitations = await prisma.invitation.findMany({
    where: {
      eventId: input.eventId,
      organisationId: input.organisationId,
      ...(input.eligibleUpdatedBefore
        ? { updatedAt: { lte: input.eligibleUpdatedBefore } }
        : {}),
      status:
        input.audience === "unaccepted"
          ? { in: ["SENT", "DELIVERED", "OPENED"] }
          : "ACCEPTED",
    },
    include: { contact: true, attendees: { select: { id: true }, take: 1 } },
  });

  const eligible = invitations.filter(
    (invitation) =>
      !(input.audience === "unregistered" && invitation.attendees.length > 0),
  );
  if (eligible.length === 0) return { queued: 0, events: [] as ReminderSendEvent["data"][] };

  const existing = await prisma.emailMessage.findMany({
    where: {
      organisationId: input.organisationId,
      eventId: input.eventId,
      invitationId: { in: eligible.map((invitation) => invitation.id) },
      subject,
      status: { in: ["QUEUED", "SENT", "DELIVERED", "OPENED"] },
      createdAt: { gte: input.dedupeSince },
    },
    select: { invitationId: true },
  });
  const queuedInvitationIds = new Set(
    existing.map((row) => row.invitationId).filter((id): id is string => Boolean(id)),
  );
  const pending = eligible.filter((invitation) => !queuedInvitationIds.has(invitation.id));
  if (pending.length === 0) return { queued: 0, events: [] as ReminderSendEvent["data"][] };

  const campaign = await prisma.emailCampaign.create({
    data: {
      organisationId: input.organisationId,
      eventId: input.eventId,
      name: input.campaignName,
      scheduledAt: new Date(),
    },
  });

  const messages = await Promise.all(
    pending.map(async (invitation) => {
      const token = generateOpaqueToken();
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { tokenHash: token.hash },
      });
      const message = await createQueuedReminderMessage({
        organisationId: input.organisationId,
        eventId: input.eventId,
        invitationId: invitation.id,
        campaignId: campaign.id,
        toEmail: invitation.contact.email,
        subject,
        dedupeKey: invitationReminderDedupeKey({
          audience: input.audience,
          eventId: input.eventId,
          invitationId: invitation.id,
          bucket: input.dedupeBucket,
        }),
      });
      if (!message) return null;
      return {
        messageId: message.id,
        organisationId: input.organisationId,
        eventId: input.eventId,
        invitationId: invitation.id,
        toEmail: invitation.contact.email,
        toName: `${invitation.contact.firstName} ${invitation.contact.lastName}`,
        eventName: input.eventName,
        orgName: input.orgName,
        href: reminderHref(token.raw, input.audience),
        kind: audienceToKind(input.audience),
        throttleKey: REMINDER_THROTTLE_KEY,
      } satisfies ReminderSendEvent["data"];
    }),
  );

  const events = compactEvents(messages);
  return { queued: events.length, events };
}

async function queueEventReminderMessages(input: {
  organisationId: string;
  eventId: string;
  eventName: string;
  orgName: string;
  daysBefore: number;
  campaignName: string;
}) {
  const event = await prisma.event.findFirst({
    where: { id: input.eventId, organisationId: input.organisationId },
    include: { organisation: { select: { name: true } } },
  });
  if (!event?.startsAt) return { queued: 0, events: [] as ReminderSendEvent["data"][] };

  const targetDay = new Date(event.startsAt);
  targetDay.setDate(targetDay.getDate() - input.daysBefore);
  const now = new Date();
  const windowStart = new Date(targetDay);
  windowStart.setHours(0, 0, 0, 0);
  const windowEnd = new Date(targetDay);
  windowEnd.setHours(23, 59, 59, 999);
  if (now < windowStart || now > windowEnd) {
    return { queued: 0, events: [] as ReminderSendEvent["data"][] };
  }

  const attendees = await prisma.attendee.findMany({
    where: {
      organisationId: input.organisationId,
      eventId: input.eventId,
      status: { in: ["REGISTERED", "CONFIRMED"] },
    },
    select: { email: true, firstName: true, lastName: true },
  });
  if (attendees.length === 0) return { queued: 0, events: [] as ReminderSendEvent["data"][] };

  const subject = reminderEmailSubject("event", event.name);
  const existing = await prisma.emailMessage.findMany({
    where: {
      organisationId: input.organisationId,
      eventId: input.eventId,
      toEmail: { in: attendees.map((attendee) => attendee.email) },
      subject,
      status: { in: ["QUEUED", "SENT", "DELIVERED", "OPENED"] },
      createdAt: { gte: windowStart },
    },
    select: { toEmail: true },
  });
  const queuedEmails = new Set(existing.map((row) => row.toEmail.toLowerCase()));
  const pending = attendees.filter(
    (attendee) => !queuedEmails.has(attendee.email.toLowerCase()),
  );
  if (pending.length === 0) return { queued: 0, events: [] as ReminderSendEvent["data"][] };

  const campaign = await prisma.emailCampaign.create({
    data: {
      organisationId: input.organisationId,
      eventId: input.eventId,
      name: input.campaignName,
      scheduledAt: new Date(),
    },
  });

  const messages = await Promise.all(
    pending.map(async (attendee) => {
      const message = await createQueuedReminderMessage({
        organisationId: input.organisationId,
        eventId: input.eventId,
        campaignId: campaign.id,
        toEmail: attendee.email,
        subject,
        dedupeKey: eventReminderDedupeKey({
          eventId: input.eventId,
          toEmail: attendee.email,
          targetDay: windowStart.toISOString().slice(0, 10),
        }),
      });
      if (!message) return null;
      return {
        messageId: message.id,
        organisationId: input.organisationId,
        eventId: input.eventId,
        toEmail: attendee.email,
        toName: `${attendee.firstName} ${attendee.lastName}`,
        eventName: event.name,
        orgName: event.organisation.name,
        href: `${getAppUrl()}/me/events/${input.eventId}`,
        kind: "event" as const,
        throttleKey: REMINDER_THROTTLE_KEY,
      } satisfies ReminderSendEvent["data"];
    }),
  );

  const events = compactEvents(messages);
  return { queued: events.length, events };
}

export async function queueManualReminderCampaign(input: {
  organisationId: string;
  eventId: string;
  eventName: string;
  orgName: string;
  audience: ReminderAudience;
}) {
  const dedupeSince = new Date(Date.now() - MANUAL_REMINDER_DEDUPE_MS);
  const result = await queueInvitationReminderMessages({
    organisationId: input.organisationId,
    eventId: input.eventId,
    eventName: input.eventName,
    orgName: input.orgName,
    audience: input.audience,
    dedupeSince,
    dedupeBucket: manualReminderBucket(),
    campaignName:
      input.audience === "unaccepted"
        ? `Manual invitation reminders · ${input.eventName}`
        : `Manual registration reminders · ${input.eventName}`,
  });
  await dispatchReminderEvents(result.events);
  return { queued: result.queued };
}

export async function queueAutomationInvitationReminderCampaign(input: {
  organisationId: string;
  eventId: string;
  eventName: string;
  orgName: string;
  audience: ReminderAudience;
  delayDays: number;
}) {
  const result = await queueInvitationReminderMessages({
    organisationId: input.organisationId,
    eventId: input.eventId,
    eventName: input.eventName,
    orgName: input.orgName,
    audience: input.audience,
    dedupeSince: cutoffDaysAgo(input.delayDays),
    eligibleUpdatedBefore: cutoffDaysAgo(input.delayDays),
    dedupeBucket: `${input.delayDays}d:${new Date().toISOString().slice(0, 10)}`,
    campaignName:
      input.audience === "unaccepted"
        ? `Automation invitation reminders · ${input.eventName}`
        : `Automation registration reminders · ${input.eventName}`,
  });
  await dispatchReminderEvents(result.events);
  return { queued: result.queued };
}

export async function queueAutomationEventReminderCampaign(input: {
  organisationId: string;
  eventId: string;
  eventName: string;
  orgName: string;
  daysBefore: number;
}) {
  const result = await queueEventReminderMessages({
    organisationId: input.organisationId,
    eventId: input.eventId,
    eventName: input.eventName,
    orgName: input.orgName,
    daysBefore: input.daysBefore,
    campaignName: `Automation event reminders · ${input.eventName}`,
  });
  await dispatchReminderEvents(result.events);
  return { queued: result.queued };
}
