import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { respondToMeetingByToken } from "@/modules/meetings/actions";
import { loadMeetingRequestByToken } from "@/modules/meetings/respond-token";
import { displayName } from "@/lib/utils";

export default async function MeetingResponsePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ decision?: string }>;
}) {
  const { token } = await params;
  const { decision } = await searchParams;
  if (decision !== "accept" && decision !== "decline") notFound();

  const request = await loadMeetingRequestByToken(token);
  if (!request) notFound();

  const result = await respondToMeetingByToken(token, decision);
  const meetingsHref = result.eventId
    ? `/me/events/${result.eventId}/meetings`
    : "/me";

  if (result.ok) {
    redirect(`${meetingsHref}?responded=${decision}`);
  }

  return (
    <div className="min-h-screen bg-stone-50 px-6 py-16">
      <Card className="mx-auto max-w-lg">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-bronze-600">
          Connection request
        </p>
        <h1 className="mt-2 font-display text-3xl text-ink-800">
          Could not {decision} request
        </h1>
        <p className="mt-3 text-sm text-stone-700">
          {result.error}
        </p>
        <p className="mt-4 text-sm text-stone-700">
          Request from {displayName(request.requester)} for {request.event.name}.
        </p>
        <Link
          href={meetingsHref}
          className="mt-6 inline-flex h-10 items-center rounded-sm bg-ink-700 px-4 text-sm font-semibold text-white hover:bg-ink-800"
        >
          Open Meetings
        </Link>
      </Card>
    </div>
  );
}
