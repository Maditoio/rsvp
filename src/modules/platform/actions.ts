"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { requirePlatformAdmin } from "@/lib/authz/require";
import { writeAudit } from "@/modules/audit/log";

export async function listPlatformOrganisations() {
  const user = await requirePlatformAdmin();
  await writeAudit({
    userId: user.id,
    action: "platform.organisations.list",
    resource: "organisation",
    ip: (await headers()).get("x-forwarded-for"),
    metadata: { reason: "platform_admin_org_list" },
  });

  return prisma.organisation.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
      _count: { select: { events: true, users: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
