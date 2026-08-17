"use server";

import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/authz/require";
import { writeAudit } from "@/modules/audit/log";
import { toSlug } from "@/lib/utils";

const orgSchema = z.object({
  name: z.string().min(2).max(120),
});

export async function createOrganisation(formData: FormData) {
  const user = await requireUser();
  const name = orgSchema.parse({ name: String(formData.get("name") ?? "") }).name;
  let slug = toSlug(name) || "org";
  const taken = await prisma.organisation.findUnique({ where: { slug } });
  if (taken) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

  const organisation = await prisma.organisation.create({
    data: {
      name,
      slug,
      users: { create: { userId: user.id, role: "OWNER" } },
    },
  });

  await writeAudit({
    organisationId: organisation.id,
    userId: user.id,
    action: "organisation.create",
    resource: "organisation",
    resourceId: organisation.id,
  });

  return { slug: organisation.slug };
}
