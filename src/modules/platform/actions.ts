"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { requirePlatformAdmin } from "@/lib/authz/require";
import { writeAudit } from "@/modules/audit/log";
import { buildPlatformSurfaceCatalog } from "./surfaces";
import type { PlatformSurfaceGroup } from "./surfaces";

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
        createdAt: true,
        _count: { select: { events: true, users: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
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
