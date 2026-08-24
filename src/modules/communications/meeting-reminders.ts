import { prisma } from "@/lib/db/prisma";
import { parseQuestionnaire } from "@/modules/matchmaking/score";
import { parseOperationsConfig } from "@/modules/events/operations-config";
import {
  sendMeetingReminderEmail,
  sendUnscheduledMeetingNudgeEmail,
  sendPostMeetingFollowUpEmail,
} from "@/modules/communications/email";
import { getAppUrl, displayName } from "@/lib/utils";
import { writeAudit } from "@/modules/audit/log";
import { inngest } from "@/modules/jobs/client";

const REMINDER_24H_MS = 24 * 60 * 60 * 1000;
const REMINDER_30M_MS = 30 * 60 * 1000;
const FOLLOWUP_AFTER_MS = 15 * 60 * 1000;

export async function runMeetingReminders(): Promise<{ sent: number }> {
  const now = Date.now();
  let sent = 0;

  const events = await prisma.event.findMany({
    where: { startsAt: { not: null }, endsAt: { gte: new Date(now - REMINDER_24H_MS) } },
    include: {
      settings: { select: { operationsConfig: true, automationsEnabled: true } },
      organisation: { select: { name: true } },
    },
  });

  for (const event of events) {
    if (event.settings?.automationsEnabled === false) continue;
    const ops = parseOperationsConfig(event.settings?.operationsConfig);
    if (!ops.meetingReminders.enabled24h && !ops.meetingReminders.enabled30min) continue;

    const window24Start = new Date(now + REMINDER_24H_MS - 15 * 60 * 1000);
    const window24End = new Date(now + REMINDER_24H_MS + 15 * 60 * 1000);
    const window30Start = new Date(now + REMINDER_30M_MS - 5 * 60 * 1000);
    const window30End = new Date(now + REMINDER_30M_MS + 5 * 60 * 1000);

    const meetings = await prisma.meeting.findMany({
      where: {
        eventId: event.id,
        organisationId: event.organisationId,
        status: "SCHEDULED",
        startsAt: { not: null },
      },
      include: {
        room: { select: { name: true } },
        participants: { include: { attendee: true } },
      },
    });

    for (const meeting of meetings) {
      if (!meeting.startsAt) continue;
      const t = meeting.startsAt.getTime();
      const is24h = t >= window24Start.getTime() && t <= window24End.getTime();
      const is30m = t >= window30Start.getTime() && t <= window30End.getTime();
      if (!is24h && !is30m) continue;
      if (is24h && !ops.meetingReminders.enabled24h) continue;
      if (is30m && !ops.meetingReminders.enabled30min) continue;

      const kind = is30m ? "30min" : "24h";
      for (const part of meeting.participants) {
        const subject =
          kind === "30min"
            ? `Meeting in 30 minutes — ${event.name}`
            : `Meeting tomorrow — ${event.name}`;

        const recent = await prisma.emailMessage.findFirst({
          where: {
            organisationId: event.organisationId,
            eventId: event.id,
            toEmail: part.attendee.email,
            subject,
            createdAt: { gte: new Date(now - 60 * 60 * 1000) },
          },
        });
        if (recent) continue;

        await sendMeetingReminderEmail({
          organisationId: event.organisationId,
          eventId: event.id,
          toEmail: part.attendee.email,
          toName: displayName(part.attendee),
          eventName: event.name,
          when: meeting.startsAt.toLocaleString("en-GB"),
          room: meeting.room?.name ?? null,
          href: `${getAppUrl()}/me/events/${event.id}/meetings`,
          kind,
        });
        sent += 1;
      }
    }
  }

  if (sent > 0) {
    await writeAudit({
      action: "communications.meeting_reminders",
      resource: "email",
      metadata: { sent },
    }).catch(() => undefined);
  }

  return { sent };
}

export async function runUnscheduledMeetingNudges(): Promise<{ sent: number }> {
  let sent = 0;

  const meetings = await prisma.meeting.findMany({
    where: {
      status: "SCHEDULED",
      startsAt: null,
    },
    include: {
      event: { select: { name: true, organisationId: true, id: true } },
      participants: { include: { attendee: true } },
    },
  });

  for (const meeting of meetings) {
    for (const part of meeting.participants) {
      const recent = await prisma.emailMessage.findFirst({
        where: {
          organisationId: meeting.organisationId,
          eventId: meeting.eventId,
          toEmail: part.attendee.email,
          subject: { contains: "Unscheduled meeting" },
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      });
      if (recent) continue;

      await sendUnscheduledMeetingNudgeEmail({
        organisationId: meeting.organisationId,
        eventId: meeting.eventId,
        toEmail: part.attendee.email,
        toName: displayName(part.attendee),
        eventName: meeting.event.name,
        href: `${getAppUrl()}/me/events/${meeting.eventId}/meetings`,
      });
      sent += 1;
    }
  }

  return { sent };
}

export async function runPostMeetingFollowUps(): Promise<{ sent: number }> {
  let sent = 0;
  const now = Date.now();

  const events = await prisma.event.findMany({
    include: { settings: { select: { operationsConfig: true } } },
  });

  for (const event of events) {
    const ops = parseOperationsConfig(event.settings?.operationsConfig);
    if (!ops.postMeetingFollowUp.enabled) continue;

    const endedSince = new Date(now - FOLLOWUP_AFTER_MS - 30 * 60 * 1000);
    const endedUntil = new Date(now - FOLLOWUP_AFTER_MS);

    const meetings = await prisma.meeting.findMany({
      where: {
        eventId: event.id,
        organisationId: event.organisationId,
        status: { in: ["SCHEDULED", "COMPLETED"] },
        endsAt: { gte: endedSince, lte: endedUntil },
      },
      include: { participants: { include: { attendee: true } } },
    });

    const pollHref = ops.postMeetingFollowUp.pollId
      ? `${getAppUrl()}/me/events/${event.id}/polls/${ops.postMeetingFollowUp.pollId}`
      : `${getAppUrl()}/me/events/${event.id}/polls`;

    for (const meeting of meetings) {
      for (const part of meeting.participants) {
        const recent = await prisma.emailMessage.findFirst({
          where: {
            organisationId: event.organisationId,
            eventId: event.id,
            toEmail: part.attendee.email,
            subject: { contains: "How was your meeting" },
            createdAt: { gte: endedSince },
          },
        });
        if (recent) continue;

        await sendPostMeetingFollowUpEmail({
          organisationId: event.organisationId,
          eventId: event.id,
          toEmail: part.attendee.email,
          toName: displayName(part.attendee),
          eventName: event.name,
          href: pollHref,
        });
        sent += 1;
      }
    }
  }

  return { sent };
}

export async function checkSmartBatchTriggers(): Promise<{ triggered: number }> {
  let triggered = 0;

  const events = await prisma.event.findMany({
    where: { settings: { aiInsightsEnabled: true } },
    include: { settings: true },
  });

  for (const event of events) {
    const ops = parseOperationsConfig(event.settings?.operationsConfig);
    const threshold = ops.batchTriggers.profilesThreshold;
    const daily = ops.batchTriggers.dailyPreEvent;

    let shouldRun = false;

    if (threshold && threshold > 0) {
      const profiles = await prisma.matchmakingProfile.findMany({
        where: { eventId: event.id, organisationId: event.organisationId },
        select: { questionnaire: true },
      });
      const completed = profiles.filter((row) =>
        Boolean(parseQuestionnaire(row.questionnaire).completedAt),
      ).length;
      if (completed >= threshold) {
        const last = ops.batchTriggers.lastTriggeredAt
          ? new Date(ops.batchTriggers.lastTriggeredAt).getTime()
          : 0;
        if (Date.now() - last > 60 * 60 * 1000) shouldRun = true;
      }
    }

    if (!shouldRun && daily && event.startsAt) {
      const daysUntil = (event.startsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
      if (daysUntil >= 0 && daysUntil <= 7) shouldRun = true;
    }

    if (!shouldRun) continue;

    await inngest.send({
      name: "matchmaking/batch",
      data: { organisationId: event.organisationId, eventId: event.id },
    });

    const updated = {
      ...ops,
      batchTriggers: {
        ...ops.batchTriggers,
        lastTriggeredAt: new Date().toISOString(),
      },
    };
    await prisma.eventSettings.update({
      where: { eventId: event.id },
      data: { operationsConfig: updated as object },
    });
    triggered += 1;
  }

  return { triggered };
}
