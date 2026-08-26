"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requirePlatformAdmin } from "@/lib/authz/require";
import {
  actionFail,
  actionOk,
  publicActionError,
  type ActionResult,
} from "@/lib/action-result";
import { writeAudit } from "@/modules/audit/log";
import { buildPlatformSurfaceCatalog } from "./surfaces";
import type { PlatformSurfaceGroup } from "./surfaces";

async function requestIp() {
  return (await headers()).get("x-forwarded-for");
}

export async function getPlatformOverview() {
  const user = await requirePlatformAdmin();
  await writeAudit({
    userId: user.id,
    action: "platform.overview.read",
    resource: "platform",
    ip: (await headers()).get("x-forwarded-for"),
    metadata: { reason: "platform_admin_overview" },
  });

  const [
    organisationCount,
    eventCount,
    userCount,
    platformAdminCount,
    recentOrganisations,
    recentUsers,
    ownerMemberships,
    adminMemberships,
    recentMemberships,
    organisations,
  ] = await prisma.$transaction([
    prisma.organisation.count(),
    prisma.event.count(),
    prisma.user.count(),
    prisma.user.count({ where: { platformAdmin: true } }),
    prisma.organisation.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
        _count: { select: { events: true, users: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        platformAdmin: true,
        _count: { select: { organisationUsers: true, eventUsers: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.organisationUser.count({ where: { role: "OWNER" } }),
    prisma.organisationUser.count({ where: { role: "ADMIN" } }),
    prisma.organisationUser.findMany({
      select: {
        id: true,
        role: true,
        createdAt: true,
        organisation: {
          select: {
            name: true,
            slug: true,
          },
        },
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.organisation.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        venueAiFloorPlanEnabled: true,
        createdAt: true,
        _count: { select: { events: true, users: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    stats: {
      organisationCount,
      eventCount,
      userCount,
      platformAdminCount,
      ownerMemberships,
      adminMemberships,
    },
    recentOrganisations,
    recentUsers,
    recentMemberships,
    organisations,
  };
}

export async function setOrganisationVenueAiFloorPlan(
  organisationId: string,
  enabled: boolean,
): Promise<ActionResult<{ enabled: boolean }>> {
  try {
    const actor = await requirePlatformAdmin();
    const id = z.string().cuid().parse(organisationId);
    const next = z.boolean().parse(enabled);

    const organisation = await prisma.organisation.update({
      where: { id },
      data: { venueAiFloorPlanEnabled: next },
      select: {
        id: true,
        name: true,
        slug: true,
        venueAiFloorPlanEnabled: true,
      },
    });

    await writeAudit({
      userId: actor.id,
      organisationId: organisation.id,
      action: next
        ? "organisation.venue_ai_floor_plan.enable"
        : "organisation.venue_ai_floor_plan.disable",
      resource: "organisation",
      resourceId: organisation.id,
      ip: await requestIp(),
      metadata: {
        slug: organisation.slug,
        name: organisation.name,
        venueAiFloorPlanEnabled: organisation.venueAiFloorPlanEnabled,
      },
    });

    revalidatePath("/platform");
    revalidatePath(`/app/${organisation.slug}`);
    return actionOk({ enabled: organisation.venueAiFloorPlanEnabled });
  } catch (error) {
    return actionFail(
      publicActionError(error, "Could not update organisation feature."),
    );
  }
}

export async function listPlatformOrganisations() {
  return (await getPlatformOverview()).recentOrganisations;
}

export async function getPlatformSurfaceCatalog(): Promise<PlatformSurfaceGroup[]> {
  const user = await requirePlatformAdmin();
  await writeAudit({
    userId: user.id,
    action: "platform.surfaces.read",
    resource: "platform",
    ip: (await headers()).get("x-forwarded-for"),
    metadata: { reason: "platform_surface_catalog" },
  });

  const [organisations, events] = await Promise.all([
    prisma.organisation.findMany({
      select: { slug: true, name: true },
      orderBy: { name: "asc" },
      take: 12,
    }),
    prisma.event.findMany({
      select: {
        id: true,
        name: true,
        organisation: { select: { slug: true, name: true } },
      },
      orderBy: [{ startsAt: "desc" }, { name: "asc" }],
      take: 8,
    }),
  ]);

  return buildPlatformSurfaceCatalog({ organisations, events });
}
