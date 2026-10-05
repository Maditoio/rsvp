import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { PublicEventHero } from "@/components/public/public-event-branding";
import { getPublicInvitation } from "@/modules/invitations/public";
import { loadPublicEventBrandingByIds } from "@/modules/branding/public-event-branding";
import { DEFAULT_EMAIL_ACCENT } from "@/modules/communications/email-branding";
import { InvitationResponse } from "./invitation-response";

export default async function InvitationPage({
  params,
}: PageProps<"/i/[token]">) {
  const { token } = await params;
  const invitation = await getPublicInvitation(token, { markOpened: true });
  if (invitation.gate === "missing") notFound();

  const branding =
    (await loadPublicEventBrandingByIds({
      organisationId: invitation.organisationId,
      eventId: invitation.eventId,
    })) ?? {
      logoUrl: null,
      bannerUrl: null,
      accentColor: DEFAULT_EMAIL_ACCENT,
      accentSoft: "#EEF2FF",
      accentBorder: "#C7D2FE",
      accentShadow: "0 4px 12px rgba(79,70,229,0.28)",
      eventName: invitation.eventName,
      orgName: invitation.orgName,
      venue: invitation.venue,
      timezone: "UTC",
    };

  if (invitation.gate === "cancelled") {
    return (
      <Card>
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-danger">
          Cancelled
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-slate-900">
          This invitation has been cancelled
        </h1>
        <p className="mt-3 text-slate-700">
          {invitation.eventName} is no longer available on this link. Contact{" "}
          {invitation.orgName} if you believe this is a mistake.
        </p>
      </Card>
    );
  }

  if (invitation.gate === "expired") {
    return (
      <Card>
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-warning">
          Expired
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-slate-900">
          This invitation has expired
        </h1>
        <p className="mt-3 text-slate-700">
          The response window for {invitation.eventName} has closed. Ask the
          organiser to issue a new invitation if you still plan to attend.
        </p>
      </Card>
    );
  }

  if (invitation.gate === "declined") {
    return (
      <Card>
        <h1 className="text-3xl font-semibold tracking-[-0.02em] text-slate-900">
          You declined this invitation
        </h1>
        <p className="mt-3 text-slate-700">
          {invitation.eventName} will not hold a registration against this
          invitation.
        </p>
      </Card>
    );
  }

  if (invitation.gate === "not-ready") {
    return (
      <Card>
        <h1 className="text-3xl font-semibold tracking-[-0.02em] text-slate-900">
          This invitation is not active yet
        </h1>
        <p className="mt-3 text-slate-700">
          {invitation.eventName} has not released this invitation for a
          response.
        </p>
      </Card>
    );
  }

  return (
    <div
      className="-mx-6 -my-8 min-h-[calc(100vh-8rem)] space-y-6 px-6 py-8"
      style={
        branding.accentColor.toUpperCase() === "#4F46E5"
          ? undefined
          : { backgroundColor: branding.accentSoft }
      }
    >
      <PublicEventHero
        branding={branding}
        eyebrow={invitation.orgName}
        title={invitation.eventName}
        description={
          <>
            {invitation.venue || "Venue TBC"} · {invitation.when}
          </>
        }
      />
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
            accentColor={branding.accentColor}
          />
        </div>
      </Card>
    </div>
  );
}
