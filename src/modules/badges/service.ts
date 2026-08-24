import "server-only";

import { prisma } from "@/lib/db/prisma";
import { decryptSecret } from "@/lib/crypto/secret";
import { opaqueQrDataUrl } from "@/lib/qr";
import { parseBadgeConfig, selectedSponsors, type BadgeConfig } from "./config";
import { getBadgeTemplate, type BadgeTemplateId } from "./templates";
import type { BadgePrintPayload } from "./print-payload";

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
  printedAt: Date | null;
  template: string | null;
};

export async function loadBadgeList(
  organisationId: string,
  eventId: string,
): Promise<BadgeListRow[]> {
  const [attendees, badges] = await Promise.all([
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
        printedAt: true,
        template: true,
      },
    }),
  ]);

  const badgeByAttendee = new Map(badges.map((b) => [b.attendeeId, b]));

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
      printedAt: badge?.printedAt ?? null,
      template: badge?.template ?? null,
    };
  });
}

export async function loadBadgePrintPayload(
  organisationId: string,
  eventId: string,
  attendeeId: string,
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
  if (!attendee?.attendanceTokenEnc) return null;

  const token = decryptSecret(attendee.attendanceTokenEnc);
  const config = parseBadgeConfig(event.settings?.badgeConfig);
  const qrDataUrl = await opaqueQrDataUrl(token, {
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
  const existing = await prisma.badge.findFirst({
    where: {
      organisationId: input.organisationId,
      eventId: input.eventId,
      attendeeId: input.attendeeId,
    },
  });

  if (existing) {
    return prisma.badge.update({
      where: { id: existing.id },
      data: {
        template: input.templateId,
        printedAt: new Date(),
        printedByUserId: input.printedByUserId,
      },
    });
  }

  return prisma.badge.create({
    data: {
      organisationId: input.organisationId,
      eventId: input.eventId,
      attendeeId: input.attendeeId,
      template: input.templateId,
      printedAt: new Date(),
      printedByUserId: input.printedByUserId,
    },
  });
}
