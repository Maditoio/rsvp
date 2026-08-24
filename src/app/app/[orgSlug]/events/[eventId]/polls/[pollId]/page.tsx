import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { hasPermission } from "@/lib/authz/permissions";
import { getPollResults } from "@/modules/polls/service";
import { parsePollOptions } from "@/modules/polls/types";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { PollDetailActions } from "./poll-detail-actions";

export default async function EventPollDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; eventId: string; pollId: string }>;
}) {
  const { orgSlug, eventId, pollId } = await params;
  const ctx = await safe(() => requireEvent(orgSlug, eventId, "event.read"));
  const canManage = hasPermission(ctx.grants, "event.update");

  const poll = await prisma.eventPoll.findFirst({
    where: {
      id: pollId,
      eventId,
      organisationId: ctx.organisation.id,
    },
    include: {
      questions: { orderBy: { sortOrder: "asc" } },
      _count: { select: { responses: true } },
    },
  });
  if (!poll) notFound();

  const results =
    poll.status === "DRAFT"
      ? null
      : await getPollResults({
          organisationId: ctx.organisation.id,
          eventId,
          pollId,
        });

  const statusTone =
    poll.status === "PUBLISHED"
      ? "success"
      : poll.status === "CLOSED"
        ? "muted"
        : "warning";
  const statusLabel =
    poll.status === "PUBLISHED"
      ? "Live"
      : poll.status === "CLOSED"
        ? "Closed"
        : "Draft";

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/app/${orgSlug}/events/${eventId}/polls`}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          ← Polls
        </Link>
        <PageHeader
          className="mt-3"
          title={poll.title}
          description={poll.description ?? undefined}
          actions={
            canManage ? (
              <PollDetailActions
                orgSlug={orgSlug}
                eventId={eventId}
                poll={{
                  id: poll.id,
                  title: poll.title,
                  description: poll.description,
                  status: poll.status,
                  questions: poll.questions.map((q) => ({
                    clientId: q.id,
                    label: q.label,
                    type: q.type,
                    required: q.required,
                    allowOther: q.allowOther,
                    options: parsePollOptions(q.options),
                  })),
                }}
              />
            ) : undefined
          }
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge tone={statusTone}>{statusLabel}</Badge>
          <span className="text-sm text-slate-500">
            {poll._count.responses} response
            {poll._count.responses === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {poll.status === "DRAFT" ? (
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Draft questions</p>
          <ul className="mt-4 space-y-3">
            {poll.questions.map((q, index) => (
              <li key={q.id} className="text-sm text-slate-700">
                <span className="font-medium text-slate-900">
                  {index + 1}. {q.label}
                </span>
                <span className="ml-2 text-slate-400">
                  {q.type === "SINGLE"
                    ? "Single choice"
                    : q.type === "MULTI"
                      ? "Multiple choice"
                      : "Free text"}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-slate-500">
            Publish when ready — attendees will be notified in-app.
          </p>
        </div>
      ) : null}

      {results ? (
        <div className="space-y-4">
          {results.questions.map((question, index) => (
            <section
              key={question.id}
              className="rounded-xl bg-white p-5 shadow-sm"
            >
              <p className="text-label text-slate-400">Question {index + 1}</p>
              <h2 className="mt-1 text-sm font-semibold text-slate-900">
                {question.label}
              </h2>

              {question.type === "TEXT" ? (
                <ul className="mt-4 space-y-2">
                  {question.textAnswers.length === 0 ? (
                    <li className="text-sm text-slate-500">No text answers yet.</li>
                  ) : (
                    question.textAnswers.map((text, i) => (
                      <li
                        key={`${question.id}-${i}`}
                        className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700"
                      >
                        {text}
                      </li>
                    ))
                  )}
                </ul>
              ) : (
                <ul className="mt-4 space-y-2">
                  {question.options.map((opt) => {
                    const pct =
                      results.responseCount === 0
                        ? 0
                        : Math.round((opt.count / results.responseCount) * 100);
                    return (
                      <li key={opt.id}>
                        <div className="mb-1 flex justify-between gap-3 text-sm">
                          <span className="text-slate-700">{opt.label}</span>
                          <span className="tabular-nums text-slate-500">
                            {opt.count} · {pct}%
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-indigo-600"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                  {question.allowOther ? (
                    <li className="pt-1 text-sm text-slate-500">
                      Other: {question.otherCount}
                    </li>
                  ) : null}
                </ul>
              )}
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}
