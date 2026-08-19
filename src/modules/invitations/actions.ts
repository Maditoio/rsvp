"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { InvitationStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { generateOpaqueToken } from "@/lib/crypto/tokens";
import { writeAudit } from "@/modules/audit/log";
import { getAppUrl } from "@/lib/utils";
import { rateLimit } from "@/lib/rate-limit";
import { sendInvitationEmail } from "@/modules/communications/email";
import { canTransition, invitationUsable } from "@/modules/invitations/lifecycle";
import {
  loadInvitationByToken,
} from "@/modules/invitations/store";
import { inngest } from "@/modules/jobs/client";

export async function createInvitationsForContacts(
  orgSlug: string,
  eventId: string,
  contactIds: string[],
  categoryId?: string,
) {
  const ctx = await requireEvent(orgSlug, eventId, "invitations.write");
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

  let created = 0;
  for (const contactId of contactIds) {
    const contact = await prisma.contact.findFirst({
      where: {
        id: contactId,
        eventId,
        organisationId: ctx.organisation.id,
      },
    });
    if (!contact) continue;

    const existing = await prisma.invitation.findFirst({
      where: {
        contactId,
        eventId,
        status: { notIn: ["CANCELLED", "EXPIRED", "DECLINED"] },
      },
    });
    if (existing) continue;

    const token = generateOpaqueToken();
    await prisma.invitation.create({
      data: {
        organisationId: ctx.organisation.id,
        eventId,
        contactId,
        categoryId: categoryId || null,
        status: "DRAFT",
        tokenHash: token.hash,
        expiresAt,
      },
    });
    created += 1;
  }

  await writeAudit({
    organisationId: ctx.organisation.id,
    eventId,
    userId: ctx.user.id,
    action: "invitations.create",
    resource: "invitation",
    metadata: { created },
  });
  revalidatePath(`/app/${orgSlug}/events/${eventId}/invitations`);
  return { created };
}

const RESENDABLE = new Set([
  "SENT",
  "DELIVERED",
  "OPENED",
  "BOUNCED",
  "ACCEPTED",
]);

async function rotateTokenAndDeliver(input: {
  organisationId: string;
  eventId: string;
  invitationId: string;
  status: InvitationStatus;
  toEmail: string;
  toName: string;
  eventName: string;
  orgName: string;
}) {
  const token = generateOpaqueToken();
  const markSent =
    input.status === "DRAFT" ||
    input.status === "SCHEDULED" ||
    input.status === "BOUNCED";

  await prisma.invitation.update({
    where: { id: input.invitationId },
    data: {
      tokenHash: token.hash,
      sentAt: new Date(),
      ...(markSent ? { status: "SENT" as const } : {}),
    },
  });

  const acceptUrl = `${getAppUrl()}/i/${token.raw}`;

  if (process.env.INNGEST_EVENT_KEY) {
    await inngest.send({
      name: "invitation/send",
      data: {
        invitationId: input.invitationId,
        organisationId: input.organisationId,
        eventId: input.eventId,
        toEmail: input.toEmail,
        toName: input.toName,
        eventName: input.eventName,
        orgName: input.orgName,
        acceptUrl,
      },
    });
  } else {
    await sendInvitationEmail({
      organisationId: input.organisationId,
      eventId: input.eventId,
      invitationId: input.invitationId,
      toEmail: input.toEmail,
      toName: input.toName,
      eventName: input.eventName,
      orgName: input.orgName,
      acceptUrl,
    });
  }
}

export async function sendInvitations(
  orgSlug: string,
  eventId: string,
  invitationIds: string[],
) {
  const ctx = await requireEvent(orgSlug, eventId, "invitations.write");
  const limited = await rateLimit(
    `invite-send:${ctx.user.id}`,
    30,
    60,
  );
  if (!limited.success) {
    throw new Error("Too many send attempts. Wait a minute and try again.");
  }

  const event = await prisma.event.findFirst({
    where: { id: eventId, organisationId: ctx.organisation.id },
  });
  if (!event) throw new Error("Event not found");

  let sent = 0;
  for (const id of invitationIds) {
    const invitation = await prisma.invitation.findFirst({
      where: { id, eventId, organisationId: ctx.organisation.id },
      include: { contact: true },
    });
    if (!invitation) continue;
    if (
      invitation.status !== "DRAFT" &&
      invitation.status !== "SCHEDULED" &&
      invitation.status !== "BOUNCED"
    ) {
      continue;
    }

    await rotateTokenAndDeliver({
      organisationId: ctx.organisation.id,
      eventId,
      invitationId: invitation.id,
      status: invitation.status,
      toEmail: invitation.contact.email,
      toName: `${invitation.contact.firstName} ${invitation.contact.lastName}`,
      eventName: event.name,
      orgName: ctx.organisation.name,
    });
    sent += 1;
  }

  await writeAudit({
    organisationId: ctx.organisation.id,
    eventId,
    userId: ctx.user.id,
    action: "invitations.send",
    resource: "invitation",
    metadata: { sent },
  });
  revalidatePath(`/app/${orgSlug}/events/${eventId}/invitations`);
  return { sent };
}

export async function cancelInvitation(
  orgSlug: string,
  eventId: string,
  invitationId: string,
) {
  const ctx = await requireEvent(orgSlug, eventId, "invitations.write");
  const invitation = await prisma.invitation.findFirst({
    where: { id: invitationId, eventId, organisationId: ctx.organisation.id },
  });
  if (!invitation) throw new Error("Invitation not found");
  if (!canTransition(invitation.status, InvitationStatus.CANCELLED)) {
    throw new Error("This invitation cannot be cancelled");
  }
  await prisma.invitation.update({
    where: { id: invitationId },
    data: { status: "CANCELLED" },
  });
  await writeAudit({
    organisationId: ctx.organisation.id,
    eventId,
    userId: ctx.user.id,
    action: "invitation.cancel",
    resource: "invitation",
    resourceId: invitationId,
  });
  revalidatePath(`/app/${orgSlug}/events/${eventId}/invitations`);
}

export async function resendInvitation(
  orgSlug: string,
  eventId: string,
  invitationId: string,
) {
  const ctx = await requireEvent(orgSlug, eventId, "invitations.write");
  const limited = await rateLimit(`invite-send:${ctx.user.id}`, 30, 60);
  if (!limited.success) {
    throw new Error("Too many send attempts. Wait a minute and try again.");
  }

  const invitation = await prisma.invitation.findFirst({
    where: { id: invitationId, eventId, organisationId: ctx.organisation.id },
    include: { contact: true },
  });
  if (!invitation) throw new Error("Invitation not found");
  if (!RESENDABLE.has(invitation.status)) {
    throw new Error("This invitation cannot be resent");
  }

  const event = await prisma.event.findFirst({
    where: { id: eventId, organisationId: ctx.organisation.id },
  });
  if (!event) throw new Error("Event not found");

  await rotateTokenAndDeliver({
    organisationId: ctx.organisation.id,
    eventId,
    invitationId: invitation.id,
    status: invitation.status,
    toEmail: invitation.contact.email,
    toName: `${invitation.contact.firstName} ${invitation.contact.lastName}`,
    eventName: event.name,
    orgName: ctx.organisation.name,
  });

  await writeAudit({
    organisationId: ctx.organisation.id,
    eventId,
    userId: ctx.user.id,
    action: "invitation.resend",
    resource: "invitation",
    resourceId: invitationId,
  });
  revalidatePath(`/app/${orgSlug}/events/${eventId}/invitations`);
}

export async function respondToInvitation(
  rawToken: string,
  decision: "accept" | "decline",
) {
  const limited = await rateLimit(`invite-respond:${rawToken.slice(0, 16)}`, 20, 60);
  if (!limited.success) {
    throw new Error("Too many attempts. Please wait.");
  }

  const invitation = await loadInvitationByToken(rawToken);
  if (!invitation) throw new Error("Invitation not found");
  if (!invitationUsable(invitation.status, invitation.expiresAt)) {
    throw new Error("This invitation is no longer valid");
  }

  const next = decision === "accept" ? InvitationStatus.ACCEPTED : InvitationStatus.DECLINED;
  if (
    invitation.status !== "OPENED" &&
    invitation.status !== "SENT" &&
    invitation.status !== "DELIVERED" &&
    invitation.status !== "ACCEPTED"
  ) {
    if (!canTransition(invitation.status, next)) {
      throw new Error("This invitation cannot be updated");
    }
  }

  await prisma.invitation.update({
    where: { id: invitation.id },
    data: {
      status: next,
      acceptedAt: decision === "accept" ? new Date() : invitation.acceptedAt,
      declinedAt: decision === "decline" ? new Date() : invitation.declinedAt,
    },
  });

  await writeAudit({
    organisationId: invitation.organisationId,
    eventId: invitation.eventId,
    action:
      decision === "accept" ? "invitation.accept" : "invitation.decline",
    resource: "invitation",
    resourceId: invitation.id,
    ip: (await headers()).get("x-forwarded-for"),
  });

  // Never return tokenHash or other invitation internals to the client.
  return { status: next };
}
