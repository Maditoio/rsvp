"use server";

import { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { generateOpaqueToken } from "@/lib/crypto/tokens";
import { decryptSecret, encryptSecret } from "@/lib/crypto/secret";
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

export type RegistrationResult =
  | {
      ok: true;
      attendeeId: string;
      qrDataUrl: string;
      eventId: string;
      signedIn: boolean;
    }
  | { ok: false; error: string };

function fail(error: string): RegistrationResult {
  return { ok: false, error };
}

function publicErrorMessage(error: unknown) {
  if (error instanceof Error && error.message && error.message.length < 180) {
    const message = error.message.trim();
    if (
      message &&
      !message.startsWith("An error occurred in the Server Components") &&
      !message.includes("digest")
    ) {
      return message;
    }
  }
  return "Could not complete registration. Please try again.";
}

async function qrForAttendee(attendee: {
  id: string;
  attendanceTokenEnc: string | null;
  eventId: string;
}) {
  if (!attendee.attendanceTokenEnc) {
    return fail(
      "This email is already registered for this event, but a check-in code is not available on this link.",
    );
  }
  const user = await currentUserOrNull();
  return {
    ok: true as const,
    attendeeId: attendee.id,
    qrDataUrl: await opaqueQrDataUrl(decryptSecret(attendee.attendanceTokenEnc)),
    eventId: attendee.eventId,
    signedIn: Boolean(user),
  };
}

async function currentUserOrNull() {
  try {
    return await getCurrentUser();
  } catch {
    return null;
  }
}

export async function submitRegistration(
  rawToken: string,
  formData: FormData,
  turnstileToken?: string,
): Promise<RegistrationResult> {
  try {
    const limited = await rateLimit(`register:${rawToken.slice(0, 16)}`, 10, 60);
    if (!limited.success) {
      return fail("Too many registration attempts. Wait a minute and try again.");
    }

    await verifyTurnstile(turnstileToken);

    const invitation = await loadInvitationByToken(rawToken);
    if (!invitation) return fail("This invitation link is not valid.");
    if (invitation.status !== "ACCEPTED") {
      return fail("Accept the invitation before registering.");
    }
    if (!invitationUsable("ACCEPTED", invitation.expiresAt)) {
      return fail("This invitation is no longer valid.");
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
      return fail("First name, last name and email are required.");
    }

    const user = await currentUserOrNull();

    const existing = await prisma.attendee.findFirst({
      where: {
        organisationId: invitation.organisationId,
        eventId: invitation.eventId,
        email,
      },
    });
    if (existing) {
      const sameInvitee =
        existing.invitationId === invitation.id ||
        existing.contactId === invitation.contactId;
      if (sameInvitee) {
        return qrForAttendee(existing);
      }
      return fail(
        "This email is already registered for this event. Open the original invitation link to view the check-in code.",
      );
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

    try {
      await sendRegistrationConfirmationEmail({
        organisationId: invitation.organisationId,
        eventId: invitation.eventId,
        toEmail: email,
        toName: `${firstName} ${lastName}`,
        eventName: invitation.event.name,
        orgName: invitation.organisation.name,
        passUrl: `${getAppUrl()}/i/${rawToken}/register`,
      });
    } catch (error) {
      console.error("registration confirmation email failed", error);
    }

    return {
      ok: true,
      attendeeId: result.attendee.id,
      qrDataUrl: await opaqueQrDataUrl(qr.raw),
      eventId: invitation.eventId,
      signedIn: Boolean(user),
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return fail(
        "This email is already registered for this event. Open the original invitation link to view the check-in code.",
      );
    }
    return fail(publicErrorMessage(error));
  }
}
