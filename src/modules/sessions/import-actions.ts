"use server";

import { revalidatePath } from "next/cache";
import { requireEvent } from "@/lib/authz/require";
import { prisma } from "@/lib/db/prisma";
import { writeAudit } from "@/modules/audit/log";
import {
  actionFail,
  actionOk,
  runAction,
  type ActionResult,
} from "@/lib/action-result";
import {
  parseSessionImportFile,
  previewSessionImport,
  type SessionImportRow,
} from "@/modules/sessions/parse";

export type SessionImportPreviewResult = {
  filename: string;
  uploaded: number;
  valid: number;
  issueCount: number;
  issues: ReturnType<typeof previewSessionImport>["issues"];
  rows: SessionImportRow[];
  timezone: string;
};

export async function previewAgendaImport(
  orgSlug: string,
  eventId: string,
  formData: FormData,
): Promise<ActionResult<SessionImportPreviewResult>> {
  return runAction(async () => {
    const ctx = await requireEvent(orgSlug, eventId, "event.update");
    const event = await prisma.event.findFirst({
      where: { id: eventId, organisationId: ctx.organisation.id },
      select: { timezone: true },
    });
    const timezone = event?.timezone || "UTC";

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      throw new Error("Choose a CSV or Excel file");
    }
    if (file.size > 8 * 1024 * 1024) {
      throw new Error("File is too large (max 8MB)");
    }

    const rows = await parseSessionImportFile(file);
    if (rows.length === 0) {
      throw new Error("No data rows found in this file.");
    }

    const preview = previewSessionImport(rows, undefined, timezone);
    return {
      filename: file.name,
      uploaded: rows.length,
      valid: preview.valid.length,
      issueCount: preview.issues.length,
      issues: preview.issues,
      rows: preview.valid,
      timezone,
    };
  }, "Could not preview agenda import");
}

export async function commitAgendaImport(
  orgSlug: string,
  eventId: string,
  rows: SessionImportRow[],
): Promise<ActionResult<{ created: number }>> {
  try {
    const ctx = await requireEvent(orgSlug, eventId, "event.update");
    if (rows.length === 0) {
      return actionFail("No valid sessions to import.");
    }
    if (rows.length > 500) {
      return actionFail("Import at most 500 sessions at a time.");
    }

    let created = 0;
    for (const row of rows) {
      await prisma.session.create({
        data: {
          organisationId: ctx.organisation.id,
          eventId,
          title: row.title,
          description: row.description,
          location: row.location,
          startsAt: row.startsAt,
          endsAt: row.endsAt,
          format: row.format,
        },
      });
      created += 1;
    }

    await writeAudit({
      organisationId: ctx.organisation.id,
      eventId,
      userId: ctx.user.id,
      action: "session.import",
      resource: "session",
      metadata: { created, uploaded: rows.length },
    });

    revalidatePath(`/app/${orgSlug}/events/${eventId}/agenda`);
    revalidatePath(`/me/events/${eventId}/agenda`);
    return actionOk({ created });
  } catch (error) {
    if (error instanceof Error && error.message.length < 220) {
      return actionFail(error.message);
    }
    return actionFail("Could not import sessions");
  }
}
