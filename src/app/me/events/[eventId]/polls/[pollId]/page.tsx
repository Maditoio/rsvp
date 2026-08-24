import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { AuthzError } from "@/lib/db/tenant";
import { parsePollOptions } from "@/modules/polls/types";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { PollResponseForm } from "./poll-response-form";

export default async function AttendeePollDetailPage({
  params,
}: {
  params: Promise<{ eventId: string; pollId: string }>;
}) {
  const { eventId, pollId } = await params;
  const user = await safe(() => requireUser());
  const attendee = await prisma.attendee.findFirst({
    where: { eventId, userId: user.id },
    select: { id: true, organisationId: true },
  });
  if (!attendee) {
    throw new AuthzError("You are not registered for this event", 403);
  }

  const poll = await prisma.eventPoll.findFirst({
    where: {
      id: pollId,
      eventId,
      organisationId: attendee.organisationId,
      status: { in: ["PUBLISHED", "CLOSED"] },
    },
    include: {
      questions: { orderBy: { sortOrder: "asc" } },
      responses: {
        where: { attendeeId: attendee.id },
        take: 1,
        select: { id: true, submittedAt: true },
      },
    },
  });
  if (!poll) notFound();

  const existing = poll.responses[0] ?? null;
  const canRespond = poll.status === "PUBLISHED" && !existing;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/me/events/${eventId}/polls`}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          ← Polls
        </Link>
        <PageHeader
          className="mt-3"
          title={poll.title}
          description={poll.description ?? undefined}
        />
        <div className="mt-3">
          <Badge
            tone={
              existing ? "success" : poll.status === "PUBLISHED" ? "default" : "muted"
            }
          >
            {existing
              ? "Submitted"
              : poll.status === "PUBLISHED"
                ? "Open"
                : "Closed"}
          </Badge>
        </div>
      </div>

      {existing ? (
        <div className="rounded-xl bg-white px-6 py-10 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-900">
            Thanks — you’ve already responded
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Submitted{" "}
            {existing.submittedAt.toLocaleString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
            .
          </p>
        </div>
      ) : null}

      {!canRespond && !existing ? (
        <div className="rounded-xl bg-white px-6 py-10 text-center shadow-sm">
          <p className="text-sm text-slate-600">This poll is closed.</p>
        </div>
      ) : null}

      {canRespond ? (
        <PollResponseForm
          eventId={eventId}
          pollId={pollId}
          questions={poll.questions.map((q) => ({
            id: q.id,
            label: q.label,
            type: q.type,
            required: q.required,
            allowOther: q.allowOther,
            options: parsePollOptions(q.options),
          }))}
        />
      ) : null}
    </div>
  );
}
