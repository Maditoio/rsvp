import { Prisma, type InvitationStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export async function writeAudit(input: {
  organisationId?: string | null;
  eventId?: string | null;
  userId?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  metadata?: Prisma.InputJsonValue;
  ip?: string | null;
}) {
  await prisma.auditLog.create({
    data: {
      organisationId: input.organisationId ?? null,
      eventId: input.eventId ?? null,
      userId: input.userId ?? null,
      action: input.action,
      resource: input.resource,
      resourceId: input.resourceId ?? null,
      metadata: input.metadata,
      ip: input.ip ?? null,
    },
  });
}

export const TERMINAL_INVITE_STATUSES: InvitationStatus[] = [
  "EXPIRED",
  "CANCELLED",
  "DECLINED",
];
