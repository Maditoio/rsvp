"use server";

import { EventRole, OrgRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireEvent, requireOrg, requirePlatformAdmin } from "@/lib/authz/require";
import { writeAudit } from "@/modules/audit/log";
import {
  type ActionResult,
  actionFail,
  actionOk,
  publicActionError,
} from "@/lib/action-result";
import { emailFieldSchema, isValidEmail, normalizeEmail } from "@/lib/validation";

const addOrgMemberSchema = z.object({
  email: emailFieldSchema,
  role: z.enum(["OWNER", "ADMIN"]),
});

const orgRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["OWNER", "ADMIN"]),
});

const eventRoleSchema = z
  .object({
    userId: z.string().optional(),
    email: z
      .string()
      .trim()
      .optional()
      .transform((value) => (value ? normalizeEmail(value) : undefined))
      .refine((value) => value === undefined || isValidEmail(value), {
        message: "Enter a valid email address",
      }),
    role: z.enum(["EVENT_ADMINISTRATOR", "REGISTRATION_MANAGER", "CHECKIN_STAFF"]),
  })
  .refine((data) => Boolean(data.userId || data.email), {
    message: "Member email is required.",
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

export async function addOrganisationMember(
  orgSlug: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireOrg(orgSlug, "org.manage");
    const input = addOrgMemberSchema.parse({
      email: String(formData.get("email") ?? ""),
      role: String(formData.get("role") ?? "ADMIN"),
    });

    const user = await prisma.user.findFirst({
      where: { email: { equals: input.email, mode: "insensitive" } },
    });
    if (!user) {
      return actionFail(
        "That user has not signed in yet. Ask them to create an account first.",
      );
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
    return actionOk();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return actionFail(error.issues[0]?.message ?? "Invalid member details.");
    }
    return actionFail(publicActionError(error, "Could not add member."));
  }
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

export async function removeOrganisationMember(
  orgSlug: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireOrg(orgSlug, "org.manage");
    const userId = z.string().min(1).parse(String(formData.get("userId") ?? ""));

    await ensureOwnerInvariant(ctx.organisation.id, userId);
    if (userId === ctx.user.id) {
      return actionFail(
        "Remove another owner first before removing your own organisation access.",
      );
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
    if (!membership) return actionFail("Organisation member not found");

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
    return actionOk();
  } catch (error) {
    return actionFail(publicActionError(error, "Could not remove member."));
  }
}

export async function assignEventStaff(
  orgSlug: string,
  eventId: string,
  formData: FormData,
): Promise<ActionResult<{ orgAdminWarning?: boolean }>> {
  try {
    const ctx = await requireEvent(orgSlug, eventId, "event.update");
    const input = eventRoleSchema.parse({
      userId: String(formData.get("userId") ?? ""),
      email: String(formData.get("email") ?? ""),
      role: String(formData.get("role") ?? ""),
    });

    const targetUser = input.userId
      ? await prisma.user.findUnique({
          where: { id: input.userId },
          select: { id: true, email: true },
        })
      : await prisma.user.findFirst({
          where: {
            email: { equals: input.email ?? "", mode: "insensitive" },
          },
          select: { id: true, email: true },
        });
    if (!targetUser) {
      return actionFail(
        "That user has not signed in yet. Ask them to create an account first, then assign them here — do not add them as an organisation admin unless they should manage the whole organisation.",
      );
    }

    const orgMember = await prisma.organisationUser.findUnique({
      where: {
        organisationId_userId: {
          organisationId: ctx.organisation.id,
          userId: targetUser.id,
        },
      },
      select: { role: true },
    });

    const assignment = await prisma.eventUser.upsert({
      where: {
        eventId_userId: {
          eventId,
          userId: targetUser.id,
        },
      },
      create: {
        organisationId: ctx.organisation.id,
        eventId,
        userId: targetUser.id,
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
        targetUserId: targetUser.id,
        targetEmail: targetUser.email,
        role: input.role,
        orgRole: orgMember?.role ?? null,
      },
    });

    revalidatePath(`/app/${orgSlug}/events/${eventId}`);
    revalidatePath(`/app/${orgSlug}/events/${eventId}/staff`);
    revalidatePath(`/app/${orgSlug}/settings`);
    revalidatePath("/home");

    return actionOk({
      orgAdminWarning: Boolean(orgMember),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return actionFail(error.issues[0]?.message ?? "Invalid staff details.");
    }
    return actionFail(publicActionError(error, "Could not assign event staff."));
  }
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

export async function setPlatformAdmin(formData: FormData): Promise<ActionResult> {
  try {
    const actor = await requirePlatformAdmin();
    const userId = String(formData.get("userId") ?? "");
    const emailRaw = String(formData.get("email") ?? "").trim();
    const email = emailRaw ? normalizeEmail(emailRaw) : "";
    if (!userId && !isValidEmail(email)) {
      return actionFail("Enter a valid email address.");
    }
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
      return actionFail(
        "That user has not signed in yet. Ask them to create an account first.",
      );
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
    return actionOk();
  } catch (error) {
    return actionFail(publicActionError(error, "Could not update platform admin access."));
  }
}
