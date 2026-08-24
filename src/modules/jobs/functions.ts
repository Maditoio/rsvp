import { inngest } from "@/modules/jobs/client";
import { sendInvitationEmail } from "@/modules/communications/email";
import { runAllEnabledAutomations } from "@/modules/communications/automations";
import {
  runMeetingReminders,
  runUnscheduledMeetingNudges,
  runPostMeetingFollowUps,
  checkSmartBatchTriggers,
} from "@/modules/communications/meeting-reminders";
import { runMatchmakingPipeline } from "@/modules/matchmaking/batch";
import { prisma } from "@/lib/db/prisma";

type InvitationSendEvent = {
  name: "invitation/send";
  data: {
    organisationId: string;
    eventId: string;
    invitationId: string;
    toEmail: string;
    toName: string;
    eventName: string;
    acceptUrl: string;
    orgName: string;
  };
};

type MatchmakingBatchEvent = {
  name: "matchmaking/batch";
  data: {
    organisationId: string;
    eventId: string;
  };
};

export const sendInvitationJob = inngest.createFunction(
  {
    id: "invitation-send",
    retries: 4,
    triggers: [{ event: "invitation/send" }],
  },
  async ({ event }: { event: InvitationSendEvent }) => {
    await sendInvitationEmail(event.data);
    return { ok: true };
  },
);

export const communicationAutomationsJob = inngest.createFunction(
  {
    id: "communication-automations-daily",
    retries: 2,
    triggers: [{ cron: "0 8 * * *" }],
  },
  async () => {
    const result = await runAllEnabledAutomations();
    return result;
  },
);

export const matchmakingBatchJob = inngest.createFunction(
  {
    id: "matchmaking-batch",
    retries: 2,
    triggers: [{ event: "matchmaking/batch" }],
  },
  async ({ event }: { event: MatchmakingBatchEvent }) => {
    const settings = await prisma.eventSettings.findUnique({
      where: { eventId: event.data.eventId },
      select: { aiInsightsEnabled: true },
    });
    if (!settings?.aiInsightsEnabled) {
      return { skipped: true, reason: "AI insights disabled" };
    }
    const result = await runMatchmakingPipeline(
      event.data.eventId,
      event.data.organisationId,
    );
    return result;
  },
);

export const meetingRemindersJob = inngest.createFunction(
  {
    id: "meeting-reminders",
    retries: 2,
    triggers: [{ cron: "*/15 * * * *" }],
  },
  async () => {
    const reminders = await runMeetingReminders();
    const followUps = await runPostMeetingFollowUps();
    return { ...reminders, followUps: followUps.sent };
  },
);

export const unscheduledNudgeJob = inngest.createFunction(
  {
    id: "unscheduled-meeting-nudge",
    retries: 2,
    triggers: [{ cron: "0 9 * * *" }],
  },
  async () => runUnscheduledMeetingNudges(),
);

export const smartBatchTriggerJob = inngest.createFunction(
  {
    id: "smart-batch-triggers",
    retries: 2,
    triggers: [{ cron: "0 6 * * *" }],
  },
  async () => checkSmartBatchTriggers(),
);

export const functions = [
  sendInvitationJob,
  communicationAutomationsJob,
  matchmakingBatchJob,
  meetingRemindersJob,
  unscheduledNudgeJob,
  smartBatchTriggerJob,
];

export type { InvitationSendEvent, MatchmakingBatchEvent };
