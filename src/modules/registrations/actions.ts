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
import {
  registrationSchema,
  type RegistrationInput,
} from "@/modules/registrations/schema";
import { verifyTurnstile } from "@/lib/turnstile";

export async function submitRegistration(
  rawToken: string,
  data: RegistrationInput,
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

  const parsed = registrationSchema.parse(data);
  const user = await getCurrentUser();

  const existing = await prisma.attendee.findUnique({
    where: {
      eventId_email: { eventId: invitation.eventId, email: parsed.email },
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
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        email: parsed.email,
        phone: parsed.phone || null,
        company: parsed.company || null,
        jobTitle: parsed.jobTitle || null,
        country: parsed.country || null,
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

  return {
    attendeeId: result.attendee.id,
    qrDataUrl: await opaqueQrDataUrl(qr.raw),
  };
}
