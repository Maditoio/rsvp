import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { AuthzError } from "@/lib/db/tenant";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";

export default async function AttendeePollsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const user = await safe(() => requireUser());
  const attendee = await prisma.attendee.findFirst({
    where: { eventId, userId: user.id },
    select: { id: true, organisationId: true, event: { select: { name: true } } },
  });
  if (!attendee) {
    throw new AuthzError("You are not registered for this event", 403);
  }

  const polls = await prisma.eventPoll.findMany({
    where: {
      eventId,
      organisationId: attendee.organisationId,
      status: { in: ["PUBLISHED", "CLOSED"] },
    },
    include: {
      responses: {
        where: { attendeeId: attendee.id },
        select: { id: true },
        take: 1,
      },
      _count: { select: { questions: true } },
    },
    orderBy: [{ status: "asc" }, { publishedAt: "desc" }],
  });

  return (
    <div>
      <PageHeader
        title="Polls"
        description={`Share your feedback for ${attendee.event.name}.`}
        className="mb-6"
      />
      {polls.length === 0 ? (
        <div className="rounded-xl bg-white px-6 py-12 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-900">No polls yet</p>
          <p className="mt-1 text-sm text-slate-500">
            When organisers publish a poll, it will appear here.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {polls.map((poll) => {
            const answered = poll.responses.length > 0;
            const open = poll.status === "PUBLISHED";
            return (
              <li
                key={poll.id}
                className="flex flex-wrap items-center gap-4 rounded-xl bg-white px-5 py-4 shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">{poll.title}</p>
                    <Badge
                      tone={
                        answered ? "success" : open ? "default" : "muted"
                      }
                    >
                      {answered ? "Submitted" : open ? "Open" : "Closed"}
                    </Badge>
                  </div>
                  {poll.description ? (
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                      {poll.description}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-slate-500">
                      {poll._count.questions} question
                      {poll._count.questions === 1 ? "" : "s"}
                    </p>
                  )}
                </div>
                {open && !answered ? (
                  <Link
                    href={`/me/events/${eventId}/polls/${poll.id}`}
                    className="inline-flex h-9 items-center rounded-full bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700"
                  >
                    Respond
                  </Link>
                ) : answered ? (
                  <Link
                    href={`/me/events/${eventId}/polls/${poll.id}`}
                    className="inline-flex h-9 items-center rounded-full border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    View
                  </Link>
                ) : (
                  <span className="text-sm text-slate-400">Closed</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
