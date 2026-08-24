"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { requireEvent, requireUser } from "@/lib/authz/require";
import { AuthzError } from "@/lib/db/tenant";
import { prisma } from "@/lib/db/prisma";
import { runAction } from "@/lib/action-result";
import { rateLimit } from "@/lib/rate-limit";
import { writeAudit } from "@/modules/audit/log";
import { generatePollDraft, improvePollBrief } from "./ai";
import { getPollResults, notifyAttendeesOfPoll } from "./service";
import {
  parsePollOptions,
  pollDraftSchema,
  type PollDraft,
} from "./types";

function pollsOrgPath(orgSlug: string, eventId: string) {
  return `/app/${orgSlug}/events/${eventId}/polls`;
}

function pollsMePath(eventId: string) {
  return `/me/events/${eventId}/polls`;
}

async function replacePollQuestions(input: {
  organisationId: string;
  eventId: string;
  pollId: string;
  questions: PollDraft["questions"];
}) {
  await prisma.eventPollQuestion.deleteMany({
    where: {
      pollId: input.pollId,
      organisationId: input.organisationId,
      eventId: input.eventId,
    },
  });

  if (input.questions.length === 0) return;

  await prisma.eventPollQuestion.createMany({
    data: input.questions.map((question, index) => ({
      organisationId: input.organisationId,
      eventId: input.eventId,
      pollId: input.pollId,
      label: question.label.trim(),
      type: question.type,
      required: question.required,
      allowOther: question.type === "TEXT" ? false : question.allowOther,
      options:
        question.type === "TEXT"
          ? undefined
          : (question.options as unknown as Prisma.InputJsonValue),
      sortOrder: index,
    })),
  });
}

export async function improvePollBriefAction(
  orgSlug: string,
  eventId: string,
  brief: string,
) {
  return runAction(async () => {
    const ctx = await requireEvent(orgSlug, eventId, "event.update");
    const rl = await rateLimit(`poll-ai-improve:${ctx.user.id}`, 20, 3600);
    if (!rl.success) {
      throw new Error("Rate limit reached. Try again later.");
    }

    const event = await prisma.event.findFirst({
      where: { id: eventId, organisationId: ctx.organisation.id },
      select: { name: true },
    });
    if (!event) throw new Error("Event not found");

    const result = await improvePollBrief({
      brief,
      eventName: event.name,
    });

    await writeAudit({
      organisationId: ctx.organisation.id,
      eventId,
      userId: ctx.user.id,
      action: "poll.ai_improve_brief",
      resource: "event_poll",
      metadata: { usedAi: result.usedAi },
    });

    return result;
  }, "Could not improve the description.");
}

export async function generatePollDraftAction(
  orgSlug: string,
  eventId: string,
  input: { brief: string; questionCount: number },
) {
  return runAction(async () => {
    const ctx = await requireEvent(orgSlug, eventId, "event.update");
    const rl = await rateLimit(`poll-ai-generate:${ctx.user.id}`, 15, 3600);
    if (!rl.success) {
      throw new Error("Rate limit reached. Try again later.");
    }

    const event = await prisma.event.findFirst({
      where: { id: eventId, organisationId: ctx.organisation.id },
      select: { name: true, description: true },
    });
    if (!event) throw new Error("Event not found");

    const result = await generatePollDraft({
      brief: input.brief,
      questionCount: input.questionCount,
      eventName: event.name,
      eventDescription: event.description,
    });

    await writeAudit({
      organisationId: ctx.organisation.id,
      eventId,
      userId: ctx.user.id,
      action: "poll.ai_generate",
      resource: "event_poll",
      metadata: {
        usedAi: result.usedAi,
        questionCount: input.questionCount,
      },
    });

    return result;
  }, "Could not generate a poll draft.");
}

export async function createPoll(
  orgSlug: string,
  eventId: string,
  draft: PollDraft,
) {
  return runAction(async () => {
    const ctx = await requireEvent(orgSlug, eventId, "event.update");
    const parsed = pollDraftSchema.parse(draft);

    for (const question of parsed.questions) {
      if (question.type !== "TEXT" && question.options.length < 2) {
        throw new Error("Choice questions need at least two options.");
      }
    }

    const poll = await prisma.eventPoll.create({
      data: {
        organisationId: ctx.organisation.id,
        eventId,
        title: parsed.title.trim(),
        description: parsed.description?.trim() || null,
        status: "DRAFT",
        createdByUserId: ctx.user.id,
      },
    });

    await replacePollQuestions({
      organisationId: ctx.organisation.id,
      eventId,
      pollId: poll.id,
      questions: parsed.questions,
    });

    await writeAudit({
      organisationId: ctx.organisation.id,
      eventId,
      userId: ctx.user.id,
      action: "poll.create",
      resource: "event_poll",
      resourceId: poll.id,
    });

    revalidatePath(pollsOrgPath(orgSlug, eventId));
    return { pollId: poll.id };
  }, "Could not create the poll.");
}

export async function updatePoll(
  orgSlug: string,
  eventId: string,
  pollId: string,
  draft: PollDraft,
) {
  return runAction(async () => {
    const ctx = await requireEvent(orgSlug, eventId, "event.update");
    const parsed = pollDraftSchema.parse(draft);

    const existing = await prisma.eventPoll.findFirst({
      where: {
        id: pollId,
        organisationId: ctx.organisation.id,
        eventId,
      },
    });
    if (!existing) throw new Error("Poll not found");
    if (existing.status !== "DRAFT") {
      throw new Error("Only draft polls can be edited.");
    }

    for (const question of parsed.questions) {
      if (question.type !== "TEXT" && question.options.length < 2) {
        throw new Error("Choice questions need at least two options.");
      }
    }

    await prisma.eventPoll.update({
      where: { id: pollId },
      data: {
        title: parsed.title.trim(),
        description: parsed.description?.trim() || null,
      },
    });

    await replacePollQuestions({
      organisationId: ctx.organisation.id,
      eventId,
      pollId,
      questions: parsed.questions,
    });

    await writeAudit({
      organisationId: ctx.organisation.id,
      eventId,
      userId: ctx.user.id,
      action: "poll.update",
      resource: "event_poll",
      resourceId: pollId,
    });

    revalidatePath(pollsOrgPath(orgSlug, eventId));
    revalidatePath(`${pollsOrgPath(orgSlug, eventId)}/${pollId}`);
    return { pollId };
  }, "Could not update the poll.");
}

export async function publishPoll(
  orgSlug: string,
  eventId: string,
  pollId: string,
) {
  return runAction(async () => {
    const ctx = await requireEvent(orgSlug, eventId, "event.update");
    const poll = await prisma.eventPoll.findFirst({
      where: {
        id: pollId,
        organisationId: ctx.organisation.id,
        eventId,
      },
      include: { _count: { select: { questions: true } } },
    });
    if (!poll) throw new Error("Poll not found");
    if (poll.status === "PUBLISHED") {
      return { notified: 0 };
    }
    if (poll.status === "CLOSED") {
      throw new Error("Closed polls cannot be republished.");
    }
    if (poll._count.questions < 1) {
      throw new Error("Add at least one question before publishing.");
    }

    await prisma.eventPoll.update({
      where: { id: pollId },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
        closedAt: null,
      },
    });

    const { notified } = await notifyAttendeesOfPoll({
      organisationId: ctx.organisation.id,
      eventId,
      eventName: (
        await prisma.event.findFirst({
          where: { id: eventId, organisationId: ctx.organisation.id },
          select: { name: true },
        })
      )?.name ?? "your event",
      pollId,
      pollTitle: poll.title,
    });

    await writeAudit({
      organisationId: ctx.organisation.id,
      eventId,
      userId: ctx.user.id,
      action: "poll.publish",
      resource: "event_poll",
      resourceId: pollId,
      metadata: { notified },
    });

    revalidatePath(pollsOrgPath(orgSlug, eventId));
    revalidatePath(pollsMePath(eventId));
    return { notified };
  }, "Could not publish the poll.");
}

export async function closePoll(
  orgSlug: string,
  eventId: string,
  pollId: string,
) {
  return runAction(async () => {
    const ctx = await requireEvent(orgSlug, eventId, "event.update");
    const poll = await prisma.eventPoll.findFirst({
      where: {
        id: pollId,
        organisationId: ctx.organisation.id,
        eventId,
      },
    });
    if (!poll) throw new Error("Poll not found");
    if (poll.status === "DRAFT") {
      throw new Error("Publish the poll before closing it.");
    }

    await prisma.eventPoll.update({
      where: { id: pollId },
      data: { status: "CLOSED", closedAt: new Date() },
    });

    await writeAudit({
      organisationId: ctx.organisation.id,
      eventId,
      userId: ctx.user.id,
      action: "poll.close",
      resource: "event_poll",
      resourceId: pollId,
    });

    revalidatePath(pollsOrgPath(orgSlug, eventId));
    revalidatePath(pollsMePath(eventId));
    return { pollId };
  }, "Could not close the poll.");
}

export async function deletePoll(
  orgSlug: string,
  eventId: string,
  pollId: string,
) {
  return runAction(async () => {
    const ctx = await requireEvent(orgSlug, eventId, "event.update");
    const poll = await prisma.eventPoll.findFirst({
      where: {
        id: pollId,
        organisationId: ctx.organisation.id,
        eventId,
      },
    });
    if (!poll) throw new Error("Poll not found");
    if (poll.status === "PUBLISHED") {
      throw new Error("Close the poll before deleting it.");
    }

    await prisma.eventPoll.delete({ where: { id: pollId } });

    await writeAudit({
      organisationId: ctx.organisation.id,
      eventId,
      userId: ctx.user.id,
      action: "poll.delete",
      resource: "event_poll",
      resourceId: pollId,
    });

    revalidatePath(pollsOrgPath(orgSlug, eventId));
    return { pollId };
  }, "Could not delete the poll.");
}

export async function loadPollResults(
  orgSlug: string,
  eventId: string,
  pollId: string,
) {
  return runAction(async () => {
    const ctx = await requireEvent(orgSlug, eventId, "event.read");
    const results = await getPollResults({
      organisationId: ctx.organisation.id,
      eventId,
      pollId,
    });
    if (!results) throw new Error("Poll not found");
    return results;
  }, "Could not load poll results.");
}

const submitAnswerSchema = z.object({
  questionId: z.string().min(1),
  selectedOptionIds: z.array(z.string()).optional(),
  otherText: z.string().max(500).optional().nullable(),
  textValue: z.string().max(2000).optional().nullable(),
});

export async function submitPollResponse(
  eventId: string,
  pollId: string,
  answers: z.infer<typeof submitAnswerSchema>[],
) {
  return runAction(async () => {
    const user = await requireUser();
    const attendee = await prisma.attendee.findFirst({
      where: { eventId, userId: user.id },
      include: { event: { select: { name: true, organisationId: true } } },
    });
    if (!attendee) {
      throw new AuthzError("You are not registered for this event", 403);
    }

    const rl = await rateLimit(`poll-submit:${attendee.id}`, 30, 3600);
    if (!rl.success) {
      throw new Error("Rate limit reached. Try again later.");
    }

    const poll = await prisma.eventPoll.findFirst({
      where: {
        id: pollId,
        eventId,
        organisationId: attendee.organisationId,
        status: "PUBLISHED",
      },
      include: { questions: { orderBy: { sortOrder: "asc" } } },
    });
    if (!poll) throw new Error("This poll is not open for responses.");

    const existing = await prisma.eventPollResponse.findUnique({
      where: {
        pollId_attendeeId: { pollId, attendeeId: attendee.id },
      },
    });
    if (existing) {
      throw new Error("You have already submitted this poll.");
    }

    const parsedAnswers = z.array(submitAnswerSchema).parse(answers);
    const byQuestion = new Map(parsedAnswers.map((a) => [a.questionId, a]));

    for (const question of poll.questions) {
      const answer = byQuestion.get(question.id);
      if (question.required) {
        if (question.type === "TEXT") {
          if (!answer?.textValue?.trim()) {
            throw new Error(`Please answer: ${question.label}`);
          }
        } else {
          const selected = answer?.selectedOptionIds ?? [];
          const other = answer?.otherText?.trim();
          if (selected.length === 0 && !other) {
            throw new Error(`Please answer: ${question.label}`);
          }
        }
      }
    }

    const response = await prisma.eventPollResponse.create({
      data: {
        organisationId: attendee.organisationId,
        eventId,
        pollId,
        attendeeId: attendee.id,
        userId: user.id,
        answers: {
          create: poll.questions.map((question) => {
            const answer = byQuestion.get(question.id);
            const options = parsePollOptions(question.options);
            const validIds = new Set(options.map((o) => o.id));
            const selected = (answer?.selectedOptionIds ?? []).filter((id) =>
              validIds.has(id),
            );
            return {
              organisationId: attendee.organisationId,
              eventId,
              questionId: question.id,
              selectedOptionIds:
                question.type === "TEXT"
                  ? undefined
                  : (selected as unknown as Prisma.InputJsonValue),
              otherText:
                question.type !== "TEXT" && question.allowOther
                  ? answer?.otherText?.trim() || null
                  : null,
              textValue:
                question.type === "TEXT"
                  ? answer?.textValue?.trim() || null
                  : null,
            };
          }),
        },
      },
    });

    await writeAudit({
      organisationId: attendee.organisationId,
      eventId,
      userId: user.id,
      action: "poll.submit",
      resource: "event_poll_response",
      resourceId: response.id,
      metadata: { pollId },
    });

    revalidatePath(pollsMePath(eventId));
    revalidatePath(`${pollsMePath(eventId)}/${pollId}`);
    return { responseId: response.id };
  }, "Could not submit your response.");
}

export async function getOrganiserPoll(
  orgSlug: string,
  eventId: string,
  pollId: string,
) {
  const ctx = await requireEvent(orgSlug, eventId, "event.read");
  const poll = await prisma.eventPoll.findFirst({
    where: {
      id: pollId,
      organisationId: ctx.organisation.id,
      eventId,
    },
    include: {
      questions: { orderBy: { sortOrder: "asc" } },
      _count: { select: { responses: true } },
    },
  });
  if (!poll) return null;
  return {
    ...poll,
    questions: poll.questions.map((q) => ({
      ...q,
      options: parsePollOptions(q.options),
    })),
  };
}
