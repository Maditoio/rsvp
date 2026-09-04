import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/db/prisma";
import { respondToMeetingByToken } from "@/modules/meetings/decisions";
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
  const meetingsHref = `/me/events/${request.eventId}/meetings`;
  const requesterLabel = displayName(request.requester);
  const eventName = request.event.name;

  let succeeded = result.ok;
  if (!succeeded) {
    // Recover when the decision committed but a post-commit side effect failed.
    const settled = await prisma.meetingRequest.findFirst({
      where: { id: request.id },
      select: { status: true },
    });
    succeeded =
      (decision === "accept" && settled?.status === "ACCEPTED") ||
      (decision === "decline" && settled?.status === "DECLINED");
  }

  if (succeeded) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-16">
        <Card className="mx-auto max-w-lg">
          <p className="text-[0.71875rem] font-semibold uppercase tracking-[0.04em] text-indigo-600">
            Connection request
          </p>
          <h1 className="mt-2 font-display text-3xl text-slate-900">
            {decision === "accept" ? "Request accepted" : "Request declined"}
          </h1>
          <p className="mt-3 text-sm text-slate-700">
            {decision === "accept"
              ? `Your meeting with ${requesterLabel} for ${eventName} is confirmed and scheduled. Open Meetings to see the time and room.`
              : `You declined the connection request from ${requesterLabel} for ${eventName}.`}
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
          {!result.ok ? result.error : "Something went wrong. Please try again from Meetings."}
        </p>
        <p className="mt-4 text-sm text-slate-700">
          Request from {requesterLabel} for {eventName}.
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
