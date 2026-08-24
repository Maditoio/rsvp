import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { hasPermission } from "@/lib/authz/permissions";
import { parsePollOptions } from "@/modules/polls/types";
import { PageHeader } from "@/components/ui/page-header";
import { NewPollButton } from "./new-poll-button";
import { PollsPanel } from "./polls-panel";

export default async function EventPollsPage({
  params,
}: {
  params: Promise<{ orgSlug: string; eventId: string }>;
}) {
  const { orgSlug, eventId } = await params;
  const ctx = await safe(() => requireEvent(orgSlug, eventId, "event.read"));
  const canManage = hasPermission(ctx.grants, "event.update");

  const polls = await prisma.eventPoll.findMany({
    where: { eventId, organisationId: ctx.organisation.id },
    include: {
      questions: { orderBy: { sortOrder: "asc" } },
      _count: { select: { responses: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Polls"
        description="Collect structured feedback from attendees. Describe what you need and Con·cierge AI can draft the questions."
        className="mb-6"
        actions={
          canManage ? (
            <NewPollButton orgSlug={orgSlug} eventId={eventId} />
          ) : undefined
        }
      />
      <PollsPanel
        orgSlug={orgSlug}
        eventId={eventId}
        canManage={canManage}
        polls={polls.map((poll) => ({
          id: poll.id,
          title: poll.title,
          description: poll.description,
          status: poll.status,
          responseCount: poll._count.responses,
          questionCount: poll.questions.length,
          publishedAt: poll.publishedAt?.toISOString() ?? null,
          questions: poll.questions.map((q) => ({
            clientId: q.id,
            label: q.label,
            type: q.type,
            required: q.required,
            allowOther: q.allowOther,
            options: parsePollOptions(q.options),
          })),
        }))}
      />
    </div>
  );
}
