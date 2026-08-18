"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { generateOpaqueToken } from "@/lib/crypto/tokens";
import { encryptSecret } from "@/lib/crypto/secret";
import { writeAudit } from "@/modules/audit/log";
import { getCurrentUser } from "@/lib/authz/require";
import { rateLimit } from "@/lib/rate-limit";
import { loadInvitationByToken } from "@/modules/invitations/store";
import { opaqueQrDataUrl } from "@/lib/qr";
import { invitationUsable } from "@/modules/invitations/lifecycle";
import { verifyTurnstile } from "@/lib/turnstile";
import {
  ensureDefaultRegistrationForm,
  parseFormValues,
  scalar,
} from "@/modules/registrations/form";
import { sendRegistrationConfirmationEmail } from "@/modules/communications/email";
import { getAppUrl } from "@/lib/utils";

export async function submitRegistration(
  rawToken: string,
  formData: FormData,
  turnstileToken?: string,
) {
  const limited = await rateLimit(`register:${rawToken.slice(0, 16)}`, 10, 60);
  if (!limited.success) {
    throw new Error("Too many registration attempts.");
  }

  await verifyTurnstile(turnstileToken);

  const invitation = await loadInvitationByToken(rawToken);
  if (!invitation) throw new Error("Invitation not found");
  if (invitation.status !== "ACCEPTED") {
    throw new Error("Accept the invitation before registering");
  }
  if (!invitationUsable("ACCEPTED", invitation.expiresAt)) {
    throw new Error("This invitation is no longer valid");
  }

  const form = await ensureDefaultRegistrationForm(
    invitation.organisationId,
    invitation.eventId,
  );
  const parsed = parseFormValues(form.fields, formData);
  const firstName = scalar(parsed, "firstName");
  const lastName = scalar(parsed, "lastName");
  const email = scalar(parsed, "email").toLowerCase();
  if (!firstName || !lastName || !email) {
    throw new Error("First name, last name and email are required.");
  }

  const user = await getCurrentUser();

  const existing = await prisma.attendee.findUnique({
    where: {
      eventId_email: { eventId: invitation.eventId, email },
    },
  });
  if (existing) {
    throw new Error("An attendee with this email is already registered");
  }

  const qr = generateOpaqueToken();

  const result = await prisma.$transaction(async (tx) => {
    const registration = await tx.registrationResponse.create({
      data: {
        organisationId: invitation.organisationId,
        eventId: invitation.eventId,
        invitationId: invitation.id,
        contactId: invitation.contactId,
        userId: user?.id,
        status: "COMPLETED",
        data: parsed,
      },
    });

    const attendee = await tx.attendee.create({
      data: {
        organisationId: invitation.organisationId,
        eventId: invitation.eventId,
        userId: user?.id,
        contactId: invitation.contactId,
        invitationId: invitation.id,
        registrationId: registration.id,
        categoryId: invitation.categoryId,
        qrTokenHash: qr.hash,
        attendanceTokenEnc: encryptSecret(qr.raw),
        status: "REGISTERED",
        firstName,
        lastName,
        email,
        phone: scalar(parsed, "phone") || null,
        company: scalar(parsed, "company") || null,
        jobTitle: scalar(parsed, "jobTitle") || null,
        country: scalar(parsed, "country") || null,
        profile: {
          create: {
            organisationId: invitation.organisationId,
            eventId: invitation.eventId,
          },
        },
        privacy: {
          create: {
            organisationId: invitation.organisationId,
            eventId: invitation.eventId,
          },
        },
      },
    });

    return { registration, attendee };
  });

  await writeAudit({
    organisationId: invitation.organisationId,
    eventId: invitation.eventId,
    userId: user?.id,
    action: "registration.complete",
    resource: "attendee",
    resourceId: result.attendee.id,
    ip: (await headers()).get("x-forwarded-for"),
    metadata: { invitationId: invitation.id },
  });

  await sendRegistrationConfirmationEmail({
    organisationId: invitation.organisationId,
    eventId: invitation.eventId,
    toEmail: email,
    toName: `${firstName} ${lastName}`,
    eventName: invitation.event.name,
    orgName: invitation.organisation.name,
    passUrl: `${getAppUrl()}/i/${rawToken}/register`,
  });

  return {
    attendeeId: result.attendee.id,
    qrDataUrl: await opaqueQrDataUrl(qr.raw),
    eventId: invitation.eventId,
    signedIn: Boolean(user),
  };
}
