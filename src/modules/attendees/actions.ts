"use server";

import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/authz/require";
import { AuthzError } from "@/lib/db/tenant";
import { decryptSecret } from "@/lib/crypto/secret";
import { opaqueQrDataUrl } from "@/lib/qr";
import { loadInvitationByToken } from "@/modules/invitations/store";

const attendeePortalSelect = {
  id: true,
  status: true,
  firstName: true,
  lastName: true,
  company: true,
  jobTitle: true,
  country: true,
  email: true,
  category: { select: { name: true } },
  event: {
    select: {
      id: true,
      name: true,
      description: true,
      venue: true,
      timezone: true,
      startsAt: true,
      endsAt: true,
      website: true,
    },
  },
  checkIns: {
    orderBy: { checkedInAt: "desc" as const },
    take: 1,
    select: { checkedInAt: true },
  },
  registration: { select: { status: true } },
};

export async function listMyAttendances() {
  const user = await requireUser();
  return prisma.attendee.findMany({
    where: { userId: user.id },
    select: attendeePortalSelect,
    orderBy: { createdAt: "desc" },
  });
}

export async function getMyAttendance(eventId: string) {
  const user = await requireUser();
  const attendee = await prisma.attendee.findFirst({
    where: { eventId, userId: user.id },
    select: attendeePortalSelect,
  });
  if (!attendee) {
    throw new AuthzError("You are not registered for this event", 404);
  }
  return attendee;
}

export async function getMyAttendanceQrDataUrl(eventId: string) {
  const user = await requireUser();
  const attendee = await prisma.attendee.findFirst({
    where: { eventId, userId: user.id },
    select: { attendanceTokenEnc: true },
  });
  if (!attendee) {
    throw new AuthzError("You are not registered for this event", 404);
  }
  if (!attendee.attendanceTokenEnc) {
    throw new Error("A check-in code has not been issued yet");
  }
  const token = decryptSecret(attendee.attendanceTokenEnc);
  return opaqueQrDataUrl(token);
}

/** Invitation-token holder may re-display the opaque QR after registration. */
export async function getQrForInvitationHolder(rawToken: string) {
  const invitation = await loadInvitationByToken(rawToken);
  if (!invitation) return null;
  const attendee = await prisma.attendee.findFirst({
    where: {
      invitationId: invitation.id,
      organisationId: invitation.organisationId,
    },
    select: { attendanceTokenEnc: true, firstName: true, status: true },
  });
  if (!attendee?.attendanceTokenEnc) return null;
  const token = decryptSecret(attendee.attendanceTokenEnc);
  return {
    dataUrl: await opaqueQrDataUrl(token),
    firstName: attendee.firstName,
    status: attendee.status,
  };
}
