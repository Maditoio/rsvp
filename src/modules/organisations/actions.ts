"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireOrg, requireUser } from "@/lib/authz/require";
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

export async function renameOrganisation(orgSlug: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug, "settings.manage");
  const name = orgSchema.parse({ name: String(formData.get("name") ?? "") }).name;

  await prisma.organisation.update({
    where: { id: ctx.organisation.id },
    data: { name },
  });

  await writeAudit({
    organisationId: ctx.organisation.id,
    userId: ctx.user.id,
    action: "organisation.rename",
    resource: "organisation",
    resourceId: ctx.organisation.id,
    metadata: { name },
  });

  revalidatePath(`/app/${orgSlug}`);
  revalidatePath(`/app/${orgSlug}/settings`);
}
