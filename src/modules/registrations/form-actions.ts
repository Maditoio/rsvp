"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { writeAudit } from "@/modules/audit/log";
import { toSlug } from "@/lib/utils";
import {
  FIELD_TYPES,
  LOCKED_FIELD_KEYS,
} from "@/modules/registrations/defaults";
import { ensureDefaultRegistrationForm } from "@/modules/registrations/form";

const fieldSchema = z.object({
  fieldId: z.string().optional(),
  label: z.string().min(1).max(80),
  type: z.enum(FIELD_TYPES),
  required: z.enum(["true", "false"]).optional(),
  options: z.string().optional(),
});

function parseOptions(raw: string | undefined, type: string) {
  if (!["select", "radio", "checkbox", "multiselect"].includes(type)) {
    return undefined;
  }
  const options = (raw ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (options.length === 0) {
    throw new Error("List at least one option, one per line.");
  }
  return options;
}

export async function saveRegistrationField(
  orgSlug: string,
  eventId: string,
  formData: FormData,
) {
  const ctx = await requireEvent(orgSlug, eventId, "event.update");
  const input = fieldSchema.parse({
    fieldId: String(formData.get("fieldId") ?? "") || undefined,
    label: String(formData.get("label") ?? ""),
    type: String(formData.get("type") ?? "text"),
    required: formData.get("required") ? "true" : "false",
    options: String(formData.get("options") ?? ""),
  });
  const form = await ensureDefaultRegistrationForm(ctx.organisation.id, eventId);
  const options = parseOptions(input.options, input.type);
  const required = input.required === "true";

  if (input.fieldId) {
    const existing = form.fields.find((field) => field.id === input.fieldId);
    if (!existing) throw new Error("Field not found");
    const locked = LOCKED_FIELD_KEYS.includes(
      existing.key as (typeof LOCKED_FIELD_KEYS)[number],
    );
    await prisma.registrationField.update({
      where: { id: input.fieldId },
      data: {
        label: input.label,
        type: locked ? existing.type : input.type,
        required: locked ? true : required,
        options: locked ? undefined : options,
      },
    });
  } else {
    const key = `${toSlug(input.label) || "field"}-${Math.random().toString(36).slice(2, 5)}`;
    const sortOrder = form.fields.reduce((max, field) => Math.max(max, field.sortOrder), 0) + 1;
    await prisma.registrationField.create({
      data: {
        organisationId: ctx.organisation.id,
        eventId,
        formId: form.id,
        key,
        label: input.label,
        type: input.type,
        required,
        options,
        sortOrder,
      },
    });
  }

  await writeAudit({
    organisationId: ctx.organisation.id,
    eventId,
    userId: ctx.user.id,
    action: "registration.field.save",
    resource: "registration_field",
  });
  revalidatePath(`/app/${orgSlug}/events/${eventId}/registration-form`);
}

export async function deleteRegistrationField(
  orgSlug: string,
  eventId: string,
  formData: FormData,
) {
  const ctx = await requireEvent(orgSlug, eventId, "event.update");
  const fieldId = z.string().min(1).parse(String(formData.get("fieldId") ?? ""));
  const form = await ensureDefaultRegistrationForm(ctx.organisation.id, eventId);
  const existing = form.fields.find((field) => field.id === fieldId);
  if (!existing) throw new Error("Field not found");
  if (LOCKED_FIELD_KEYS.includes(existing.key as (typeof LOCKED_FIELD_KEYS)[number])) {
    throw new Error("Name and email fields cannot be removed.");
  }
  await prisma.registrationField.delete({ where: { id: fieldId } });
  await writeAudit({
    organisationId: ctx.organisation.id,
    eventId,
    userId: ctx.user.id,
    action: "registration.field.delete",
    resource: "registration_field",
    resourceId: fieldId,
  });
  revalidatePath(`/app/${orgSlug}/events/${eventId}/registration-form`);
}
