import { prisma } from "@/lib/db/prisma";
import { hashToken } from "@/lib/crypto/tokens";
import { invitationUsable } from "@/modules/invitations/lifecycle";

/** Server-only token lookup. Not a server action — never serialize tokenHash to clients. */
export async function loadInvitationByToken(rawToken: string) {
  const hash = hashToken(rawToken);
  return prisma.invitation.findUnique({
    where: { tokenHash: hash },
    include: {
      event: true,
      contact: true,
      category: true,
      organisation: true,
    },
  });
}

export async function markInvitationOpened(rawToken: string) {
  const invitation = await loadInvitationByToken(rawToken);
  if (!invitation) return null;
  if (!invitationUsable(invitation.status, invitation.expiresAt)) return invitation;
  if (invitation.status === "SENT" || invitation.status === "DELIVERED") {
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: "OPENED", openedAt: invitation.openedAt ?? new Date() },
    });
  }
  return loadInvitationByToken(rawToken);
}
