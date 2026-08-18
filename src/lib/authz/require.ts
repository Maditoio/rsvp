import { auth, currentUser } from "@clerk/nextjs/server";
import type { EventRole, Organisation, User } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { AuthzError } from "@/lib/db/tenant";
import {
  EVENT_PERMISSIONS,
  ORG_PERMISSIONS,
  type Permission,
  hasPermission,
} from "@/lib/authz/permissions";
import { hasClerk } from "@/lib/utils";

function platformAdminEmails() {
  return new Set(
    (process.env.PLATFORM_ADMIN_EMAILS ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
}

export type AuthContext = {
  user: User;
  organisation: Organisation;
  orgRole: "OWNER" | "ADMIN" | null;
  eventRole: EventRole | null;
  grants: Permission[];
};

export async function getCurrentUser(): Promise<User | null> {
  if (!hasClerk()) return null;
  const { userId } = await auth();
  if (!userId) return null;

  const clerk = await currentUser();
  if (!clerk) {
    throw new AuthzError("Sign in required", 401);
  }

  const email =
    clerk.primaryEmailAddress?.emailAddress ??
    clerk.emailAddresses[0]?.emailAddress;
  if (!email) {
    throw new AuthzError("Clerk user is missing an email address", 400);
  }
  const normalizedEmail = email.trim().toLowerCase();
  const shouldBePlatformAdmin = platformAdminEmails().has(normalizedEmail);

  const user = await prisma.user.upsert({
    where: { clerkUserId: userId },
    create: {
      clerkUserId: userId,
      email: normalizedEmail,
      firstName: clerk.firstName,
      lastName: clerk.lastName,
      imageUrl: clerk.imageUrl,
      platformAdmin: shouldBePlatformAdmin,
    },
    update: {
      email: normalizedEmail,
      firstName: clerk.firstName,
      lastName: clerk.lastName,
      imageUrl: clerk.imageUrl,
      platformAdmin: shouldBePlatformAdmin || undefined,
    },
  });

  await prisma.attendee.updateMany({
    where: { email: normalizedEmail, userId: null },
    data: { userId: user.id },
  });

  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthzError("Sign in required", 401);
  }
  return user;
}

export async function requireOrg(
  orgSlug: string,
  permission: Permission = "org.read",
): Promise<AuthContext> {
  const user = await requireUser();
  const organisation = await prisma.organisation.findUnique({
    where: { slug: orgSlug },
  });
  if (!organisation) {
    throw new AuthzError("Organisation not found", 404);
  }

  if (user.platformAdmin) {
    return {
      user,
      organisation,
      orgRole: "OWNER",
      eventRole: null,
      grants: ORG_PERMISSIONS.OWNER,
    };
  }

  const membership = await prisma.organisationUser.findUnique({
    where: {
      organisationId_userId: {
        organisationId: organisation.id,
        userId: user.id,
      },
    },
  });

  if (membership) {
    const grants = ORG_PERMISSIONS[membership.role];
    if (!hasPermission(grants, permission)) {
      throw new AuthzError("Insufficient organisation permission", 403);
    }
    return {
      user,
      organisation,
      orgRole: membership.role,
      eventRole: null,
      grants,
    };
  }

  const staff = await prisma.eventUser.findFirst({
    where: { userId: user.id, organisationId: organisation.id },
  });
  if (!staff) {
    throw new AuthzError("You do not have access to this organisation", 403);
  }

  const grants: Permission[] = ["org.read", ...EVENT_PERMISSIONS[staff.role]];
  if (!hasPermission(grants, permission)) {
    throw new AuthzError("Insufficient organisation permission", 403);
  }

  return {
    user,
    organisation,
    orgRole: null,
    eventRole: staff.role,
    grants,
  };
}

export async function requireEvent(
  orgSlug: string,
  eventId: string,
  permission: Permission,
): Promise<AuthContext & { eventId: string }> {
  const orgCtx = await requireOrg(orgSlug, "org.read");
  const event = await prisma.event.findFirst({
    where: { id: eventId, organisationId: orgCtx.organisation.id },
  });
  if (!event) {
    throw new AuthzError("Event not found", 404);
  }

  if (orgCtx.user.platformAdmin || hasPermission(orgCtx.grants, permission)) {
    return { ...orgCtx, eventId };
  }

  const eventMembership = await prisma.eventUser.findUnique({
    where: { eventId_userId: { eventId, userId: orgCtx.user.id } },
  });
  const grants = eventMembership
    ? EVENT_PERMISSIONS[eventMembership.role]
    : [];
  if (!hasPermission(grants, permission)) {
    throw new AuthzError("Insufficient event permission", 403);
  }

  return {
    ...orgCtx,
    eventId,
    eventRole: eventMembership?.role ?? null,
    grants,
  };
}

export async function requirePlatformAdmin() {
  const user = await requireUser();
  if (!user.platformAdmin) {
    throw new AuthzError("Platform admin required", 403);
  }
  return user;
}
