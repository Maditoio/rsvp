import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, DecisionCard } from "@/components/ui/card";
import { getPublicInvitation } from "@/modules/invitations/public";
import { getQrForInvitationHolder } from "@/modules/attendees/actions";
import { turnstileSiteKey } from "@/lib/utils";
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
        <h1 className="font-serif text-3xl text-slate-900">
          Registration is not available
        </h1>
        <p className="mt-3 text-slate-600">
          This invitation cannot be used to register for {invitation.eventName}.
        </p>
        <Link
          href={`/i/${encodeURIComponent(token)}`}
          className="mt-5 inline-flex text-sm text-primary-700 underline"
        >
          Back to invitation
        </Link>
      </Card>
    );
  }

  if (!invitation.accepted) {
    return (
      <Card>
        <h1 className="font-serif text-3xl text-slate-900">
          Accept the invitation first
        </h1>
        <p className="mt-3 text-slate-600">
          Invitation is not registration. Accept your place at{" "}
          {invitation.eventName}, then return here to complete the form.
        </p>
        <Link
          href={`/i/${encodeURIComponent(token)}`}
          className="mt-5 inline-flex rounded-full bg-primary-600 px-4 py-2 text-sm text-white"
        >
          Review invitation
        </Link>
      </Card>
    );
  }

  const existingQr = invitation.registered
    ? await getQrForInvitationHolder(token)
    : null;

  return (
    <div className="space-y-6">
      <DecisionCard>
        <p className="text-xs uppercase tracking-[0.18em] text-accent-200">
          Registration
        </p>
        <h1 className="mt-2 font-serif text-4xl">{invitation.eventName}</h1>
        <p className="mt-2 text-primary-100">
          Confirm or correct the details we already have from your invitation.
        </p>
      </DecisionCard>
      <Card>
        <RegistrationForm
          token={token}
          siteKey={turnstileSiteKey()}
          existingQr={existingQr}
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
    </div>
  );
}
