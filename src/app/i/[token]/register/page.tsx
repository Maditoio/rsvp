import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { RouteDrawer } from "@/components/ui/drawer";
import { PublicEventHero } from "@/components/public/public-event-branding";
import { getPublicInvitation } from "@/modules/invitations/public";
import { turnstileSiteKey, attendeeSignUpUrl } from "@/lib/utils";
import { buildRegistrationPrefill } from "@/modules/registrations/answers";
import { ensureDefaultRegistrationForm } from "@/modules/registrations/form";
import { getCurrentUser } from "@/lib/authz/require";
import { prisma } from "@/lib/db/prisma";
import {
  isQuestionnaireComplete,
  matchmakingPath,
} from "@/modules/matchmaking/questionnaire";
import { eventDayOptions } from "@/lib/event-dates";
import {
  defaultPublicBanner,
  loadPublicEventBrandingByIds,
} from "@/modules/branding/public-event-branding";
import { DEFAULT_EMAIL_ACCENT } from "@/modules/communications/email-branding";
import { RegistrationForm } from "./registration-form";

export default async function RegisterPage({
  params,
}: PageProps<"/i/[token]/register">) {
  const { token } = await params;
  const invitation = await getPublicInvitation(token);
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
      banner: defaultPublicBanner(),
    };

  if (
    invitation.gate === "cancelled" ||
    invitation.gate === "expired" ||
    invitation.gate === "declined" ||
    invitation.gate === "not-ready"
  ) {
    return (
      <Card>
        <h1 className="text-3xl font-semibold tracking-[-0.02em] text-slate-900">
          Registration is not available
        </h1>
        <p className="mt-3 text-slate-700">
          This invitation cannot be used to register for {invitation.eventName}.
        </p>
        <Link
          href={`/i/${encodeURIComponent(token)}`}
          className="mt-5 inline-flex text-sm text-slate-700 underline"
        >
          Back to invitation
        </Link>
      </Card>
    );
  }

  if (!invitation.accepted) {
    return (
      <Card>
        <h1 className="text-3xl font-semibold tracking-[-0.02em] text-slate-900">
          Accept the invitation first
        </h1>
        <p className="mt-3 text-slate-700">
          Invitation is not registration. Accept your place at{" "}
          {invitation.eventName}, then return here to complete the form.
        </p>
        <Link
          href={`/i/${encodeURIComponent(token)}`}
          className="mt-5 inline-flex rounded-full px-4 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: branding.accentColor }}
        >
          Review invitation
        </Link>
      </Card>
    );
  }

  const event = await prisma.event.findFirst({
    where: {
      id: invitation.eventId,
      organisationId: invitation.organisationId,
    },
    select: { startsAt: true, endsAt: true, timezone: true },
  });

  const form = await ensureDefaultRegistrationForm(
    invitation.organisationId,
    invitation.eventId,
  );

  const priorResponse = await prisma.registrationResponse.findFirst({
    where: {
      organisationId: invitation.organisationId,
      eventId: invitation.eventId,
      contact: { email: invitation.email },
    },
    orderBy: { updatedAt: "desc" },
    select: { data: true },
  });

  const defaults = buildRegistrationPrefill({
    contact: {
      firstName: invitation.firstName,
      lastName: invitation.lastName,
      email: invitation.email,
      phone: invitation.phone || null,
      company: invitation.company || null,
      jobTitle: invitation.jobTitle || null,
      country: invitation.country || null,
    },
    priorResponseData: priorResponse?.data,
  });

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

  const signUpHref = attendeeSignUpUrl(invitation.email, "/me");
  const eventDays = eventDayOptions(
    event?.startsAt ?? null,
    event?.endsAt ?? null,
    event?.timezone ?? "UTC",
  );
  const closeHref = `/i/${encodeURIComponent(token)}`;

  const settings = await prisma.eventSettings.findFirst({
    where: {
      eventId: invitation.eventId,
      organisationId: invitation.organisationId,
    },
    select: { showRegistrationAccountCtas: true },
  });
  const showAccountCtas = settings?.showRegistrationAccountCtas ?? true;

  return (
    <RouteDrawer
      title={`Register for ${invitation.eventName}`}
      description="Confirm or correct the details already associated with your invitation."
      closeHref={closeHref}
      size="lg"
    >
      <PublicEventHero
        className="mb-6"
        branding={branding}
        eyebrow="Registration"
        title={invitation.eventName}
        description={
          <>
            Confirm or correct the details we already have from your invitation.
            {eventDays.length > 0 ? (
              <>
                <br />
                Event dates: {eventDays.map((day) => day.label).join(" · ")}
              </>
            ) : null}
          </>
        }
      />
      <Card>
        <RegistrationForm
          token={token}
          siteKey={turnstileSiteKey()}
          fields={form.fields}
          alreadyRegistered={invitation.registered}
          invitationEmail={invitation.email}
          signUpHref={signUpHref}
          matchmakingHref={matchmakingHref}
          eventDays={eventDays}
          defaults={defaults}
          accentColor={branding.accentColor}
          showAccountCtas={showAccountCtas}
          closeHref={closeHref}
        />
      </Card>
    </RouteDrawer>
  );
}
