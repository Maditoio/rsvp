"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireEvent, requireOrg } from "@/lib/authz/require";
import { writeAudit } from "@/modules/audit/log";
import { toSlug } from "@/lib/utils";
import { DEFAULT_CATEGORIES } from "@/modules/events/defaults";

const eventSchema = z.object({
  name: z.string().min(2).max(160),
  description: z.string().max(4000).optional().or(z.literal("")),
  venue: z.string().max(200).optional().or(z.literal("")),
  timezone: z.string().min(1).max(80),
  startsAt: z.string().optional().or(z.literal("")),
  endsAt: z.string().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
});

function parseDate(value?: string) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function createEvent(orgSlug: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug, "event.create");
  const input = eventSchema.parse({
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    venue: String(formData.get("venue") ?? ""),
    timezone: String(formData.get("timezone") ?? "UTC"),
    startsAt: String(formData.get("startsAt") ?? ""),
    endsAt: String(formData.get("endsAt") ?? ""),
    website: String(formData.get("website") ?? ""),
  });

  let slug = toSlug(input.name) || "event";
  const taken = await prisma.event.findUnique({
    where: {
      organisationId_slug: { organisationId: ctx.organisation.id, slug },
    },
  });
  if (taken) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

  const event = await prisma.event.create({
    data: {
      organisationId: ctx.organisation.id,
      name: input.name,
      slug,
      description: input.description || null,
      venue: input.venue || null,
      timezone: input.timezone,
      startsAt: parseDate(input.startsAt),
      endsAt: parseDate(input.endsAt),
      website: input.website || null,
      settings: { create: { organisationId: ctx.organisation.id } },
      invitationCategories: {
        create: DEFAULT_CATEGORIES.map((c) => ({
          organisationId: ctx.organisation.id,
          name: c.name,
          slug: c.slug,
        })),
      },
    },
  });

  await writeAudit({
    organisationId: ctx.organisation.id,
    eventId: event.id,
    userId: ctx.user.id,
    action: "event.create",
    resource: "event",
    resourceId: event.id,
  });

  revalidatePath(`/app/${orgSlug}`);
  return { eventId: event.id };
}

export async function updateEvent(
  orgSlug: string,
  eventId: string,
  formData: FormData,
) {
  const ctx = await requireEvent(orgSlug, eventId, "event.update");
  const input = eventSchema.parse({
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    venue: String(formData.get("venue") ?? ""),
    timezone: String(formData.get("timezone") ?? "UTC"),
    startsAt: String(formData.get("startsAt") ?? ""),
    endsAt: String(formData.get("endsAt") ?? ""),
    website: String(formData.get("website") ?? ""),
  });

  await prisma.event.update({
    where: { id: eventId },
    data: {
      name: input.name,
      description: input.description || null,
      venue: input.venue || null,
      timezone: input.timezone,
      startsAt: parseDate(input.startsAt),
      endsAt: parseDate(input.endsAt),
      website: input.website || null,
    },
  });

  await writeAudit({
    organisationId: ctx.organisation.id,
    eventId,
    userId: ctx.user.id,
    action: "event.update",
    resource: "event",
    resourceId: eventId,
  });

  revalidatePath(`/app/${orgSlug}/events/${eventId}`);
}

export async function createCategory(
  orgSlug: string,
  eventId: string,
  formData: FormData,
) {
  const ctx = await requireEvent(orgSlug, eventId, "event.update");
  const name = z.string().min(1).max(80).parse(String(formData.get("name") ?? ""));
  const slug = toSlug(name) || "category";
  await prisma.invitationCategory.create({
    data: {
      organisationId: ctx.organisation.id,
      eventId,
      name,
      slug: `${slug}-${Math.random().toString(36).slice(2, 4)}`,
    },
  });
  await writeAudit({
    organisationId: ctx.organisation.id,
    eventId,
    userId: ctx.user.id,
    action: "category.create",
    resource: "invitation_category",
  });
  revalidatePath(`/app/${orgSlug}/events/${eventId}/categories`);
}
