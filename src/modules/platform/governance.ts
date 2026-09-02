"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requirePlatformAdmin } from "@/lib/authz/require";
import {
  actionFail,
  actionOk,
  publicActionError,
  type ActionResult,
} from "@/lib/action-result";
import { writeAudit } from "@/modules/audit/log";

async function requestIp() {
  return (await headers()).get("x-forwarded-for");
}

function organisationSearchWhere(q: string): Prisma.OrganisationWhereInput {
  const trimmed = q.trim();
  if (!trimmed) return {};
  return {
    OR: [
      { name: { contains: trimmed, mode: "insensitive" } },
      { slug: { contains: trimmed, mode: "insensitive" } },
    ],
  };
}

function eventSearchWhere(
  q: string,
  organisationId?: string,
): Prisma.EventWhereInput {
  const trimmed = q.trim();
  const where: Prisma.EventWhereInput = {};
  if (organisationId) where.organisationId = organisationId;
  if (trimmed) {
    where.OR = [
      { name: { contains: trimmed, mode: "insensitive" } },
      { slug: { contains: trimmed, mode: "insensitive" } },
      { organisation: { name: { contains: trimmed, mode: "insensitive" } } },
      { organisation: { slug: { contains: trimmed, mode: "insensitive" } } },
    ];
  }
  return where;
}

export type PlatformOrganisationListItem = {
  id: string;
  name: string;
  slug: string;
  suspendedAt: Date | null;
  createdAt: Date;
  eventCount: number;
  memberCount: number;
  suspendedEventCount: number;
};

export type PlatformEventListItem = {
  id: string;
  name: string;
  slug: string;
  suspendedAt: Date | null;
  startsAt: Date | null;
  endsAt: Date | null;
  createdAt: Date;
  organisation: {
    id: string;
    name: string;
    slug: string;
    suspendedAt: Date | null;
  };
};

export type PlatformOrganisationDetail = {
  id: string;
  name: string;
  slug: string;
  suspendedAt: Date | null;
  venueAiFloorPlanEnabled: boolean;
  createdAt: Date;
  eventCount: number;
  memberCount: number;
  events: PlatformEventListItem[];
  recentAudit: {
    id: string;
    action: string;
    resource: string;
    createdAt: Date;
    user: { email: string; firstName: string | null; lastName: string | null } | null;
  }[];
};

export async function listPlatformOrganisations(options?: {
  q?: string;
  status?: "all" | "active" | "suspended";
  take?: number;
}): Promise<PlatformOrganisationListItem[]> {
  await requirePlatformAdmin();
  const q = options?.q ?? "";
  const status = options?.status ?? "all";
  const take = options?.take ?? 50;

  const where: Prisma.OrganisationWhereInput = {
    ...organisationSearchWhere(q),
    ...(status === "active" ? { suspendedAt: null } : {}),
    ...(status === "suspended" ? { suspendedAt: { not: null } } : {}),
  };

  const rows = await prisma.organisation.findMany({
    where,
    select: {
      id: true,
      name: true,
      slug: true,
      suspendedAt: true,
      createdAt: true,
      _count: { select: { events: true, users: true } },
      events: {
        where: { suspendedAt: { not: null } },
        select: { id: true },
      },
    },
    orderBy: [{ suspendedAt: "desc" }, { name: "asc" }],
    take,
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    suspendedAt: row.suspendedAt,
    createdAt: row.createdAt,
    eventCount: row._count.events,
    memberCount: row._count.users,
    suspendedEventCount: row.events.length,
  }));
}

export async function listPlatformEvents(options?: {
  q?: string;
  organisationId?: string;
  status?: "all" | "active" | "suspended";
  take?: number;
}): Promise<PlatformEventListItem[]> {
  await requirePlatformAdmin();
  const q = options?.q ?? "";
  const status = options?.status ?? "all";
  const take = options?.take ?? 100;

  const where: Prisma.EventWhereInput = {
    ...eventSearchWhere(q, options?.organisationId),
    ...(status === "active" ? { suspendedAt: null } : {}),
    ...(status === "suspended" ? { suspendedAt: { not: null } } : {}),
  };

  const rows = await prisma.event.findMany({
    where,
    select: {
      id: true,
      name: true,
      slug: true,
      suspendedAt: true,
      startsAt: true,
      endsAt: true,
      createdAt: true,
      organisation: {
        select: {
          id: true,
          name: true,
          slug: true,
          suspendedAt: true,
        },
      },
    },
    orderBy: [{ startsAt: "desc" }, { name: "asc" }],
    take,
  });

  return rows;
}

export async function getPlatformOrganisationDetail(
  organisationId: string,
): Promise<PlatformOrganisationDetail | null> {
  await requirePlatformAdmin();
  const id = z.string().cuid().parse(organisationId);

  const organisation = await prisma.organisation.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      suspendedAt: true,
      venueAiFloorPlanEnabled: true,
      createdAt: true,
      _count: { select: { events: true, users: true } },
      events: {
        select: {
          id: true,
          name: true,
          slug: true,
          suspendedAt: true,
          startsAt: true,
          endsAt: true,
          createdAt: true,
          organisation: {
            select: {
              id: true,
              name: true,
              slug: true,
              suspendedAt: true,
            },
          },
        },
        orderBy: [{ startsAt: "desc" }, { name: "asc" }],
      },
    },
  });

  if (!organisation) return null;

  const recentAudit = await prisma.auditLog.findMany({
    where: { organisationId: id },
    select: {
      id: true,
      action: true,
      resource: true,
      createdAt: true,
      user: {
        select: { email: true, firstName: true, lastName: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 12,
  });

  return {
    id: organisation.id,
    name: organisation.name,
    slug: organisation.slug,
    suspendedAt: organisation.suspendedAt,
    venueAiFloorPlanEnabled: organisation.venueAiFloorPlanEnabled,
    createdAt: organisation.createdAt,
    eventCount: organisation._count.events,
    memberCount: organisation._count.users,
    events: organisation.events,
    recentAudit,
  };
}

function revalidatePlatformPaths(organisation: { id: string; slug: string }, eventId?: string) {
  revalidatePath("/platform");
  revalidatePath("/platform/organisations");
  revalidatePath("/platform/events");
  revalidatePath(`/platform/organisations/${organisation.id}`);
  revalidatePath(`/app/${organisation.slug}`);
  revalidatePath(`/app/${organisation.slug}/events`);
  if (eventId) {
    revalidatePath(`/app/${organisation.slug}/events/${eventId}`);
  }
}

export async function setOrganisationSuspended(
  organisationId: string,
  suspended: boolean,
): Promise<ActionResult<{ suspendedAt: Date | null }>> {
  try {
    const actor = await requirePlatformAdmin();
    const id = z.string().cuid().parse(organisationId);
    const next = z.boolean().parse(suspended);

    const organisation = await prisma.organisation.update({
      where: { id },
      data: { suspendedAt: next ? new Date() : null },
      select: {
        id: true,
        name: true,
        slug: true,
        suspendedAt: true,
      },
    });

    await writeAudit({
      userId: actor.id,
      organisationId: organisation.id,
      action: next ? "organisation.suspend" : "organisation.unsuspend",
      resource: "organisation",
      resourceId: organisation.id,
      ip: await requestIp(),
      metadata: {
        slug: organisation.slug,
        name: organisation.name,
      },
    });

    revalidatePlatformPaths(organisation);
    return actionOk({ suspendedAt: organisation.suspendedAt });
  } catch (error) {
    return actionFail(
      publicActionError(error, "Could not update organisation status."),
    );
  }
}

export async function setEventSuspended(
  eventId: string,
  suspended: boolean,
): Promise<ActionResult<{ suspendedAt: Date | null }>> {
  try {
    const actor = await requirePlatformAdmin();
    const id = z.string().cuid().parse(eventId);
    const next = z.boolean().parse(suspended);

    const event = await prisma.event.update({
      where: { id },
      data: { suspendedAt: next ? new Date() : null },
      select: {
        id: true,
        name: true,
        slug: true,
        suspendedAt: true,
        organisation: { select: { id: true, slug: true, name: true } },
      },
    });

    await writeAudit({
      userId: actor.id,
      organisationId: event.organisation.id,
      eventId: event.id,
      action: next ? "event.suspend" : "event.unsuspend",
      resource: "event",
      resourceId: event.id,
      ip: await requestIp(),
      metadata: {
        slug: event.slug,
        name: event.name,
        organisationSlug: event.organisation.slug,
      },
    });

    revalidatePlatformPaths(event.organisation, event.id);
    revalidatePath(`/e/${event.organisation.slug}/${event.slug}`);
    return actionOk({ suspendedAt: event.suspendedAt });
  } catch (error) {
    return actionFail(publicActionError(error, "Could not update event status."));
  }
}

export async function setAllOrganisationEventsSuspended(
  organisationId: string,
  suspended: boolean,
): Promise<ActionResult<{ updated: number }>> {
  try {
    const actor = await requirePlatformAdmin();
    const id = z.string().cuid().parse(organisationId);
    const next = z.boolean().parse(suspended);

    const organisation = await prisma.organisation.findUnique({
      where: { id },
      select: { id: true, slug: true, name: true },
    });
    if (!organisation) throw new Error("Organisation not found.");

    const result = await prisma.event.updateMany({
      where: {
        organisationId: id,
        ...(next ? { suspendedAt: null } : { suspendedAt: { not: null } }),
      },
      data: { suspendedAt: next ? new Date() : null },
    });

    await writeAudit({
      userId: actor.id,
      organisationId: organisation.id,
      action: next ? "event.suspend_all" : "event.unsuspend_all",
      resource: "organisation",
      resourceId: organisation.id,
      ip: await requestIp(),
      metadata: {
        slug: organisation.slug,
        name: organisation.name,
        updated: result.count,
      },
    });

    revalidatePlatformPaths(organisation);
    return actionOk({ updated: result.count });
  } catch (error) {
    return actionFail(
      publicActionError(error, "Could not update events for this organisation."),
    );
  }
}
