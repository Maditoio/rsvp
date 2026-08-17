import { notFound } from "next/navigation";
import { Card, DecisionCard } from "@/components/ui/card";
import { getPublicInvitation } from "@/modules/invitations/public";
import { InvitationResponse } from "./invitation-response";

export default async function InvitationPage({
  params,
}: PageProps<"/i/[token]">) {
  const { token } = await params;
  const invitation = await getPublicInvitation(token, { markOpened: true });
  if (invitation.gate === "missing") notFound();

  if (invitation.gate === "cancelled") {
    return (
      <Card>
        <p className="text-xs uppercase tracking-[0.18em] text-error-500">
          Cancelled
        </p>
        <h1 className="mt-2 font-serif text-3xl text-slate-900">
          This invitation has been cancelled
        </h1>
        <p className="mt-3 text-slate-600">
          {invitation.eventName} is no longer available on this link. Contact{" "}
          {invitation.orgName} if you believe this is a mistake.
        </p>
      </Card>
    );
  }

  if (invitation.gate === "expired") {
    return (
      <Card>
        <p className="text-xs uppercase tracking-[0.18em] text-warning-500">
          Expired
        </p>
        <h1 className="mt-2 font-serif text-3xl text-slate-900">
          This invitation has expired
        </h1>
        <p className="mt-3 text-slate-600">
          The response window for {invitation.eventName} has closed. Ask the
          organiser to issue a new invitation if you still plan to attend.
        </p>
      </Card>
    );
  }

  if (invitation.gate === "declined") {
    return (
      <Card>
        <h1 className="font-serif text-3xl text-slate-900">
          You declined this invitation
        </h1>
        <p className="mt-3 text-slate-600">
          {invitation.eventName} will not hold a registration against this
          invitation.
        </p>
      </Card>
    );
  }

  if (invitation.gate === "not-ready") {
    return (
      <Card>
        <h1 className="font-serif text-3xl text-slate-900">
          This invitation is not active yet
        </h1>
        <p className="mt-3 text-slate-600">
          {invitation.eventName} has not released this invitation for a
          response.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <DecisionCard>
        <p className="text-xs uppercase tracking-[0.18em] text-accent-200">
          {invitation.orgName}
        </p>
        <h1 className="mt-2 font-serif text-4xl">{invitation.eventName}</h1>
        <p className="mt-2 text-primary-100">
          {invitation.venue || "Venue TBC"} · {invitation.when}
        </p>
      </DecisionCard>
      <Card>
        <p className="text-sm text-slate-500">Invited as</p>
        <p className="mt-1 text-lg font-medium text-slate-900">
          {invitation.firstName} {invitation.lastName}
        </p>
        <div className="mt-6">
          <InvitationResponse
            token={token}
            accepted={invitation.accepted}
            registered={invitation.registered}
          />
        </div>
      </Card>
    </div>
  );
}
