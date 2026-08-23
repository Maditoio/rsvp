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
    <div className="min-h-screen bg-slate-50 px-6 py-16">
      <Card className="mx-auto max-w-lg">
        <p className="text-[0.71875rem] font-semibold uppercase tracking-[0.04em] text-indigo-600">
          Connection request
        </p>
        <h1 className="mt-2 font-display text-3xl text-slate-900">
          Could not {decision} request
        </h1>
        <p className="mt-3 text-sm text-slate-700">
          {result.error}
        </p>
        <p className="mt-4 text-sm text-slate-700">
          Request from {displayName(request.requester)} for {request.event.name}.
        </p>
        <Link
          href={meetingsHref}
          className="mt-6 inline-flex h-10 items-center rounded-full bg-indigo-600 px-5 text-sm font-semibold text-white shadow-accent hover:bg-indigo-700"
        >
          Open Meetings
        </Link>
      </Card>
    </div>
  );
}
