import { prisma } from "@/lib/db/prisma";
import {
  PUBLIC_ATTENDANCE_TYPES,
  type PublicAttendanceSlug,
} from "@/modules/applications/attendance-types";

/** Find or create a stable public attendance category for this event. */
export async function ensurePublicAttendanceCategory(input: {
  organisationId: string;
  eventId: string;
  slug: PublicAttendanceSlug;
}) {
  const type = PUBLIC_ATTENDANCE_TYPES.find((t) => t.slug === input.slug);
  if (!type) {
    throw new Error("Invalid attendance type.");
  }

  const existing = await prisma.invitationCategory.findUnique({
    where: {
      eventId_slug: { eventId: input.eventId, slug: type.slug },
    },
  });
  if (existing) return existing;

  try {
    return await prisma.invitationCategory.create({
      data: {
        organisationId: input.organisationId,
        eventId: input.eventId,
        name: type.name,
        slug: type.slug,
      },
    });
  } catch {
    // Concurrent create — re-read.
    const raced = await prisma.invitationCategory.findUnique({
      where: {
        eventId_slug: { eventId: input.eventId, slug: type.slug },
      },
    });
    if (!raced) throw new Error("Could not resolve attendance category.");
    return raced;
  }
}
