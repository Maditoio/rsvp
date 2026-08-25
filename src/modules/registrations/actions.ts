"use server";

import { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { generateOpaqueToken } from "@/lib/crypto/tokens";
import { encryptSecret } from "@/lib/crypto/secret";
import { writeAudit } from "@/modules/audit/log";
import { getCurrentUser } from "@/lib/authz/require";
import { rateLimit } from "@/lib/rate-limit";
import { loadInvitationByToken } from "@/modules/invitations/store";
import { invitationUsable } from "@/modules/invitations/lifecycle";
import { verifyTurnstile } from "@/lib/turnstile";
import {
  ensureDefaultRegistrationForm,
  parseFormValuesSafe,
  scalar,
} from "@/modules/registrations/form";
import { sendRegistrationConfirmationEmail } from "@/modules/communications/email";
import { attendeeSignUpUrl, getAppUrl } from "@/lib/utils";
import { matchmakingPath } from "@/modules/matchmaking/questionnaire";

export type RegistrationResult =
  | {
      ok: true;
      attendeeId: string;
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
    const parsedResult = parseFormValuesSafe(form.fields, formData);
    if (!parsedResult.ok) {
      return fail(parsedResult.error);
    }
    const parsed = parsedResult.data;
    const firstName = scalar(parsed, "firstName");
    const lastName = scalar(parsed, "lastName");
    const email = scalar(parsed, "email").toLowerCase();
    if (!firstName || !lastName || !email) {
      return fail("First name, last name and email are required.");
    }

    const inviteEmail = invitation.contact.email.trim().toLowerCase();
    if (email !== inviteEmail) {
      return fail(
        "Use the email address on your invitation. The registration email must match your invited address.",
      );
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
        return {
          ok: true,
          attendeeId: existing.id,
          eventId: invitation.eventId,
          signedIn: Boolean(user),
        };
      }
      return fail(
        "This email is already registered for this event with a different invitation.",
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

    const appUrl = getAppUrl();
    try {
      await sendRegistrationConfirmationEmail({
        organisationId: invitation.organisationId,
        eventId: invitation.eventId,
        toEmail: email,
        toName: `${firstName} ${lastName}`,
        eventName: invitation.event.name,
        orgName: invitation.organisation.name,
        signUpUrl: attendeeSignUpUrl(email, "/me"),
        appUrl,
        matchmakingUrl: `${appUrl}${matchmakingPath(invitation.eventId)}`,
        attendanceToken: qr.raw,
        company: result.attendee.company,
        categoryName: invitation.category?.name ?? null,
        venue: invitation.event.venue,
        timezone: invitation.event.timezone,
        startsAt: invitation.event.startsAt,
        endsAt: invitation.event.endsAt,
      });
    } catch (error) {
      console.error("registration confirmation email failed", error);
    }

    return {
      ok: true,
      attendeeId: result.attendee.id,
      eventId: invitation.eventId,
      signedIn: Boolean(user),
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return fail(
        "This email is already registered for this event. Open the original invitation link to continue.",
      );
    }
    return fail(publicErrorMessage(error));
  }
}
