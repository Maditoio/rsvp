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
import {
  sendApplicationDecisionEmail,
  sendInvitationEmail,
} from "@/modules/communications/email";

const applySchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  email: z.string().email().transform((value) => value.toLowerCase()),
  company: z.string().max(160).optional().or(z.literal("")),
  jobTitle: z.string().max(160).optional().or(z.literal("")),
  country: z.string().max(80).optional().or(z.literal("")),
  message: z.string().max(1000).optional().or(z.literal("")),
});

export async function submitPublicApplication(
  orgSlug: string,
  eventSlug: string,
  formData: FormData,
  turnstileToken?: string,
) {
  await verifyTurnstile(turnstileToken);
  const input = applySchema.parse({
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    email: String(formData.get("email") ?? ""),
    company: String(formData.get("company") ?? ""),
    jobTitle: String(formData.get("jobTitle") ?? ""),
    country: String(formData.get("country") ?? ""),
    message: String(formData.get("message") ?? ""),
  });

  const limited = await rateLimit(`apply:${input.email}`, 5, 60);
  if (!limited.success) throw new Error("Too many applications. Try again later.");

  const event = await prisma.event.findFirst({
    where: { slug: eventSlug, organisation: { slug: orgSlug } },
    include: { settings: true, organisation: true },
  });
  if (!event?.settings?.allowPublicApplication) {
    throw new Error("This event is not accepting public applications.");
  }

  const existing = await prisma.eventApplication.findUnique({
    where: { eventId_email: { eventId: event.id, email: input.email } },
  });
  if (existing) {
    throw new Error("An application for this email is already on file.");
  }

  const application = await prisma.eventApplication.create({
    data: {
      organisationId: event.organisationId,
      eventId: event.id,
      ...input,
      company: input.company || null,
      jobTitle: input.jobTitle || null,
      country: input.country || null,
      message: input.message || null,
    },
  });

  await writeAudit({
    organisationId: event.organisationId,
    eventId: event.id,
    action: "application.submit",
    resource: "event_application",
    resourceId: application.id,
    ip: (await headers()).get("x-forwarded-for"),
    metadata: { email: input.email },
  });

  return { id: application.id };
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

    const settings = await prisma.eventSettings.findUnique({ where: { eventId } });
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (settings?.invitationExpiryDays ?? 30));
    const token = generateOpaqueToken();
    const invitation = await prisma.invitation.create({
      data: {
        organisationId: ctx.organisation.id,
        eventId,
        contactId: contact.id,
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
