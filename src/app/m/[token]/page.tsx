import Link from "next/link";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/db/prisma";
import { respondToMeetingByToken } from "@/modules/meetings/decisions";
import { loadMeetingRequestByToken } from "@/modules/meetings/respond-token";

function ResponseShell({
  title,
  body,
  href = "/me",
  cta = "Go to My Events",
}: {
  title: string;
  body: string;
  href?: string;
  cta?: string;
}) {
  return (
    <div className="min-h-screen bg-slate-50 px-6 py-16">
      <Card className="mx-auto max-w-lg">
        <p className="text-[0.71875rem] font-semibold uppercase tracking-[0.04em] text-indigo-600">
          Connection request
        </p>
        <h1 className="mt-2 font-display text-3xl text-slate-900">{title}</h1>
        <p className="mt-3 text-sm text-slate-700">{body}</p>
        <Link
          href={href}
          className="mt-6 inline-flex h-10 items-center rounded-full bg-indigo-600 px-5 text-sm font-semibold text-white shadow-accent hover:bg-indigo-700"
        >
          {cta}
        </Link>
      </Card>
    </div>
  );
}

export default async function MeetingResponsePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ decision?: string }>;
}) {
  const { token } = await params;
  const { decision } = await searchParams;

  if (decision !== "accept" && decision !== "decline") {
    return (
      <ResponseShell
        title="Invalid response link"
        body="This connection link is missing an accept or decline action. Open the button in your email again, or manage the request from Meetings."
      />
    );
  }

  const request = await loadMeetingRequestByToken(token);
  if (!request) {
    // Token was cleared by older accepts, never existed, or is forged.
    // Never 404 — that feels like the product broke after a successful click.
    return (
      <ResponseShell
        title="Request already handled"
        body="This response link is no longer active. If you already accepted or declined, you're done — open Meetings to view your connections."
        href="/me"
        cta="Go to My Events"
      />
    );
  }

  const result = await respondToMeetingByToken(token, decision);
  const meetingsHref = `/me/events/${request.eventId}/meetings`;
  const requesterLabel = request.requester.displayName;
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
      <ResponseShell
        title={decision === "accept" ? "Request accepted" : "Request declined"}
        body={
          decision === "accept"
            ? `Your meeting with ${requesterLabel} for ${eventName} is confirmed and scheduled. Open Meetings to see the time and room.`
            : `You declined the connection request from ${requesterLabel} for ${eventName}.`
        }
        href={meetingsHref}
        cta="Open Meetings"
      />
    );
  }

  return (
    <ResponseShell
      title={`Could not ${decision} request`}
      body={
        !result.ok
          ? `${result.error} Request from ${requesterLabel} for ${eventName}.`
          : `Something went wrong. Please try again from Meetings. Request from ${requesterLabel} for ${eventName}.`
      }
      href={meetingsHref}
      cta="Open Meetings"
    />
  );
}
