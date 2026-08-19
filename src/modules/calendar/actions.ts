"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/authz/require";
import { writeAudit } from "@/modules/audit/log";

export async function disconnectCalendar(eventId: string, connectionId: string) {
  const user = await requireUser();

  const connection = await prisma.calendarConnection.findFirst({
    where: { id: connectionId, userId: user.id },
  });
  if (!connection) throw new Error("Calendar connection not found");

  await prisma.calendarEvent.deleteMany({
    where: { connectionId: connection.id },
  });
  await prisma.calendarConnection.delete({
    where: { id: connection.id },
  });

  await writeAudit({
    organisationId: connection.organisationId,
    userId: user.id,
    action: "calendar.disconnect",
    resource: "calendar_connection",
    resourceId: connection.id,
    metadata: { provider: connection.provider },
  });

  revalidatePath(`/me/events/${eventId}/calendar`);
}
