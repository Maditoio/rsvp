"use server";

import { revalidatePath } from "next/cache";
import Papa from "papaparse";
import ExcelJS from "exceljs";
import { requireEvent } from "@/lib/authz/require";
import { prisma } from "@/lib/db/prisma";
import { writeAudit } from "@/modules/audit/log";
import { previewImport, type ImportRow } from "@/modules/contacts/parse";

type SheetRow = Record<string, unknown>;

async function parseFile(file: File): Promise<SheetRow[]> {
  const name = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const workbook = new ExcelJS.Workbook();
    // ExcelJS types expect ArrayBuffer-like; Node Buffer is accepted at runtime
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) return [];
    const header: string[] = [];
    const rows: SheetRow[] = [];
    sheet.eachRow((row, index) => {
      const values = (row.values as unknown[]).slice(1).map((v) => String(v ?? ""));
      if (index === 1) {
        header.push(...values);
        return;
      }
      const obj: SheetRow = {};
      header.forEach((h, i) => {
        obj[h] = values[i];
      });
      rows.push(obj);
    });
    return rows;
  }

  const text = buffer.toString("utf8");
  const parsed = Papa.parse<SheetRow>(text, {
    header: true,
    skipEmptyLines: true,
  });
  return parsed.data;
}

export async function previewContactImport(
  orgSlug: string,
  eventId: string,
  formData: FormData,
) {
  await requireEvent(orgSlug, eventId, "invitees.write");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose a CSV or Excel file");
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("File is too large (max 8MB)");
  }

  const rows = await parseFile(file);
  const preview = previewImport(rows);
  const existing = await prisma.contact.findMany({
    where: {
      eventId,
      email: { in: preview.valid.map((r) => r.email) },
    },
    select: { email: true },
  });
  const existingEmails = new Set(existing.map((c) => c.email));
  const duplicates = preview.valid.filter((r) => existingEmails.has(r.email));
  const create = preview.valid.filter((r) => !existingEmails.has(r.email));

  return {
    filename: file.name,
    uploaded: rows.length,
    valid: preview.valid.length,
    createCount: create.length,
    duplicateCount: duplicates.length,
    issues: preview.issues,
    create,
    duplicates,
  };
}

export async function commitContactImport(
  orgSlug: string,
  eventId: string,
  rows: ImportRow[],
) {
  const ctx = await requireEvent(orgSlug, eventId, "invitees.write");

  let created = 0;
  let skipped = 0;

  for (const row of rows) {
    const exists = await prisma.contact.findUnique({
      where: { eventId_email: { eventId, email: row.email } },
    });
    if (exists) {
      skipped += 1;
      continue;
    }

    await prisma.contact.create({
      data: {
        organisationId: ctx.organisation.id,
        eventId,
        email: row.email,
        firstName: row.firstName,
        lastName: row.lastName,
        phone: row.phone || null,
        company: row.company || null,
        jobTitle: row.jobTitle || null,
        country: row.country || null,
        notes: row.notes || null,
        vip: row.vip,
        speaker: row.speaker,
        sponsor: row.sponsor,
      },
    });
    created += 1;
  }

  await writeAudit({
    organisationId: ctx.organisation.id,
    eventId,
    userId: ctx.user.id,
    action: "contacts.import",
    resource: "contact",
    metadata: { created, skipped },
  });

  revalidatePath(`/app/${orgSlug}/events/${eventId}/invitees`);
  return { created, skipped };
}
