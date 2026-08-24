"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { writeAudit } from "@/modules/audit/log";
import {
  syncMeetingCalendarsWithWarning,
  retryCalendarSyncForMeeting,
  retryAllFailedCalendarSyncs,
} from "@/modules/calendar/sync";
import { validateMeetingSlot } from "@/modules/calendar/conflicts";
import {
  pickFirstAvailableSlot,
  AutoScheduleError,
} from "@/modules/meetings/scheduler";
import {
  parseOperationsConfig,
  operationsConfigToJson,
  maxConcurrentForCategory,
  type EventOperationsConfig,
} from "@/modules/events/operations-config";
import {
  actionFail,
  actionOk,
  publicActionError,
  type ActionResult,
} from "@/lib/action-result";
import { generateOpaqueToken } from "@/lib/crypto/tokens";
import { sendMeetingRequestEmail } from "@/modules/communications/email";
import { getAppUrl, displayName } from "@/lib/utils";
import { createNotification } from "@/modules/notifications/service";
import { recomputeMatchScoresForAttendee } from "@/modules/matchmaking/score";
import type { EventAnalyticsFilters } from "@/modules/events/analytics";
import {
  loadFunnelDrillDown,
  loadRoomUtilizationTimeline,
  loadMeetingOutcomeTrends,
  loadMatchmakingRoi,
  loadCategoryMixReport,
  loadGapFinderAttendees,
} from "@/modules/events/analytics-advanced";

export type MeetingOpsResult = ActionResult<{ calendarWarning?: string }>;

async function loadOpsConfig(eventId: string): Promise<EventOperationsConfig> {
  const settings = await prisma.eventSettings.findUnique({
    where: { eventId },
    select: { operationsConfig: true },
  });
  return parseOperationsConfig(settings?.operationsConfig);
}

async function checkCategoryMeetingCap(
  eventId: string,
  attendeeIds: string[],
  config: EventOperationsConfig,
  excludeMeetingId?: string,
) {
  for (const attendeeId of attendeeIds) {
    const attendee = await prisma.attendee.findFirst({
      where: { id: attendeeId, eventId },
      select: { categoryId: true },
    });
    const max = maxConcurrentForCategory(config, attendee?.categoryId);
    if (!max) continue;

    const concurrent = await prisma.meeting.count({
      where: {
        eventId,
        status: "SCHEDULED",
        startsAt: { not: null },
        ...(excludeMeetingId ? { id: { not: excludeMeetingId } } : {}),
        participants: { some: { attendeeId } },
      },
    });
    if (concurrent >= max) {
      throw new Error(
        `Category meeting cap reached (${max} concurrent) for one of the participants.`,
      );
    }
  }
}

export async function retryMeetingCalendarSync(
  orgSlug: string,
  eventId: string,
  formData: FormData,
): Promise<MeetingOpsResult> {
  const ctx = await requireEvent(orgSlug, eventId, "event.update");
  const meetingId = z.string().min(1).parse(String(formData.get("meetingId") ?? ""));

  const meeting = await prisma.meeting.findFirst({
    where: { id: meetingId, eventId, organisationId: ctx.organisation.id },
  });
  if (!meeting?.startsAt || !meeting.endsAt) {
    return actionFail("Meeting must be scheduled before calendar sync.");
  }

  const result = await retryCalendarSyncForMeeting(meetingId);
  await writeAudit({
    organisationId: ctx.organisation.id,
    eventId,
    userId: ctx.user.id,
    action: "meeting.calendar_retry",
    resource: "meeting",
    resourceId: meetingId,
    metadata: { synced: result.synced, skipped: result.skipped },
  });
  revalidatePath(`/app/${orgSlug}/events/${eventId}/meetings`);
  return actionOk({
    calendarWarning: result.warnings.length > 0 ? result.warnings.join(" ") : undefined,
  });
}

export async function retryAllCalendarSyncs(orgSlug: string, eventId: string) {
  const ctx = await requireEvent(orgSlug, eventId, "event.update");
  const result = await retryAllFailedCalendarSyncs(ctx.organisation.id, eventId);
  await writeAudit({
    organisationId: ctx.organisation.id,
    eventId,
    userId: ctx.user.id,
    action: "meeting.calendar_retry_all",
    resource: "meeting",
    metadata: result,
  });
  revalidatePath(`/app/${orgSlug}/events/${eventId}/meetings`);
  return result;
}

export async function organiserBookMeeting(
  orgSlug: string,
  eventId: string,
  formData: FormData,
): Promise<MeetingOpsResult> {
  const ctx = await requireEvent(orgSlug, eventId, "event.update");
  const attendeeIdA = z.string().min(1).parse(String(formData.get("attendeeIdA") ?? ""));
  const attendeeIdB = z.string().min(1).parse(String(formData.get("attendeeIdB") ?? ""));
  const autoSchedule = String(formData.get("autoSchedule") ?? "") === "on";
  const roomId = String(formData.get("roomId") ?? "").trim() || null;
  const startsAtRaw = String(formData.get("startsAt") ?? "").trim();
  const endsAtRaw = String(formData.get("endsAt") ?? "").trim();

  if (attendeeIdA === attendeeIdB) {
    return actionFail("Select two different attendees.");
  }

  const [a, b] = await Promise.all([
    prisma.attendee.findFirst({
      where: { id: attendeeIdA, eventId, organisationId: ctx.organisation.id },
    }),
    prisma.attendee.findFirst({
      where: { id: attendeeIdB, eventId, organisationId: ctx.organisation.id },
    }),
  ]);
  if (!a || !b) return actionFail("Attendee not found.");

  const opsConfig = await loadOpsConfig(eventId);
  await checkCategoryMeetingCap(eventId, [attendeeIdA, attendeeIdB], opsConfig);

  let resolvedStartsAt: Date | null = startsAtRaw ? new Date(startsAtRaw) : null;
  let resolvedEndsAt: Date | null = endsAtRaw ? new Date(endsAtRaw) : null;
  let resolvedRoomId = roomId;

  if (autoSchedule || (!resolvedStartsAt && !resolvedEndsAt)) {
    try {
      const slot = await pickFirstAvailableSlot(eventId, attendeeIdA, attendeeIdB);
      resolvedStartsAt = slot.startsAt;
      resolvedEndsAt = slot.endsAt;
      resolvedRoomId = slot.roomId;
    } catch (error) {
      if (error instanceof AutoScheduleError) return actionFail(error.message);
      return actionFail("Could not auto-schedule this meeting.");
    }
  } else if (resolvedStartsAt && resolvedEndsAt) {
    await validateMeetingSlot(
      eventId,
      [attendeeIdA, attendeeIdB],
      resolvedStartsAt,
      resolvedEndsAt,
      { roomId: resolvedRoomId },
    );
  }

  const meeting = await prisma.$transaction(async (tx) => {
    const request = await tx.meetingRequest.create({
      data: {
        organisationId: ctx.organisation.id,
        eventId,
        requesterId: attendeeIdA,
        targetId: attendeeIdB,
        status: "ACCEPTED",
        message: "Booked on your behalf by event staff.",
      },
    });
    const m = await tx.meeting.create({
      data: {
        organisationId: ctx.organisation.id,
        eventId,
        roomId: resolvedRoomId,
        startsAt: resolvedStartsAt,
        endsAt: resolvedEndsAt,
        status: "SCHEDULED",
      },
    });
    await tx.meetingParticipant.createMany({
      data: [
        {
          organisationId: ctx.organisation.id,
          eventId,
          meetingId: m.id,
          attendeeId: attendeeIdA,
        },
        {
          organisationId: ctx.organisation.id,
          eventId,
          meetingId: m.id,
          attendeeId: attendeeIdB,
        },
      ],
    });
    return { meeting: m, requestId: request.id };
  });

  let calendarWarning: string | undefined;
  if (resolvedStartsAt && resolvedEndsAt) {
    calendarWarning = await syncMeetingCalendarsWithWarning(meeting.meeting.id);
  }

  await Promise.all([
    recomputeMatchScoresForAttendee(eventId, attendeeIdA),
    recomputeMatchScoresForAttendee(eventId, attendeeIdB),
  ]);

  await writeAudit({
    organisationId: ctx.organisation.id,
    eventId,
    userId: ctx.user.id,
    action: "meeting.organiser_book",
    resource: "meeting",
    resourceId: meeting.meeting.id,
    metadata: { attendeeIdA, attendeeIdB, autoSchedule },
  });

  revalidatePath(`/app/${orgSlug}/events/${eventId}/meetings`);
  return actionOk({ calendarWarning });
}

export async function moderateMeetingRequest(
  orgSlug: string,
  eventId: string,
  formData: FormData,
): Promise<MeetingOpsResult> {
  const ctx = await requireEvent(orgSlug, eventId, "event.update");
  const requestId = z.string().min(1).parse(String(formData.get("requestId") ?? ""));
  const decision = z.enum(["approve", "decline", "approve_schedule"]).parse(
    String(formData.get("decision") ?? ""),
  );

  const request = await prisma.meetingRequest.findFirst({
    where: {
      id: requestId,
      eventId,
      organisationId: ctx.organisation.id,
      status: "PENDING",
    },
    include: {
      requester: true,
      target: { include: { event: { select: { name: true } } } },
    },
  });
  if (!request) return actionFail("Request not found or already handled.");

  if (decision === "decline") {
    await prisma.meetingRequest.update({
      where: { id: request.id },
      data: { status: "DECLINED", responseTokenHash: null },
    });
    await writeAudit({
      organisationId: ctx.organisation.id,
      eventId,
      userId: ctx.user.id,
      action: "meeting.request.moderate_decline",
      resource: "meeting_request",
      resourceId: request.id,
    });
    revalidatePath(`/app/${orgSlug}/events/${eventId}/meetings`);
    return actionOk({});
  }

  if (decision === "approve") {
    const responseToken = generateOpaqueToken();
    await prisma.meetingRequest.update({
      where: { id: request.id },
      data: { responseTokenHash: responseToken.hash },
    });

    const appUrl = getAppUrl();
    try {
      await sendMeetingRequestEmail({
        organisationId: ctx.organisation.id,
        eventId,
        toEmail: request.target.email,
        toName: displayName(request.target),
        eventName: request.target.event.name,
        requesterName: displayName(request.requester),
        requesterCompany: request.requester.company,
        requesterJobTitle: request.requester.jobTitle,
        message: request.message,
        acceptUrl: `${appUrl}/m/${responseToken.raw}?decision=accept`,
        declineUrl: `${appUrl}/m/${responseToken.raw}?decision=decline`,
        inAppUrl: `${appUrl}/me/events/${eventId}/meetings`,
      });
    } catch {
      return actionFail("Could not notify the target attendee.");
    }

    if (request.target.userId) {
      await createNotification({
        organisationId: ctx.organisation.id,
        eventId,
        userId: request.target.userId,
        title: "New connection request",
        body: `${displayName(request.requester)} would like to connect.`,
      });
    }

    await writeAudit({
      organisationId: ctx.organisation.id,
      eventId,
      userId: ctx.user.id,
      action: "meeting.request.moderate_approve",
      resource: "meeting_request",
      resourceId: request.id,
    });
    revalidatePath(`/app/${orgSlug}/events/${eventId}/meetings`);
    return actionOk({});
  }

  const opsConfig = await loadOpsConfig(eventId);
  await checkCategoryMeetingCap(eventId, [request.requesterId, request.targetId], opsConfig);

  let slot: Awaited<ReturnType<typeof pickFirstAvailableSlot>> | null = null;
  try {
    slot = await pickFirstAvailableSlot(
      eventId,
      request.requesterId,
      request.targetId,
    );
  } catch (error) {
    if (error instanceof AutoScheduleError) return actionFail(error.message);
    return actionFail("Could not schedule this meeting.");
  }

  const meeting = await prisma.$transaction(async (tx) => {
    await tx.meetingRequest.update({
      where: { id: request.id },
      data: { status: "ACCEPTED", responseTokenHash: null },
    });
    const m = await tx.meeting.create({
      data: {
        organisationId: ctx.organisation.id,
        eventId,
        roomId: slot!.roomId,
        startsAt: slot!.startsAt,
        endsAt: slot!.endsAt,
        status: "SCHEDULED",
      },
    });
    await tx.meetingParticipant.createMany({
      data: [
        {
          organisationId: ctx.organisation.id,
          eventId,
          meetingId: m.id,
          attendeeId: request.requesterId,
        },
        {
          organisationId: ctx.organisation.id,
          eventId,
          meetingId: m.id,
          attendeeId: request.targetId,
        },
      ],
    });
    return m;
  });

  const calendarWarning = await syncMeetingCalendarsWithWarning(meeting.id);

  await writeAudit({
    organisationId: ctx.organisation.id,
    eventId,
    userId: ctx.user.id,
    action: "meeting.request.moderate_schedule",
    resource: "meeting_request",
    resourceId: request.id,
    metadata: { meetingId: meeting.id },
  });

  revalidatePath(`/app/${orgSlug}/events/${eventId}/meetings`);
  return actionOk({ calendarWarning });
}

export async function setAttendeeMatchmakingPaused(
  orgSlug: string,
  eventId: string,
  formData: FormData,
) {
  const ctx = await requireEvent(orgSlug, eventId, "event.update");
  const attendeeId = z.string().min(1).parse(String(formData.get("attendeeId") ?? ""));
  const paused = String(formData.get("paused") ?? "") === "true";

  const attendee = await prisma.attendee.findFirst({
    where: { id: attendeeId, eventId, organisationId: ctx.organisation.id },
    select: { id: true },
  });
  if (!attendee) throw new Error("Attendee not found");

  await prisma.attendeePrivacy.upsert({
    where: { attendeeId },
    create: {
      organisationId: ctx.organisation.id,
      eventId,
      attendeeId,
      matchmakingPaused: paused,
    },
    update: { matchmakingPaused: paused },
  });

  await writeAudit({
    organisationId: ctx.organisation.id,
    eventId,
    userId: ctx.user.id,
    action: paused ? "matchmaking.pause" : "matchmaking.unpause",
    resource: "attendee",
    resourceId: attendeeId,
  });

  revalidatePath(`/app/${orgSlug}/events/${eventId}/meetings`);
  revalidatePath(`/app/${orgSlug}/events/${eventId}/analytics`);
}

export async function markMeetingNoShow(
  orgSlug: string,
  eventId: string,
  formData: FormData,
): Promise<MeetingOpsResult> {
  const ctx = await requireEvent(orgSlug, eventId, "event.update");
  const meetingId = z.string().min(1).parse(String(formData.get("meetingId") ?? ""));
  const freeSlot = String(formData.get("freeSlot") ?? "") === "on";

  const meeting = await prisma.meeting.findFirst({
    where: { id: meetingId, eventId, organisationId: ctx.organisation.id },
  });
  if (!meeting) return actionFail("Meeting not found.");

  await prisma.meeting.update({
    where: { id: meetingId },
    data: {
      status: freeSlot ? "CANCELLED" : "NO_SHOW",
      ...(freeSlot ? { startsAt: null, endsAt: null, roomId: null } : {}),
    },
  });

  await writeAudit({
    organisationId: ctx.organisation.id,
    eventId,
    userId: ctx.user.id,
    action: "meeting.no_show",
    resource: "meeting",
    resourceId: meetingId,
    metadata: { freeSlot },
  });

  revalidatePath(`/app/${orgSlug}/events/${eventId}/meetings`);
  revalidatePath(`/app/${orgSlug}/events/${eventId}/day`);
  return actionOk({});
}

export async function preSchedulePairing(
  orgSlug: string,
  eventId: string,
  formData: FormData,
): Promise<MeetingOpsResult> {
  const attendeeIdA = z.string().min(1).parse(String(formData.get("subjectId") ?? ""));
  const attendeeIdB = z.string().min(1).parse(String(formData.get("candidateId") ?? ""));
  const bookForm = new FormData();
  bookForm.set("attendeeIdA", attendeeIdA);
  bookForm.set("attendeeIdB", attendeeIdB);
  bookForm.set("autoSchedule", "on");
  return organiserBookMeeting(orgSlug, eventId, bookForm);
}

export async function updateOperationsConfig(
  orgSlug: string,
  eventId: string,
  formData: FormData,
) {
  const ctx = await requireEvent(orgSlug, eventId, "event.update");
  const current = await loadOpsConfig(eventId);

  const categoryRulesRaw = String(formData.get("categoryRulesJson") ?? "").trim();
  let categoryRules = current.categoryRules;
  if (categoryRulesRaw) {
    try {
      categoryRules = JSON.parse(categoryRulesRaw);
    } catch {
      throw new Error("Invalid category rules JSON.");
    }
  }

  const capsRaw = String(formData.get("meetingCapsJson") ?? "").trim();
  let meetingCapsByCategory = current.meetingCapsByCategory;
  if (capsRaw) {
    try {
      meetingCapsByCategory = JSON.parse(capsRaw);
    } catch {
      throw new Error("Invalid meeting caps JSON.");
    }
  }

  const profilesThresholdRaw = String(formData.get("batchProfilesThreshold") ?? "").trim();
  const profilesThreshold = profilesThresholdRaw
    ? Number(profilesThresholdRaw)
    : null;

  const config: EventOperationsConfig = {
    requestModerationEnabled: formData.get("requestModerationEnabled") === "on",
    categoryRules,
    meetingCapsByCategory,
    batchTriggers: {
      profilesThreshold:
        profilesThreshold && profilesThreshold > 0 ? profilesThreshold : null,
      dailyPreEvent: formData.get("batchDailyPreEvent") === "on",
      lastTriggeredAt: current.batchTriggers.lastTriggeredAt,
    },
    meetingReminders: {
      enabled24h: formData.get("reminder24h") === "on",
      enabled30min: formData.get("reminder30min") === "on",
    },
    postMeetingFollowUp: {
      enabled: formData.get("postMeetingFollowUp") === "on",
      pollId: String(formData.get("followUpPollId") ?? "").trim() || null,
    },
  };

  await prisma.eventSettings.upsert({
    where: { eventId },
    create: {
      organisationId: ctx.organisation.id,
      eventId,
      operationsConfig: operationsConfigToJson(config),
    },
    update: { operationsConfig: operationsConfigToJson(config) },
  });

  await writeAudit({
    organisationId: ctx.organisation.id,
    eventId,
    userId: ctx.user.id,
    action: "event.operations_config.update",
    resource: "event_settings",
    resourceId: eventId,
  });

  revalidatePath(`/app/${orgSlug}/events/${eventId}/settings`);
}

function csvCell(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}

export async function exportAnalyticsSliceCsv(
  orgSlug: string,
  eventId: string,
  formData: FormData,
) {
  const ctx = await requireEvent(orgSlug, eventId, "reports.export");
  const slice = z
    .enum(["funnel", "roi", "category_mix", "gap_finder", "outcomes", "room_timeline"])
    .parse(String(formData.get("slice") ?? ""));

  const filters: EventAnalyticsFilters = {
    categoryId: String(formData.get("categoryId") ?? "").trim() || null,
    country: String(formData.get("country") ?? "").trim() || null,
    company: String(formData.get("company") ?? "").trim() || null,
  };

  let header: string[] = [];
  let rows: string[][] = [];

  switch (slice) {
    case "funnel": {
      const data = await loadFunnelDrillDown(ctx.organisation.id, eventId, filters);
      header = ["stage", "count", "rateFromSent"];
      rows = data.map((r) => [r.stage, String(r.count), String(r.rateFromSent ?? "")]);
      break;
    }
    case "roi": {
      const data = await loadMatchmakingRoi(ctx.organisation.id, eventId, filters);
      header = Object.keys(data);
      rows = [header.map((k) => String(data[k as keyof typeof data] ?? ""))];
      break;
    }
    case "category_mix": {
      const data = await loadCategoryMixReport(ctx.organisation.id, eventId);
      header = ["category", "meetings", "attendees"];
      rows = data.map((r) => [r.categoryName, String(r.meetingCount), String(r.attendeeCount)]);
      break;
    }
    case "gap_finder": {
      const data = await loadGapFinderAttendees(ctx.organisation.id, eventId);
      header = ["name", "company", "category", "profileCompletedAt"];
      rows = data.map((r) => [
        r.name,
        r.company ?? "",
        r.category ?? "",
        r.completedAt ?? "",
      ]);
      break;
    }
    case "outcomes": {
      const data = await loadMeetingOutcomeTrends(ctx.organisation.id, eventId);
      header = ["period", "accepted", "declined", "cancelled", "noShow", "completed"];
      rows = data.map((r) => [
        r.period,
        String(r.accepted),
        String(r.declined),
        String(r.cancelled),
        String(r.noShow),
        String(r.completed),
      ]);
      break;
    }
    case "room_timeline": {
      const data = await loadRoomUtilizationTimeline(ctx.organisation.id, eventId);
      header = ["hour", "usedRooms", "totalRooms", "utilizationPct"];
      rows = data.map((r) => [
        r.label,
        String(r.usedRooms),
        String(r.totalRooms),
        String(r.utilizationPct ?? ""),
      ]);
      break;
    }
  }

  await writeAudit({
    organisationId: ctx.organisation.id,
    eventId,
    userId: ctx.user.id,
    action: "analytics.export",
    resource: "analytics",
    metadata: { slice, rowCount: rows.length },
  });

  return [header.join(","), ...rows.map((r) => r.map(csvCell).join(","))].join("\n");
}
