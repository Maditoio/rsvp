import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, DecisionCard } from "@/components/ui/card";
import { RouteDrawer } from "@/components/ui/drawer";
import { getPublicInvitation } from "@/modules/invitations/public";
import { getQrForInvitationHolder } from "@/modules/attendees/actions";
import { turnstileSiteKey } from "@/lib/utils";
import { ensureDefaultRegistrationForm } from "@/modules/registrations/form";
import { getCurrentUser } from "@/lib/authz/require";
import { prisma } from "@/lib/db/prisma";
import {
  isQuestionnaireComplete,
  matchmakingPath,
} from "@/modules/matchmaking/questionnaire";
import { RegistrationForm } from "./registration-form";

export default async function RegisterPage({
  params,
}: PageProps<"/i/[token]/register">) {
  const { token } = await params;
  const invitation = await getPublicInvitation(token);
  if (invitation.gate === "missing") notFound();

  if (
    invitation.gate === "cancelled" ||
    invitation.gate === "expired" ||
    invitation.gate === "declined" ||
    invitation.gate === "not-ready"
  ) {
    return (
      <Card>
        <h1 className="font-display text-3xl text-ink-800">
          Registration is not available
        </h1>
        <p className="mt-3 text-stone-700">
          This invitation cannot be used to register for {invitation.eventName}.
        </p>
        <Link
          href={`/i/${encodeURIComponent(token)}`}
          className="mt-5 inline-flex text-sm text-ink-700 underline"
        >
          Back to invitation
        </Link>
      </Card>
    );
  }

  if (!invitation.accepted) {
    return (
      <Card>
        <h1 className="font-display text-3xl text-ink-800">
          Accept the invitation first
        </h1>
        <p className="mt-3 text-stone-700">
          Invitation is not registration. Accept your place at{" "}
          {invitation.eventName}, then return here to complete the form.
        </p>
        <Link
          href={`/i/${encodeURIComponent(token)}`}
          className="mt-5 inline-flex rounded-sm bg-ink-600 px-4 py-2 text-sm font-medium text-white"
        >
          Review invitation
        </Link>
      </Card>
    );
  }

  const existingQr = invitation.registered
    ? await getQrForInvitationHolder(token)
    : null;
  const form = await ensureDefaultRegistrationForm(
    invitation.organisationId,
    invitation.eventId,
  );

  let matchmakingHref: string | null = null;
  let user = null;
  try {
    user = await getCurrentUser();
  } catch {
    user = null;
  }
  if (user && invitation.registered) {
    const attendee = await prisma.attendee.findFirst({
      where: {
        eventId: invitation.eventId,
        userId: user.id,
        organisationId: invitation.organisationId,
      },
      include: { matchProfile: true },
    });
    if (attendee && !isQuestionnaireComplete(attendee.matchProfile?.questionnaire)) {
      matchmakingHref = matchmakingPath(invitation.eventId);
    }
  }

  return (
    <RouteDrawer
      title={`Register for ${invitation.eventName}`}
      description="Confirm or correct the details already associated with your invitation."
      closeHref={`/i/${encodeURIComponent(token)}`}
      size="lg"
    >
      <DecisionCard className="mb-6">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-bronze-200">
          Registration
        </p>
        <h1 className="mt-2 font-display text-4xl">{invitation.eventName}</h1>
        <p className="mt-2 text-ink-100">
          Confirm or correct the details we already have from your invitation.
        </p>
      </DecisionCard>
      <Card>
        <RegistrationForm
          token={token}
          siteKey={turnstileSiteKey()}
          fields={form.fields}
          existingQr={existingQr}
          matchmakingHref={matchmakingHref}
          defaults={{
            firstName: invitation.firstName,
            lastName: invitation.lastName,
            email: invitation.email,
            phone: invitation.phone,
            company: invitation.company,
            jobTitle: invitation.jobTitle,
            country: invitation.country,
          }}
        />
      </Card>
    </RouteDrawer>
  );
}
