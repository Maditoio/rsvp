import "server-only";

import { prisma } from "@/lib/db/prisma";
import { opaqueQrDataUrl } from "@/lib/qr";
import { parseBadgeConfig, selectedSponsors } from "./config";
import { getBadgeTemplate, type BadgeTemplateId } from "./templates";
import type { BadgePrintPayload } from "./print-payload";
import {
  resolveBadgeCredentialForPrint,
  type BadgeCredentialIssueMode,
} from "./credentials";

export type { BadgePrintPayload } from "./print-payload";

export type BadgeListRow = {
  attendeeId: string;
  firstName: string;
  lastName: string;
  company: string | null;
  jobTitle: string | null;
  categoryName: string | null;
  status: string;
  hasQr: boolean;
  badgeId: string | null;
  queueStatus: "QUEUED" | "PRINTED" | null;
  queuedAt: Date | null;
  printedAt: Date | null;
  template: string | null;
  activePrintNumber: number | null;
};

export async function loadBadgeList(
  organisationId: string,
  eventId: string,
): Promise<BadgeListRow[]> {
  const [attendees, badges, credentials] = await Promise.all([
    prisma.attendee.findMany({
      where: { organisationId, eventId },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        company: true,
        jobTitle: true,
        status: true,
        attendanceTokenEnc: true,
        category: { select: { name: true } },
      },
    }),
    prisma.badge.findMany({
      where: { organisationId, eventId },
      select: {
        id: true,
        attendeeId: true,
        status: true,
        queuedAt: true,
        printedAt: true,
        template: true,
      },
    }),
    prisma.badgeCredential.findMany({
      where: { organisationId, eventId, status: "ACTIVE" },
      select: { attendeeId: true, printNumber: true },
    }),
  ]);

  const badgeByAttendee = new Map(badges.map((b) => [b.attendeeId, b]));
  const printByAttendee = new Map(
    credentials.map((c) => [c.attendeeId, c.printNumber]),
  );

  return attendees.map((a) => {
    const badge = badgeByAttendee.get(a.id);
    return {
      attendeeId: a.id,
      firstName: a.firstName,
      lastName: a.lastName,
      company: a.company,
      jobTitle: a.jobTitle,
      categoryName: a.category?.name ?? null,
      status: a.status,
      hasQr: Boolean(a.attendanceTokenEnc),
      badgeId: badge?.id ?? null,
      queueStatus: badge?.status ?? null,
      queuedAt: badge?.queuedAt ?? null,
      printedAt: badge?.printedAt ?? null,
      template: badge?.template ?? null,
      activePrintNumber: printByAttendee.get(a.id) ?? null,
    };
  });
}

export async function loadBadgePrintPayload(
  organisationId: string,
  eventId: string,
  attendeeId: string,
  options?: {
    mode?: BadgeCredentialIssueMode;
    issuedByUserId?: string | null;
  },
): Promise<BadgePrintPayload | null> {
  const event = await prisma.event.findFirst({
    where: { id: eventId, organisationId },
    select: {
      name: true,
      logoUrl: true,
      settings: { select: { badgeConfig: true } },
    },
  });
  if (!event) return null;

  const attendee = await prisma.attendee.findFirst({
    where: { id: attendeeId, eventId, organisationId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      company: true,
      jobTitle: true,
      country: true,
      attendanceTokenEnc: true,
      category: { select: { name: true } },
    },
  });
  // Registered attendees still need a desk QR on record; printed badge uses a separate credential QR.
  if (!attendee?.attendanceTokenEnc) return null;

  const credential = await resolveBadgeCredentialForPrint({
    organisationId,
    eventId,
    attendeeId,
    mode: options?.mode ?? "reuse",
    issuedByUserId: options?.issuedByUserId,
  });

  const config = parseBadgeConfig(event.settings?.badgeConfig);
  const qrDataUrl = await opaqueQrDataUrl(credential.rawToken, {
    dark: config.qrDarkColor,
    light: config.qrLightColor,
    width: Math.max(128, Math.min(1000, config.qrPx * 2)),
  });

  return {
    attendeeId: attendee.id,
    firstName: attendee.firstName,
    lastName: attendee.lastName,
    company: attendee.company,
    jobTitle: attendee.jobTitle,
    categoryName: attendee.category?.name ?? null,
    country: attendee.country,
    eventName: event.name,
    logoUrl: event.logoUrl,
    sponsorLogos: selectedSponsors(config),
    qrDataUrl,
    config,
    template: getBadgeTemplate(config.templateId),
  };
}

export async function ensureBadgeRecord(input: {
  organisationId: string;
  eventId: string;
  attendeeId: string;
  templateId: BadgeTemplateId;
  printedByUserId: string;
}) {
  const existing = await prisma.badge.findUnique({
    where: {
      eventId_attendeeId: {
        eventId: input.eventId,
        attendeeId: input.attendeeId,
      },
    },
  });

  const now = new Date();

  if (existing) {
    return prisma.badge.update({
      where: { id: existing.id },
      data: {
        template: input.templateId,
        status: "PRINTED",
        printedAt: now,
        printedByUserId: input.printedByUserId,
        queuedAt: existing.queuedAt ?? now,
      },
    });
  }

  return prisma.badge.create({
    data: {
      organisationId: input.organisationId,
      eventId: input.eventId,
      attendeeId: input.attendeeId,
      template: input.templateId,
      status: "PRINTED",
      queuedAt: now,
      printedAt: now,
      printedByUserId: input.printedByUserId,
    },
  });
}
