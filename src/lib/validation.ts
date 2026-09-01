import { z } from "zod";
import { parseDatetimeLocalValue } from "@/lib/timezone";

/** Shared email pattern for client-side checks and import previews. */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && EMAIL_RE.test(trimmed);
}

export const emailFieldSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Enter a valid email address")
  .transform(normalizeEmail);

export const optionalEmailFieldSchema = z
  .string()
  .trim()
  .refine((value) => value === "" || isValidEmail(value), {
    message: "Enter a valid email address",
  })
  .transform((value) => (value ? normalizeEmail(value) : ""))
  .optional()
  .or(z.literal(""));

export const optionalUrlSchema = z
  .string()
  .trim()
  .refine((value) => value === "" || /^https?:\/\/.+/i.test(value), {
    message: "Enter a valid URL starting with http:// or https://",
  })
  .optional()
  .or(z.literal(""));

export const meetingMessageSchema = z
  .string()
  .max(500, "Message must be 500 characters or fewer")
  .optional()
  .or(z.literal(""));

export function zodFieldErrors<T extends string>(
  error: z.ZodError,
): Partial<Record<T, string>> {
  const fields: Partial<Record<T, string>> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in fields)) {
      fields[key as T] = issue.message;
    }
  }
  return fields;
}

export function parseDateRange(
  startsAtRaw: string,
  endsAtRaw: string,
  options?: { requireBoth?: boolean },
): { ok: true; startsAt: Date; endsAt: Date } | { ok: false; error: string } {
  const requireBoth = options?.requireBoth ?? true;
  const startsTrimmed = startsAtRaw.trim();
  const endsTrimmed = endsAtRaw.trim();

  if (requireBoth && (!startsTrimmed || !endsTrimmed)) {
    return { ok: false, error: "Start and end times are required." };
  }
  if (!startsTrimmed && !endsTrimmed) {
    return {
      ok: false,
      error: "Start and end times are required.",
    };
  }

  const startsAt = startsTrimmed ? new Date(startsTrimmed) : null;
  const endsAt = endsTrimmed ? new Date(endsTrimmed) : null;

  if (
    (startsAt && Number.isNaN(startsAt.getTime())) ||
    (endsAt && Number.isNaN(endsAt.getTime()))
  ) {
    return { ok: false, error: "Enter valid start and end times." };
  }

  if (startsAt && endsAt && endsAt <= startsAt) {
    return { ok: false, error: "End time must be after start time." };
  }

  if (!startsAt || !endsAt) {
    return { ok: false, error: "Start and end times are required." };
  }

  return { ok: true, startsAt, endsAt };
}

export function parseOptionalDateRange(
  startsAtRaw: string,
  endsAtRaw: string,
  timeZone?: string,
): { ok: true; startsAt: Date | null; endsAt: Date | null } | { ok: false; error: string } {
  const startsTrimmed = startsAtRaw.trim();
  const endsTrimmed = endsAtRaw.trim();

  if (!startsTrimmed && !endsTrimmed) {
    return { ok: true, startsAt: null, endsAt: null };
  }
  if (!startsTrimmed || !endsTrimmed) {
    return { ok: false, error: "Provide both start and end times, or leave both blank." };
  }

  const startsAt = timeZone
    ? parseDatetimeLocalValue(startsTrimmed, timeZone)
    : new Date(startsTrimmed);
  const endsAt = timeZone
    ? parseDatetimeLocalValue(endsTrimmed, timeZone)
    : new Date(endsTrimmed);
  if (!startsAt || !endsAt || Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return { ok: false, error: "Enter valid start and end times." };
  }
  if (endsAt <= startsAt) {
    return { ok: false, error: "End time must be after start time." };
  }

  return { ok: true, startsAt, endsAt };
}
