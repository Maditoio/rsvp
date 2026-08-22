import type { EventRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/authz/require";
import {
  eventRoleDefaultHref,
  eventRoleWorkspaceDescription,
} from "./labels";
import type { UserWorkspace, UserWorkspacesResult } from "./types";

function organiserWorkspace(
  org: { slug: string; name: string },
  role: "OWNER" | "ADMIN",
): UserWorkspace {
  return {
    id: `organiser:${org.slug}`,
    kind: "organiser",
    label: org.name,
    description:
      role === "OWNER" ? "Organisation owner console" : "Organiser console",
    href: `/app/${org.slug}`,
    meta: { orgSlug: org.slug, orgName: org.name, orgRole: role },
  };
}

function eventOperationsWorkspace(input: {
  eventId: string;
  eventName: string;
  orgSlug: string;
  orgName: string;
  role: EventRole;
}): UserWorkspace {
  return {
    id: `event_ops:${input.eventId}:${input.role}`,
    kind: "event_operations",
    label: input.eventName,
    description: `${input.orgName} · ${eventRoleWorkspaceDescription(input.role)}`,
    href: eventRoleDefaultHref(input.orgSlug, input.eventId, input.role),
    meta: {
      orgSlug: input.orgSlug,
      orgName: input.orgName,
      eventId: input.eventId,
      eventName: input.eventName,
      eventRole: input.role,
    },
  };
}

function resolveDefaultHref(workspaces: UserWorkspace[]): string | null {
  if (workspaces.length === 0) return null;
  if (workspaces.length === 1) return workspaces[0].href;

  const organiser = workspaces.find((w) => w.kind === "organiser");
  const attendee = workspaces.find((w) => w.kind === "attendee");
  const eventOps = workspaces.find((w) => w.kind === "event_operations");
  const platform = workspaces.find((w) => w.kind === "platform");

  return organiser?.href ?? attendee?.href ?? eventOps?.href ?? platform?.href ?? null;
}

export async function listUserWorkspaces(
  userId: string,
): Promise<UserWorkspacesResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { platformAdmin: true },
  });
  if (!user) {
    return { workspaces: [], defaultHref: null };
  }

  const [memberships, eventAssignments, attendanceCount] = await Promise.all([
    prisma.organisationUser.findMany({
      where: { userId },
      include: {
        organisation: { select: { slug: true, name: true } },
      },
      orderBy: { organisation: { name: "asc" } },
    }),
    prisma.eventUser.findMany({
      where: { userId },
      include: {
        event: { select: { id: true, name: true } },
        organisation: { select: { slug: true, name: true } },
      },
      orderBy: [{ event: { startsAt: "desc" } }, { event: { name: "asc" } }],
    }),
    prisma.attendee.count({ where: { userId } }),
  ]);

  const workspaces: UserWorkspace[] = [];
  const memberOrgSlugs = new Set(memberships.map((m) => m.organisation.slug));

  if (attendanceCount > 0) {
    workspaces.push({
      id: "attendee",
      kind: "attendee",
      label: "Attendee portal",
      description: "Your events, agenda, directory, and meetings",
      href: "/me",
    });
  }

  for (const membership of memberships) {
    workspaces.push(
      organiserWorkspace(membership.organisation, membership.role),
    );
  }

  for (const assignment of eventAssignments) {
    if (memberOrgSlugs.has(assignment.organisation.slug)) continue;
    workspaces.push(
      eventOperationsWorkspace({
        eventId: assignment.event.id,
        eventName: assignment.event.name,
        orgSlug: assignment.organisation.slug,
        orgName: assignment.organisation.name,
        role: assignment.role,
      }),
    );
  }

  if (user.platformAdmin) {
    workspaces.push({
      id: "platform",
      kind: "platform",
      label: "Platform oversight",
      description: "Tenant growth, access distribution, and platform admin",
      href: "/platform",
    });
  }

  return {
    workspaces,
    defaultHref: resolveDefaultHref(workspaces),
  };
}

export async function loadUserWorkspaces(): Promise<UserWorkspacesResult> {
  const user = await requireUser();
  return listUserWorkspaces(user.id);
}
