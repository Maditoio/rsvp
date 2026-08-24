import { prisma } from "@/lib/db/prisma";
import { createNotification } from "@/modules/notifications/service";

export async function notifyAttendeesOfPoll(input: {
  organisationId: string;
  eventId: string;
  eventName: string;
  pollId: string;
  pollTitle: string;
}) {
  const attendees = await prisma.attendee.findMany({
    where: {
      organisationId: input.organisationId,
      eventId: input.eventId,
      userId: { not: null },
    },
    select: { userId: true },
  });

  const userIds = [
    ...new Set(
      attendees
        .map((row) => row.userId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  await Promise.all(
    userIds.map((userId) =>
      createNotification({
        organisationId: input.organisationId,
        eventId: input.eventId,
        userId,
        title: `New poll: ${input.pollTitle}`,
        body: `${input.eventName} wants your input. Open Polls to respond.`,
      }),
    ),
  );

  return { notified: userIds.length };
}

export async function getPollResults(input: {
  organisationId: string;
  eventId: string;
  pollId: string;
}) {
  const poll = await prisma.eventPoll.findFirst({
    where: {
      id: input.pollId,
      organisationId: input.organisationId,
      eventId: input.eventId,
    },
    include: {
      questions: { orderBy: { sortOrder: "asc" } },
      responses: {
        include: { answers: true },
      },
      _count: { select: { responses: true } },
    },
  });
  if (!poll) return null;

  const questions = poll.questions.map((question) => {
    const options = Array.isArray(question.options)
      ? (question.options as { id: string; label: string }[])
      : [];
    const optionCounts = Object.fromEntries(
      options.map((opt) => [opt.id, 0]),
    ) as Record<string, number>;
    let otherCount = 0;
    const textAnswers: string[] = [];

    for (const response of poll.responses) {
      const answer = response.answers.find((a) => a.questionId === question.id);
      if (!answer) continue;
      if (question.type === "TEXT") {
        if (answer.textValue?.trim()) textAnswers.push(answer.textValue.trim());
        continue;
      }
      const selected = Array.isArray(answer.selectedOptionIds)
        ? (answer.selectedOptionIds as string[])
        : [];
      for (const id of selected) {
        if (id in optionCounts) optionCounts[id] += 1;
      }
      if (answer.otherText?.trim()) otherCount += 1;
    }

    return {
      id: question.id,
      label: question.label,
      type: question.type,
      allowOther: question.allowOther,
      options: options.map((opt) => ({
        id: opt.id,
        label: opt.label,
        count: optionCounts[opt.id] ?? 0,
      })),
      otherCount,
      textAnswers,
    };
  });

  return {
    id: poll.id,
    title: poll.title,
    description: poll.description,
    status: poll.status,
    responseCount: poll._count.responses,
    questions,
  };
}
