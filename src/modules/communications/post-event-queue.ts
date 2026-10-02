import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getAppUrl } from "@/lib/utils";
import { inngest } from "@/modules/jobs/client";
import { sendPostEventFollowUpEmail } from "@/modules/communications/email";
import {
  loadEventMailSnapshot,
  type EventMailSnapshot,
} from "@/modules/communications/email-mail-context";
import { PLATFORM_EMAIL_UNSUBSCRIBE_PURPOSE } from "@/modules/communications/email-unsubscribe";
import {
  audienceStatusFilter,
  defaultPostEventSubject,
  toPostEventAudienceEnum,
  type PostEventAudienceInput,
} from "@/modules/communications/post-event";

export type PostEventSendEvent = {
  name: "communication/post-event.send";
  data: {
    messageId: string;
    organisationId: string;
    eventId: string;
    campaignId: string;
    toEmail: string;
    toName: string;
    eventName: string;
    orgName: string;
    subject: string;
    body: string;
    href: string;
    ctaLabel: string;
    throttleKey: string;
    mail: EventMailSnapshot;
  };
};

const POST_EVENT_THROTTLE_KEY = "resend-post-event";
const POST_EVENT_DEDUPE_MS = 24 * 60 * 60 * 1000;

function compactEvents(
  events: Array<PostEventSendEvent["data"] | null>,
): PostEventSendEvent["data"][] {
  return events.filter((event) => event != null);
}

function postEventDedupeKey(input: {
  campaignId: string;
  toEmail: string;
}) {
  return `post-event:${input.campaignId}:${input.toEmail.toLowerCase()}`;
}

async function createQueuedMessage(input: {
  organisationId: string;
  eventId: string;
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

async function dispatchPostEventEmails(events: PostEventSendEvent["data"][]) {
  if (events.length === 0) return;

  if (process.env.INNGEST_EVENT_KEY) {
    await inngest.send(
      events.map((data) => ({
        name: "communication/post-event.send" as const,
        data,
      })),
    );
    return;
  }

  for (const data of events) {
    await sendPostEventFollowUpEmail({
      organisationId: data.organisationId,
      eventId: data.eventId,
      campaignId: data.campaignId,
      messageId: data.messageId,
      toEmail: data.toEmail,
      toName: data.toName,
      eventName: data.eventName,
      orgName: data.orgName,
      subject: data.subject,
      body: data.body,
      href: data.href,
      ctaLabel: data.ctaLabel,
      mail: data.mail,
    });
  }
}

export async function queuePostEventFollowUpCampaign(input: {
  organisationId: string;
  eventId: string;
  eventName: string;
  orgName: string;
  createdById: string;
  audience: PostEventAudienceInput;
  subject: string;
  body: string;
  categoryIds: string[];
  pollId?: string | null;
  campaignName?: string;
}) {
  const subject =
    input.subject.trim() || defaultPostEventSubject(input.eventName);
  const body = input.body.trim();
  if (!body) {
    throw new Error("Message body is required.");
  }
  if (subject.length > 180) {
    throw new Error("Subject must be 180 characters or fewer.");
  }
  if (body.length > 8000) {
    throw new Error("Message body must be 8,000 characters or fewer.");
  }

  const statuses = audienceStatusFilter(input.audience);
  const attendees = await prisma.attendee.findMany({
    where: {
      organisationId: input.organisationId,
      eventId: input.eventId,
      status: { in: statuses },
      ...(input.categoryIds.length > 0
        ? { categoryId: { in: input.categoryIds } }
        : {}),
    },
    select: {
      email: true,
      firstName: true,
      lastName: true,
    },
  });

  const uniqueByEmail = new Map<
    string,
    { email: string; firstName: string; lastName: string }
  >();
  for (const attendee of attendees) {
    const key = attendee.email.trim().toLowerCase();
    if (!key || uniqueByEmail.has(key)) continue;
    uniqueByEmail.set(key, attendee);
  }
  const recipients = [...uniqueByEmail.values()];

  const unsubscribed = await prisma.consent.findMany({
    where: {
      organisationId: input.organisationId,
      purpose: PLATFORM_EMAIL_UNSUBSCRIBE_PURPOSE,
      granted: false,
      email: { in: recipients.map((row) => row.email.toLowerCase()) },
    },
    select: { email: true },
  });
  const optedOut = new Set(unsubscribed.map((row) => row.email.toLowerCase()));

  const dedupeSince = new Date(Date.now() - POST_EVENT_DEDUPE_MS);
  const recent = await prisma.emailMessage.findMany({
    where: {
      organisationId: input.organisationId,
      eventId: input.eventId,
      toEmail: { in: recipients.map((row) => row.email) },
      subject,
      status: { in: ["QUEUED", "SENT", "DELIVERED", "OPENED"] },
      createdAt: { gte: dedupeSince },
      campaign: { kind: "POST_EVENT" },
    },
    select: { toEmail: true },
  });
  const recentlyEmailed = new Set(
    recent.map((row) => row.toEmail.toLowerCase()),
  );

  const eligible = recipients.filter((row) => {
    const email = row.email.toLowerCase();
    return !optedOut.has(email) && !recentlyEmailed.has(email);
  });
  const skippedCount =
    recipients.length - eligible.length;

  const mail = await loadEventMailSnapshot(
    input.organisationId,
    input.eventId,
  );

  const href = input.pollId
    ? `${getAppUrl()}/me/events/${input.eventId}/polls/${input.pollId}`
    : `${getAppUrl()}/me/events/${input.eventId}`;
  const ctaLabel = input.pollId ? "Open feedback poll" : "Open event app";

  const campaign = await prisma.emailCampaign.create({
    data: {
      organisationId: input.organisationId,
      eventId: input.eventId,
      name:
        input.campaignName ??
        `Post-event follow-up · ${input.eventName}`,
      kind: "POST_EVENT",
      status: eligible.length > 0 ? "QUEUED" : "SENT",
      subject,
      body,
      audience: toPostEventAudienceEnum(input.audience),
      categoryIds: input.categoryIds,
      queuedCount: eligible.length,
      skippedCount,
      createdById: input.createdById,
      scheduledAt: new Date(),
      sentAt: eligible.length > 0 ? null : new Date(),
    },
  });

  if (eligible.length === 0) {
    return {
      campaignId: campaign.id,
      queued: 0,
      skipped: skippedCount,
      candidates: recipients.length,
    };
  }

  const messages = await Promise.all(
    eligible.map(async (attendee) => {
      const message = await createQueuedMessage({
        organisationId: input.organisationId,
        eventId: input.eventId,
        campaignId: campaign.id,
        toEmail: attendee.email,
        subject,
        dedupeKey: postEventDedupeKey({
          campaignId: campaign.id,
          toEmail: attendee.email,
        }),
      });
      if (!message) return null;
      return {
        messageId: message.id,
        organisationId: input.organisationId,
        eventId: input.eventId,
        campaignId: campaign.id,
        toEmail: attendee.email,
        toName: `${attendee.firstName} ${attendee.lastName}`,
        eventName: input.eventName,
        orgName: input.orgName,
        subject,
        body,
        href,
        ctaLabel,
        throttleKey: POST_EVENT_THROTTLE_KEY,
        mail,
      } satisfies PostEventSendEvent["data"];
    }),
  );

  const events = compactEvents(messages);
  await dispatchPostEventEmails(events);

  if (events.length > 0) {
    await prisma.emailCampaign.update({
      where: { id: campaign.id },
      data: {
        queuedCount: events.length,
        status: "SENT",
        sentAt: new Date(),
      },
    });
  }

  return {
    campaignId: campaign.id,
    queued: events.length,
    skipped: skippedCount,
    candidates: recipients.length,
  };
}

export async function listPostEventCampaigns(
  organisationId: string,
  eventId: string,
) {
  return prisma.emailCampaign.findMany({
    where: {
      organisationId,
      eventId,
      kind: "POST_EVENT",
    },
    orderBy: { createdAt: "desc" },
    take: 25,
    select: {
      id: true,
      name: true,
      subject: true,
      audience: true,
      status: true,
      queuedCount: true,
      skippedCount: true,
      sentAt: true,
      createdAt: true,
    },
  });
}
