import { prisma } from "@/lib/db/prisma";
import { formatEventWindow } from "@/lib/utils";
import {
  loadInvitationByToken,
  markInvitationOpened,
} from "@/modules/invitations/store";
import { invitationUsable } from "@/modules/invitations/lifecycle";

export type InvitationGate =
  | "ok"
  | "missing"
  | "cancelled"
  | "expired"
  | "declined"
  | "not-ready";

export type PublicInvitation = {
  gate: Exclude<InvitationGate, "missing">;
  eventName: string;
  orgName: string;
  venue: string | null;
  when: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  jobTitle: string;
  country: string;
  status: string;
  accepted: boolean;
  registered: boolean;
};

export async function getPublicInvitation(
  rawToken: string,
  options: { markOpened?: boolean } = {},
): Promise<{ gate: "missing" } | PublicInvitation> {
  const invitation = options.markOpened
    ? await markInvitationOpened(rawToken)
    : await loadInvitationByToken(rawToken);

  if (!invitation) return { gate: "missing" };

  const attendee = await prisma.attendee.findFirst({
    where: {
      invitationId: invitation.id,
      organisationId: invitation.organisationId,
    },
    select: { id: true },
  });

  const expiredByDate =
    invitation.expiresAt !== null && invitation.expiresAt.getTime() < Date.now();

  let gate: Exclude<InvitationGate, "missing"> = "ok";
  if (invitation.status === "CANCELLED") {
    gate = "cancelled";
  } else if (invitation.status === "EXPIRED" || expiredByDate) {
    gate = "expired";
  } else if (invitation.status === "DECLINED") {
    gate = "declined";
  } else if (
    invitation.status === "DRAFT" ||
    invitation.status === "SCHEDULED" ||
    invitation.status === "BOUNCED"
  ) {
    gate = "not-ready";
  } else if (!invitationUsable(invitation.status, invitation.expiresAt)) {
    gate = "expired";
  }

  return {
    gate,
    eventName: invitation.event.name,
    orgName: invitation.organisation.name,
    venue: invitation.event.venue,
    when: formatEventWindow(
      invitation.event.startsAt,
      invitation.event.endsAt,
      invitation.event.timezone,
    ),
    firstName: invitation.contact.firstName,
    lastName: invitation.contact.lastName,
    email: invitation.contact.email,
    phone: invitation.contact.phone ?? "",
    company: invitation.contact.company ?? "",
    jobTitle: invitation.contact.jobTitle ?? "",
    country: invitation.contact.country ?? "",
    status: invitation.status,
    accepted: invitation.status === "ACCEPTED",
    registered: Boolean(attendee),
  };
}
