"use server";

import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { writeAudit } from "@/modules/audit/log";

export async function exportAttendeesCsv(orgSlug: string, eventId: string) {
  const ctx = await requireEvent(orgSlug, eventId, "reports.export");
  const attendees = await prisma.attendee.findMany({
    where: { eventId, organisationId: ctx.organisation.id },
    include: { category: true },
    orderBy: { lastName: "asc" },
  });

  await writeAudit({
    organisationId: ctx.organisation.id,
    eventId,
    userId: ctx.user.id,
    action: "report.export",
    resource: "attendee",
    metadata: { count: attendees.length },
  });

  const header = [
    "firstName",
    "lastName",
    "email",
    "company",
    "jobTitle",
    "country",
    "category",
    "status",
  ];
  const lines = [
    header.join(","),
    ...attendees.map((a) =>
      [
        a.firstName,
        a.lastName,
        a.email,
        a.company ?? "",
        a.jobTitle ?? "",
        a.country ?? "",
        a.category?.name ?? "",
        a.status,
      ]
        .map(csvCell)
        .join(","),
    ),
  ];
  return lines.join("\n");
}

export async function exportInviteesCsv(orgSlug: string, eventId: string) {
  const ctx = await requireEvent(orgSlug, eventId, "reports.export");
  const contacts = await prisma.contact.findMany({
    where: { eventId, organisationId: ctx.organisation.id },
    include: { invitations: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { lastName: "asc" },
  });

  await writeAudit({
    organisationId: ctx.organisation.id,
    eventId,
    userId: ctx.user.id,
    action: "report.export",
    resource: "contact",
    metadata: { count: contacts.length },
  });

  const header = [
    "firstName",
    "lastName",
    "email",
    "company",
    "invitationStatus",
  ];
  const lines = [
    header.join(","),
    ...contacts.map((c) =>
      [
        c.firstName,
        c.lastName,
        c.email,
        c.company ?? "",
        c.invitations[0]?.status ?? "",
      ]
        .map(csvCell)
        .join(","),
    ),
  ];
  return lines.join("\n");
}

function csvCell(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}
