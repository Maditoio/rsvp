"use server";

import { revalidatePath } from "next/cache";
import Papa from "papaparse";
import ExcelJS from "exceljs";
import { requireEvent } from "@/lib/authz/require";
import { prisma } from "@/lib/db/prisma";
import { writeAudit } from "@/modules/audit/log";
import { generateOpaqueToken } from "@/lib/crypto/tokens";
import {
  contactCreateFromFormData,
  contactCreateSchema,
  guessColumnMap,
  previewImport,
  validateColumnMap,
  type ColumnMap,
  type ImportFieldKey,
  type ImportRow,
} from "@/modules/contacts/parse";

type SheetRow = Record<string, unknown>;

async function invitationExpiry(eventId: string) {
  let expiryDays = 30;
  try {
    const settings = await prisma.eventSettings.findUnique({
      where: { eventId },
      select: { invitationExpiryDays: true },
    });
    expiryDays = settings?.invitationExpiryDays ?? 30;
  } catch {
    // mid-migration fallback
  }
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiryDays);
  return expiresAt;
}

async function createDraftInvitation(input: {
  organisationId: string;
  eventId: string;
  contactId: string;
  categoryId?: string | null;
}) {
  const existing = await prisma.invitation.findFirst({
    where: {
      contactId: input.contactId,
      eventId: input.eventId,
      status: { notIn: ["CANCELLED", "EXPIRED", "DECLINED"] },
    },
    select: { id: true },
  });
  if (existing) return;

  const token = generateOpaqueToken();
  await prisma.invitation.create({
    data: {
      organisationId: input.organisationId,
      eventId: input.eventId,
      contactId: input.contactId,
      categoryId: input.categoryId || null,
      status: "DRAFT",
      tokenHash: token.hash,
      expiresAt: await invitationExpiry(input.eventId),
    },
  });
}

async function parseFile(file: File): Promise<SheetRow[]> {
  const name = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const workbook = new ExcelJS.Workbook();
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

function parseColumnMap(raw: FormDataEntryValue | null): ColumnMap | undefined {
  if (typeof raw !== "string" || !raw.trim()) return undefined;
  const parsed = JSON.parse(raw) as Record<string, string>;
  const map: ColumnMap = {};
  for (const [header, field] of Object.entries(parsed)) {
    map[header] = field as ImportFieldKey;
  }
  return map;
}

export async function inspectContactImport(
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
  if (rows.length === 0) {
    throw new Error("No data rows found in this file.");
  }

  const headers = Object.keys(rows[0]!).filter((h) => h.trim() !== "");
  if (headers.length === 0) {
    throw new Error("Could not read column headers from the first row.");
  }

  const suggestedMap = guessColumnMap(headers);
  const samples = rows.slice(0, 3).map((row) => {
    const sample: Record<string, string> = {};
    for (const h of headers) {
      sample[h] = row[h] != null ? String(row[h]) : "";
    }
    return sample;
  });

  return {
    filename: file.name,
    rowCount: rows.length,
    headers,
    suggestedMap,
    samples,
  };
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

  const columnMap = parseColumnMap(formData.get("columnMap"));
  if (columnMap) {
    const mapError = validateColumnMap(columnMap);
    if (mapError) throw new Error(mapError);
  }

  const rows = await parseFile(file);
  const preview = previewImport(rows, columnMap);
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

  const categories = await prisma.invitationCategory.findMany({
    where: { eventId, organisationId: ctx.organisation.id },
    select: { id: true, name: true },
  });
  const categoryByName = new Map(
    categories.map((c) => [c.name.trim().toLowerCase(), c.id]),
  );

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

    const categoryId = row.category
      ? categoryByName.get(row.category.trim().toLowerCase()) ?? null
      : null;

    const contact = await prisma.contact.create({
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
        notes: null,
        vip: false,
        speaker: false,
        sponsor: false,
      },
    });

    if (categoryId) {
      await createDraftInvitation({
        organisationId: ctx.organisation.id,
        eventId,
        contactId: contact.id,
        categoryId,
      });
    }

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
  revalidatePath(`/app/${orgSlug}/events/${eventId}/invitations`);
  return { created, skipped };
}

function emptyToNull(value?: string) {
  return value ? value : null;
}

export async function createContact(
  orgSlug: string,
  eventId: string,
  formData: FormData,
) {
  const ctx = await requireEvent(orgSlug, eventId, "invitees.write");
  const parsed = contactCreateSchema.safeParse(contactCreateFromFormData(formData));
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ?? "Check the invitee details and try again.",
    );
  }
  const input = parsed.data;
  const categoryId = String(formData.get("categoryId") ?? "").trim() || null;

  if (categoryId) {
    const category = await prisma.invitationCategory.findFirst({
      where: {
        id: categoryId,
        eventId,
        organisationId: ctx.organisation.id,
      },
      select: { id: true },
    });
    if (!category) throw new Error("Category not found for this event.");
  }

  const exists = await prisma.contact.findFirst({
    where: {
      eventId,
      organisationId: ctx.organisation.id,
      email: input.email,
    },
    select: { id: true },
  });
  if (exists) {
    throw new Error("An invitee with this email is already on this event.");
  }

  const contact = await prisma.contact.create({
    data: {
      organisationId: ctx.organisation.id,
      eventId,
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: emptyToNull(input.phone),
      company: emptyToNull(input.company),
      jobTitle: emptyToNull(input.jobTitle),
      country: emptyToNull(input.country),
      notes: null,
      vip: false,
      speaker: false,
      sponsor: false,
    },
  });

  if (categoryId) {
    await createDraftInvitation({
      organisationId: ctx.organisation.id,
      eventId,
      contactId: contact.id,
      categoryId,
    });
  }

  await writeAudit({
    organisationId: ctx.organisation.id,
    eventId,
    userId: ctx.user.id,
    action: "contact.create",
    resource: "contact",
    resourceId: contact.id,
    metadata: { email: contact.email, categoryId },
  });

  revalidatePath(`/app/${orgSlug}/events/${eventId}/invitees`);
  revalidatePath(`/app/${orgSlug}/events/${eventId}/invitations`);
  return {
    id: contact.id,
    firstName: contact.firstName,
    lastName: contact.lastName,
  };
}

export async function deleteContact(
  orgSlug: string,
  eventId: string,
  contactId: string,
) {
  const ctx = await requireEvent(orgSlug, eventId, "invitees.write");

  const contact = await prisma.contact.findFirst({
    where: {
      id: contactId,
      eventId,
      organisationId: ctx.organisation.id,
    },
    select: {
      id: true,
      email: true,
      attendees: { select: { id: true }, take: 1 },
    },
  });
  if (!contact) throw new Error("Invitee not found");
  if (contact.attendees.length > 0) {
    throw new Error(
      "This invitee has already registered. Remove them from attendees first, or cancel their invitation instead.",
    );
  }

  await prisma.contact.delete({ where: { id: contact.id } });

  await writeAudit({
    organisationId: ctx.organisation.id,
    eventId,
    userId: ctx.user.id,
    action: "contact.delete",
    resource: "contact",
    resourceId: contact.id,
    metadata: { email: contact.email },
  });

  revalidatePath(`/app/${orgSlug}/events/${eventId}/invitees`);
  revalidatePath(`/app/${orgSlug}/events/${eventId}/invitations`);
}
