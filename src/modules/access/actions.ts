"use server";

import { EventRole, OrgRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireEvent, requireOrg, requirePlatformAdmin } from "@/lib/authz/require";
import { writeAudit } from "@/modules/audit/log";

const addOrgMemberSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  role: z.enum(["OWNER", "ADMIN"]),
});

const orgRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["OWNER", "ADMIN"]),
});

const eventRoleSchema = z.object({
  userId: z.string().optional(),
  email: z.string().trim().email().transform((value) => value.toLowerCase()).optional(),
  role: z.enum(["EVENT_ADMINISTRATOR", "REGISTRATION_MANAGER", "CHECKIN_STAFF"]),
});

async function requestIp() {
  return (await headers()).get("x-forwarded-for");
}

async function ensureOwnerInvariant(organisationId: string, userId: string, nextRole?: OrgRole) {
  const membership = await prisma.organisationUser.findUnique({
    where: { organisationId_userId: { organisationId, userId } },
  });
  if (!membership) throw new Error("Organisation member not found");
  if (membership.role !== OrgRole.OWNER) return;
  if (nextRole === OrgRole.OWNER) return;

  const ownerCount = await prisma.organisationUser.count({
    where: { organisationId, role: OrgRole.OWNER },
  });
  if (ownerCount <= 1) {
    throw new Error("This organisation must keep at least one owner");
  }
}

export async function addOrganisationMember(orgSlug: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug, "org.manage");
  const input = addOrgMemberSchema.parse({
    email: String(formData.get("email") ?? ""),
    role: String(formData.get("role") ?? "ADMIN"),
  });

  const user = await prisma.user.findFirst({
    where: { email: { equals: input.email, mode: "insensitive" } },
  });
  if (!user) {
    throw new Error("That user has not signed in yet. Ask them to create an account first.");
  }

  const membership = await prisma.organisationUser.upsert({
    where: {
      organisationId_userId: {
        organisationId: ctx.organisation.id,
        userId: user.id,
      },
    },
    create: {
      organisationId: ctx.organisation.id,
      userId: user.id,
      role: input.role as OrgRole,
    },
    update: { role: input.role as OrgRole },
    include: { user: true },
  });

  await writeAudit({
    organisationId: ctx.organisation.id,
    userId: ctx.user.id,
    action: "organisation.member.upsert",
    resource: "organisation_user",
    resourceId: membership.id,
    ip: await requestIp(),
    metadata: {
      targetUserId: user.id,
      targetEmail: user.email,
      role: input.role,
    },
  });

  revalidatePath(`/app/${orgSlug}/settings`);
  revalidatePath("/platform");
}

export async function updateOrganisationMemberRole(orgSlug: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug, "org.manage");
  const input = orgRoleSchema.parse({
    userId: String(formData.get("userId") ?? ""),
    role: String(formData.get("role") ?? ""),
  });

  await ensureOwnerInvariant(ctx.organisation.id, input.userId, input.role as OrgRole);

  const membership = await prisma.organisationUser.update({
    where: {
      organisationId_userId: {
        organisationId: ctx.organisation.id,
        userId: input.userId,
      },
    },
    data: { role: input.role as OrgRole },
    include: { user: true },
  });

  await writeAudit({
    organisationId: ctx.organisation.id,
    userId: ctx.user.id,
    action: "organisation.member.role.update",
    resource: "organisation_user",
    resourceId: membership.id,
    ip: await requestIp(),
    metadata: {
      targetUserId: membership.userId,
      targetEmail: membership.user.email,
      role: input.role,
    },
  });

  revalidatePath(`/app/${orgSlug}/settings`);
  revalidatePath("/platform");
}

export async function changeOrganisationMemberRole(orgSlug: string, formData: FormData) {
  return updateOrganisationMemberRole(orgSlug, formData);
}

export async function removeOrganisationMember(orgSlug: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug, "org.manage");
  const userId = z.string().min(1).parse(String(formData.get("userId") ?? ""));

  await ensureOwnerInvariant(ctx.organisation.id, userId);
  if (userId === ctx.user.id) {
    throw new Error("Remove another owner first before removing your own organisation access.");
  }

  const membership = await prisma.organisationUser.findUnique({
    where: {
      organisationId_userId: {
        organisationId: ctx.organisation.id,
        userId,
      },
    },
    include: { user: true },
  });
  if (!membership) throw new Error("Organisation member not found");

  await prisma.$transaction([
    prisma.eventUser.deleteMany({
      where: {
        organisationId: ctx.organisation.id,
        userId,
      },
    }),
    prisma.organisationUser.delete({
      where: {
        organisationId_userId: {
          organisationId: ctx.organisation.id,
          userId,
        },
      },
    }),
  ]);

  await writeAudit({
    organisationId: ctx.organisation.id,
    userId: ctx.user.id,
    action: "organisation.member.remove",
    resource: "organisation_user",
    resourceId: membership.id,
    ip: await requestIp(),
    metadata: {
      targetUserId: membership.userId,
      targetEmail: membership.user.email,
      removedEventAssignments: true,
    },
  });

  revalidatePath(`/app/${orgSlug}/settings`);
  revalidatePath("/platform");
}

export async function assignEventStaff(orgSlug: string, eventId: string, formData: FormData) {
  const ctx = await requireEvent(orgSlug, eventId, "event.update");
  const input = eventRoleSchema.parse({
    userId: String(formData.get("userId") ?? ""),
    email: String(formData.get("email") ?? ""),
    role: String(formData.get("role") ?? ""),
  });

  const targetUserId =
    input.userId ||
    (
      await prisma.user.findFirst({
        where: {
          email: { equals: input.email ?? "", mode: "insensitive" },
        },
        select: { id: true },
      })
    )?.id;
  if (!targetUserId) {
    throw new Error("That user has not signed in yet. Ask them to create an account first.");
  }

  const orgMember = await prisma.organisationUser.findUnique({
    where: {
      organisationId_userId: {
        organisationId: ctx.organisation.id,
        userId: targetUserId,
      },
    },
    include: { user: true },
  });
  if (!orgMember) {
    throw new Error("Only organisation members can be assigned to event staff roles.");
  }

  const assignment = await prisma.eventUser.upsert({
    where: {
      eventId_userId: {
        eventId,
        userId: targetUserId,
      },
    },
    create: {
      organisationId: ctx.organisation.id,
      eventId,
      userId: targetUserId,
      role: input.role as EventRole,
    },
    update: { role: input.role as EventRole },
  });

  await writeAudit({
    organisationId: ctx.organisation.id,
    eventId,
    userId: ctx.user.id,
    action: "event.staff.upsert",
    resource: "event_user",
    resourceId: assignment.id,
    ip: await requestIp(),
    metadata: {
      targetUserId: orgMember.userId,
      targetEmail: orgMember.user.email,
      role: input.role,
    },
  });

  revalidatePath(`/app/${orgSlug}/events/${eventId}`);
  revalidatePath(`/app/${orgSlug}/settings`);
}

export async function changeEventStaffRole(
  orgSlug: string,
  eventId: string,
  formData: FormData,
) {
  const ctx = await requireEvent(orgSlug, eventId, "event.update");
  const input = z
    .object({
      userId: z.string().min(1),
      role: z.enum(["EVENT_ADMINISTRATOR", "REGISTRATION_MANAGER", "CHECKIN_STAFF"]),
    })
    .parse({
      userId: String(formData.get("userId") ?? ""),
      role: String(formData.get("role") ?? ""),
    });

  const assignment = await prisma.eventUser.update({
    where: { eventId_userId: { eventId, userId: input.userId } },
    data: { role: input.role as EventRole },
    include: { user: true },
  });

  await writeAudit({
    organisationId: ctx.organisation.id,
    eventId,
    userId: ctx.user.id,
    action: "event.staff.role.update",
    resource: "event_user",
    resourceId: assignment.id,
    ip: await requestIp(),
    metadata: {
      targetUserId: assignment.userId,
      targetEmail: assignment.user.email,
      role: input.role,
    },
  });

  revalidatePath(`/app/${orgSlug}/events/${eventId}`);
}

export async function removeEventStaff(orgSlug: string, eventId: string, formData: FormData) {
  const ctx = await requireEvent(orgSlug, eventId, "event.update");
  const userId = z.string().min(1).parse(String(formData.get("userId") ?? ""));

  const assignment = await prisma.eventUser.findUnique({
    where: { eventId_userId: { eventId, userId } },
    include: { user: true },
  });
  if (!assignment) throw new Error("Event staff assignment not found");

  await prisma.eventUser.delete({
    where: { eventId_userId: { eventId, userId } },
  });

  await writeAudit({
    organisationId: ctx.organisation.id,
    eventId,
    userId: ctx.user.id,
    action: "event.staff.remove",
    resource: "event_user",
    resourceId: assignment.id,
    ip: await requestIp(),
    metadata: {
      targetUserId: assignment.userId,
      targetEmail: assignment.user.email,
      role: assignment.role,
    },
  });

  revalidatePath(`/app/${orgSlug}/events/${eventId}`);
}

export async function setPlatformAdmin(formData: FormData) {
  const actor = await requirePlatformAdmin();
  const userId = String(formData.get("userId") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const next = z.enum(["true", "false"]).transform((v) => v === "true").parse(
    String(formData.get("platformAdmin") ?? "false"),
  );

  const resolvedUserId =
    userId ||
    (
      await prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
        select: { id: true },
      })
    )?.id;
  if (!resolvedUserId) {
    throw new Error("That user has not signed in yet. Ask them to create an account first.");
  }

  const user = await prisma.user.update({
    where: { id: resolvedUserId },
    data: { platformAdmin: next },
  });

  await writeAudit({
    userId: actor.id,
    action: next ? "platform.admin.grant" : "platform.admin.revoke",
    resource: "user",
    resourceId: user.id,
    ip: await requestIp(),
    metadata: {
      targetEmail: user.email,
      platformAdmin: next,
    },
  });

  revalidatePath("/platform");
}
