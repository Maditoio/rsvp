import type { InvitationStatus } from "@prisma/client";

const ALLOWED: Record<InvitationStatus, InvitationStatus[]> = {
  DRAFT: ["SCHEDULED", "SENT", "CANCELLED"],
  SCHEDULED: ["SENT", "CANCELLED"],
  SENT: ["DELIVERED", "OPENED", "BOUNCED", "CANCELLED", "EXPIRED"],
  DELIVERED: ["OPENED", "ACCEPTED", "DECLINED", "CANCELLED", "EXPIRED"],
  OPENED: ["ACCEPTED", "DECLINED", "CANCELLED", "EXPIRED"],
  ACCEPTED: ["CANCELLED"],
  DECLINED: [],
  EXPIRED: [],
  BOUNCED: ["SENT", "CANCELLED"],
  CANCELLED: [],
};

export function canTransition(
  from: InvitationStatus,
  to: InvitationStatus,
) {
  return ALLOWED[from]?.includes(to) ?? false;
}

export function invitationUsable(status: InvitationStatus, expiresAt: Date | null) {
  if (status === "CANCELLED" || status === "EXPIRED" || status === "DECLINED") {
    return false;
  }
  if (expiresAt && expiresAt.getTime() < Date.now()) {
    return false;
  }
  return true;
}
