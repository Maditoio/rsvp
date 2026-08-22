import { prisma } from "@/lib/db/prisma";
import {
  DEFAULT_REGISTRATION_FIELDS,
  FIELD_TYPES,
  type FieldType,
  type FormFieldDef,
} from "@/modules/registrations/defaults";
import { parseAccessibilityValues } from "@/modules/registrations/accessibility";
import { isValidEmail } from "@/lib/validation";

export type StoredField = FormFieldDef & { id: string };

export async function ensureDefaultRegistrationForm(
  organisationId: string,
  eventId: string,
) {
  const existing = await prisma.registrationForm.findUnique({
    where: { eventId },
    include: { fields: { orderBy: { sortOrder: "asc" } } },
  });
  if (existing) {
    return {
      ...existing,
      fields: existing.fields.map(toStoredField),
    };
  }

  const form = await prisma.registrationForm.create({
    data: {
      organisationId,
      eventId,
      name: "Default",
      isDefault: true,
      fields: {
        create: DEFAULT_REGISTRATION_FIELDS.map((field) => ({
          organisationId,
          eventId,
          key: field.key,
          label: field.label,
          type: field.type,
          required: field.required,
          options: field.options ?? undefined,
          sortOrder: field.sortOrder,
        })),
      },
    },
    include: { fields: { orderBy: { sortOrder: "asc" } } },
  });

  return {
    ...form,
    fields: form.fields.map(toStoredField),
  };
}

function toStoredField(field: {
  id: string;
  key: string;
  label: string;
  type: string;
  required: boolean;
  options: unknown;
  sortOrder: number;
}): StoredField {
  return {
    id: field.id,
    key: field.key,
    label: field.label,
    type: isFieldType(field.type) ? field.type : "text",
    required: field.required,
    options: Array.isArray(field.options)
      ? field.options.filter((value): value is string => typeof value === "string")
      : undefined,
    sortOrder: field.sortOrder,
  };
}

function isFieldType(value: string): value is FieldType {
  return (FIELD_TYPES as readonly string[]).includes(value);
}

export function parseFormValues(fields: FormFieldDef[], formData: FormData) {
  const parsed = parseFormValuesRaw(fields, formData);
  if (!parsed.ok) {
    throw new Error(parsed.error);
  }
  return parsed.data;
}

export function parseFormValuesSafe(
  fields: FormFieldDef[],
  formData: FormData,
): { ok: true; data: Record<string, string | string[]> } | { ok: false; error: string } {
  return parseFormValuesRaw(fields, formData);
}

function parseFormValuesRaw(
  fields: FormFieldDef[],
  formData: FormData,
): { ok: true; data: Record<string, string | string[]> } | { ok: false; error: string } {
  const data: Record<string, string | string[]> = {};
  const errors: string[] = [];

  for (const field of fields) {
    const multi =
      field.type === "checkbox" ||
      field.type === "multiselect" ||
      field.type === "iconpicker";
    const value = multi
      ? formData.getAll(field.key).map(String).filter(Boolean)
      : String(formData.get(field.key) ?? "").trim();

    if (field.required) {
      const empty = Array.isArray(value) ? value.length === 0 : value.length === 0;
      if (empty) errors.push(`${field.label} is required.`);
    }

    if (!Array.isArray(value) && field.type === "email" && value) {
      if (!isValidEmail(value)) {
        errors.push(`${field.label} must be a valid email address.`);
      }
    }

    if (field.type === "iconpicker" && Array.isArray(value)) {
      data[field.key] = parseAccessibilityValues(value);
      continue;
    }

    data[field.key] = value;
  }

  if (errors.length > 0) {
    return { ok: false, error: errors[0] };
  }

  return { ok: true, data };
}

export function scalar(data: Record<string, string | string[]>, key: string) {
  const value = data[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
