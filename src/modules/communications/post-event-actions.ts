"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { writeAudit } from "@/modules/audit/log";
import { rateLimit } from "@/lib/rate-limit";
import {
  assertEventEligibleForPostEvent,
  parsePostEventAudience,
} from "@/modules/communications/post-event";
import { queuePostEventFollowUpCampaign } from "@/modules/communications/post-event-queue";

const sendSchema = z.object({
  audience: z.enum([
    "checked_in",
    "registered",
    "registered_not_checked_in",
  ]),
  subject: z.string().trim().min(1).max(180),
  body: z.string().trim().min(1).max(8000),
  categoryIds: z.array(z.string().min(1)).max(50),
  pollId: z.string().min(1).optional(),
});

export async function sendPostEventFollowUp(
  orgSlug: string,
  eventId: string,
  formData: FormData,
) {
  const ctx = await requireEvent(orgSlug, eventId, "invitations.write");

  const limited = await rateLimit(`post-event:${eventId}`, 3, 3600);
  if (!limited.success) {
    throw new Error("Post-event send limit reached. Try again later.");
  }

  const categoryIds = formData
    .getAll("categoryIds")
    .map((value) => String(value).trim())
    .filter(Boolean);

  const pollRaw = String(formData.get("pollId") ?? "").trim();
  const parsed = sendSchema.parse({
    audience: parsePostEventAudience(String(formData.get("audience") ?? "")),
    subject: String(formData.get("subject") ?? ""),
    body: String(formData.get("body") ?? ""),
    categoryIds,
    pollId: pollRaw || undefined,
  });

  const event = await prisma.event.findFirst({
    where: { id: eventId, organisationId: ctx.organisation.id },
    select: {
      id: true,
      name: true,
      startsAt: true,
      endsAt: true,
    },
  });
  if (!event) throw new Error("Event not found");

  assertEventEligibleForPostEvent({
    startsAt: event.startsAt,
    endsAt: event.endsAt,
  });

  if (parsed.categoryIds.length > 0) {
    const categories = await prisma.invitationCategory.findMany({
      where: {
        organisationId: ctx.organisation.id,
        eventId,
        id: { in: parsed.categoryIds },
      },
      select: { id: true },
    });
    if (categories.length !== parsed.categoryIds.length) {
      throw new Error("One or more categories are invalid for this event.");
    }
  }

  if (parsed.pollId) {
    const poll = await prisma.eventPoll.findFirst({
      where: {
        id: parsed.pollId,
        organisationId: ctx.organisation.id,
        eventId,
      },
      select: { id: true },
    });
    if (!poll) throw new Error("Selected poll was not found for this event.");
  }

  const result = await queuePostEventFollowUpCampaign({
    organisationId: ctx.organisation.id,
    eventId,
    eventName: event.name,
    orgName: ctx.organisation.name,
    createdById: ctx.user.id,
    audience: parsed.audience,
    subject: parsed.subject,
    body: parsed.body,
    categoryIds: parsed.categoryIds,
    pollId: parsed.pollId ?? null,
  });

  await writeAudit({
    organisationId: ctx.organisation.id,
    eventId,
    userId: ctx.user.id,
    action: "communications.post_event",
    resource: "email_campaign",
    resourceId: result.campaignId,
    metadata: {
      audience: parsed.audience,
      queued: result.queued,
      skipped: result.skipped,
      candidates: result.candidates,
      categoryIds: parsed.categoryIds,
      pollId: parsed.pollId ?? null,
      subject: parsed.subject,
    },
  });

  revalidatePath(`/app/${orgSlug}/events/${eventId}/communications`);
  return result;
}
