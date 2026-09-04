"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { writeAudit } from "@/modules/audit/log";
import { generateOpaqueToken } from "@/lib/crypto/tokens";
import { rateLimit } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { getAppUrl } from "@/lib/utils";
import { isCountryName } from "@/lib/countries";
import {
  type ActionResult,
  actionFail,
  actionOk,
  publicActionError,
} from "@/lib/action-result";
import { emailFieldSchema } from "@/lib/validation";
import {
  sendApplicationDecisionEmail,
  sendInvitationEmail,
} from "@/modules/communications/email";

import {
  isPublicAttendanceSlug,
} from "@/modules/applications/attendance-types";
import { ensurePublicAttendanceCategory } from "@/modules/applications/ensure-attendance-category";

const applySchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  email: emailFieldSchema,
  company: z.string().max(160).optional().or(z.literal("")),
  jobTitle: z.string().max(160).optional().or(z.literal("")),
  country: z
    .string()
    .max(80)
    .refine((v) => v === "" || isCountryName(v), {
      message: "Select a country from the list",
    })
    .optional()
    .or(z.literal("")),
  message: z.string().max(1000).optional().or(z.literal("")),
  attendanceType: z
    .string()
    .trim()
    .min(1, "Select how you are attending")
    .refine(isPublicAttendanceSlug, {
      message: "Select a valid attendance type",
    }),
});

export async function submitPublicApplication(
  orgSlug: string,
  eventSlug: string,
  formData: FormData,
  turnstileToken?: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    await verifyTurnstile(turnstileToken);
    const input = applySchema.parse({
      firstName: String(formData.get("firstName") ?? ""),
      lastName: String(formData.get("lastName") ?? ""),
      email: String(formData.get("email") ?? ""),
      company: String(formData.get("company") ?? ""),
      jobTitle: String(formData.get("jobTitle") ?? ""),
      country: String(formData.get("country") ?? ""),
      message: String(formData.get("message") ?? ""),
      attendanceType: String(formData.get("attendanceType") ?? ""),
    });

    const limited = await rateLimit(`apply:${input.email}`, 5, 60);
    if (!limited.success) {
      return actionFail("Too many applications. Try again later.");
    }

    const event = await prisma.event.findFirst({
      where: { slug: eventSlug, organisation: { slug: orgSlug } },
      include: { settings: true, organisation: true },
    });
    if (!event?.settings?.allowPublicApplication) {
      return actionFail("This event is not accepting public applications.");
    }

    const existing = await prisma.eventApplication.findUnique({
      where: { eventId_email: { eventId: event.id, email: input.email } },
    });
    if (existing) {
      return actionFail("An application for this email is already on file.");
    }

    const category = await ensurePublicAttendanceCategory({
      organisationId: event.organisationId,
      eventId: event.id,
      slug: input.attendanceType,
    });

    const application = await prisma.eventApplication.create({
      data: {
        organisationId: event.organisationId,
        eventId: event.id,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        company: input.company || null,
        jobTitle: input.jobTitle || null,
        country: input.country || null,
        message: input.message || null,
        categoryId: category.id,
      },
    });

    await writeAudit({
      organisationId: event.organisationId,
      eventId: event.id,
      action: "application.submit",
      resource: "event_application",
      resourceId: application.id,
      ip: (await headers()).get("x-forwarded-for"),
      metadata: { email: input.email, attendanceType: input.attendanceType },
    });

    return actionOk({ id: application.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return actionFail(error.issues[0]?.message ?? "Check the form and try again.");
    }
    return actionFail(publicActionError(error, "Could not submit application."));
  }
}

export async function decideApplication(
  orgSlug: string,
  eventId: string,
  formData: FormData,
) {
  const ctx = await requireEvent(orgSlug, eventId, "invitations.write");
  const applicationId = z.string().min(1).parse(String(formData.get("applicationId") ?? ""));
  const decision = z.enum(["approve", "reject"]).parse(String(formData.get("decision") ?? ""));

  const application = await prisma.eventApplication.findFirst({
    where: {
      id: applicationId,
      eventId,
      organisationId: ctx.organisation.id,
    },
  });
  if (!application) throw new Error("Application not found");
  if (application.status !== "PENDING") {
    throw new Error("This application has already been decided.");
  }

  if (decision === "reject") {
    await prisma.eventApplication.update({
      where: { id: application.id },
      data: { status: "REJECTED" },
    });
    await sendApplicationDecisionEmail({
      organisationId: ctx.organisation.id,
      eventId,
      toEmail: application.email,
      toName: `${application.firstName} ${application.lastName}`,
      eventName: (await prisma.event.findUnique({ where: { id: eventId } }))?.name ?? "the event",
      approved: false,
    });
  } else {
    const event = await prisma.event.findFirst({
      where: { id: eventId, organisationId: ctx.organisation.id },
    });
    if (!event) throw new Error("Event not found");

    const contact = await prisma.contact.upsert({
      where: {
        eventId_email: { eventId, email: application.email },
      },
      create: {
        organisationId: ctx.organisation.id,
        eventId,
        email: application.email,
        firstName: application.firstName,
        lastName: application.lastName,
        company: application.company,
        jobTitle: application.jobTitle,
        country: application.country,
      },
      update: {
        firstName: application.firstName,
        lastName: application.lastName,
        company: application.company,
        jobTitle: application.jobTitle,
        country: application.country,
      },
    });

    let expiryDays = 30;
    try {
      const settings = await prisma.eventSettings.findUnique({
        where: { eventId },
        select: { invitationExpiryDays: true },
      });
      expiryDays = settings?.invitationExpiryDays ?? 30;
    } catch {
      // Gracefully fall back if columns are mid-migration
    }
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);
    const token = generateOpaqueToken();
    const invitation = await prisma.invitation.create({
      data: {
        organisationId: ctx.organisation.id,
        eventId,
        contactId: contact.id,
        categoryId: application.categoryId,
        status: "SENT",
        tokenHash: token.hash,
        sentAt: new Date(),
        expiresAt,
      },
    });

    await prisma.eventApplication.update({
      where: { id: application.id },
      data: { status: "APPROVED", invitationId: invitation.id },
    });

    const acceptUrl = `${getAppUrl()}/i/${token.raw}`;
    await sendInvitationEmail({
      organisationId: ctx.organisation.id,
      eventId,
      invitationId: invitation.id,
      toEmail: application.email,
      toName: `${application.firstName} ${application.lastName}`,
      eventName: event.name,
      orgName: ctx.organisation.name,
      acceptUrl,
    });
    await sendApplicationDecisionEmail({
      organisationId: ctx.organisation.id,
      eventId,
      toEmail: application.email,
      toName: `${application.firstName} ${application.lastName}`,
      eventName: event.name,
      approved: true,
      href: acceptUrl,
    });
  }

  await writeAudit({
    organisationId: ctx.organisation.id,
    eventId,
    userId: ctx.user.id,
    action: decision === "approve" ? "application.approve" : "application.reject",
    resource: "event_application",
    resourceId: application.id,
  });
  revalidatePath(`/app/${orgSlug}/events/${eventId}/applications`);
  revalidatePath(`/app/${orgSlug}/events/${eventId}/invitations`);
}
