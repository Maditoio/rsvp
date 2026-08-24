import "server-only";

import { prisma } from "@/lib/db/prisma";
import { generateOpaqueToken } from "@/lib/crypto/tokens";
import { encryptSecret, decryptSecret } from "@/lib/crypto/secret";
import { writeAudit } from "@/modules/audit/log";

export type BadgeCredentialIssueMode = "reuse" | "rotate";

export type IssuedBadgeCredential = {
  id: string;
  attendeeId: string;
  printNumber: number;
  rawToken: string;
  rotated: boolean;
};

/**
 * Get the active printed-badge credential, or create the first one.
 * Does NOT touch Attendee.qrTokenHash (desk check-in stays independent).
 */
export async function getOrCreateActiveBadgeCredential(input: {
  organisationId: string;
  eventId: string;
  attendeeId: string;
  issuedByUserId?: string | null;
}): Promise<IssuedBadgeCredential> {
  const existing = await prisma.badgeCredential.findFirst({
    where: {
      organisationId: input.organisationId,
      eventId: input.eventId,
      attendeeId: input.attendeeId,
      status: "ACTIVE",
    },
    orderBy: { printNumber: "desc" },
  });

  if (existing) {
    return {
      id: existing.id,
      attendeeId: existing.attendeeId,
      printNumber: existing.printNumber,
      rawToken: decryptSecret(existing.tokenEnc),
      rotated: false,
    };
  }

  return createCredential(input, 1, false);
}

/**
 * Revoke the active credential (if any) and issue a new print number.
 * Old physical badges stop working at entrance scan.
 */
export async function rotateBadgeCredential(input: {
  organisationId: string;
  eventId: string;
  attendeeId: string;
  issuedByUserId?: string | null;
  reason?: string;
}): Promise<IssuedBadgeCredential> {
  const issued = await prisma.$transaction(async (tx) => {
    const active = await tx.badgeCredential.findFirst({
      where: {
        organisationId: input.organisationId,
        eventId: input.eventId,
        attendeeId: input.attendeeId,
        status: "ACTIVE",
      },
      orderBy: { printNumber: "desc" },
    });

    const nextNumber = (active?.printNumber ?? 0) + 1;

    // Revoke first so two ACTIVE credentials never coexist.
    if (active) {
      await tx.badgeCredential.update({
        where: { id: active.id },
        data: {
          status: "REVOKED",
          revokedAt: new Date(),
          revokedReason: input.reason ?? "reprinted",
        },
      });
    }

    const { raw, hash } = generateOpaqueToken();
    const row = await tx.badgeCredential.create({
      data: {
        organisationId: input.organisationId,
        eventId: input.eventId,
        attendeeId: input.attendeeId,
        tokenHash: hash,
        tokenEnc: encryptSecret(raw),
        status: "ACTIVE",
        printNumber: nextNumber,
        issuedByUserId: input.issuedByUserId ?? null,
      },
    });

    if (active) {
      await tx.badgeCredential.update({
        where: { id: active.id },
        data: { replacedById: row.id },
      });
    }

    return {
      id: row.id,
      attendeeId: row.attendeeId,
      printNumber: row.printNumber,
      rawToken: raw,
      rotated: true as const,
      previousCredentialId: active?.id ?? null,
    };
  });

  await writeAudit({
    organisationId: input.organisationId,
    eventId: input.eventId,
    userId: input.issuedByUserId ?? null,
    action: "badge.credential_rotate",
    resource: "attendee",
    resourceId: input.attendeeId,
    metadata: {
      previousCredentialId: issued.previousCredentialId,
      newCredentialId: issued.id,
      printNumber: issued.printNumber,
    },
  });

  return {
    id: issued.id,
    attendeeId: issued.attendeeId,
    printNumber: issued.printNumber,
    rawToken: issued.rawToken,
    rotated: issued.rotated,
  };
}

async function createCredential(
  input: {
    organisationId: string;
    eventId: string;
    attendeeId: string;
    issuedByUserId?: string | null;
  },
  printNumber: number,
  rotated: boolean,
): Promise<IssuedBadgeCredential> {
  const { raw, hash } = generateOpaqueToken();
  const row = await prisma.badgeCredential.create({
    data: {
      organisationId: input.organisationId,
      eventId: input.eventId,
      attendeeId: input.attendeeId,
      tokenHash: hash,
      tokenEnc: encryptSecret(raw),
      status: "ACTIVE",
      printNumber,
      issuedByUserId: input.issuedByUserId ?? null,
    },
  });

  return {
    id: row.id,
    attendeeId: row.attendeeId,
    printNumber: row.printNumber,
    rawToken: raw,
    rotated,
  };
}

export async function resolveBadgeCredentialForPrint(input: {
  organisationId: string;
  eventId: string;
  attendeeId: string;
  mode: BadgeCredentialIssueMode;
  issuedByUserId?: string | null;
}): Promise<IssuedBadgeCredential> {
  if (input.mode === "rotate") {
    return rotateBadgeCredential(input);
  }
  return getOrCreateActiveBadgeCredential(input);
}
