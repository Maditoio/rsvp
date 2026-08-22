import type { EventRole, OrgRole } from "@prisma/client";

export type Permission =
  | "org.manage"
  | "org.read"
  | "event.create"
  | "event.read"
  | "event.update"
  | "invitees.read"
  | "invitees.write"
  | "invitations.read"
  | "invitations.write"
  | "registrations.read"
  | "registrations.write"
  | "attendees.read"
  | "attendees.write"
  | "checkin.perform"
  | "reports.export"
  | "audit.read"
  | "settings.manage";

export const ORG_PERMISSIONS: Record<OrgRole, Permission[]> = {
  OWNER: [
    "org.manage",
    "org.read",
    "event.create",
    "event.read",
    "event.update",
    "invitees.read",
    "invitees.write",
    "invitations.read",
    "invitations.write",
    "registrations.read",
    "registrations.write",
    "attendees.read",
    "attendees.write",
    "checkin.perform",
    "reports.export",
    "audit.read",
    "settings.manage",
  ],
  ADMIN: [
    "org.read",
    "event.create",
    "event.read",
    "event.update",
    "invitees.read",
    "invitees.write",
    "invitations.read",
    "invitations.write",
    "registrations.read",
    "registrations.write",
    "attendees.read",
    "attendees.write",
    "checkin.perform",
    "reports.export",
    "audit.read",
    "settings.manage",
  ],
};

export const EVENT_PERMISSIONS: Record<EventRole, Permission[]> = {
  EVENT_ADMINISTRATOR: [
    "event.read",
    "event.update",
    "invitees.read",
    "invitees.write",
    "invitations.read",
    "invitations.write",
    "registrations.read",
    "registrations.write",
    "attendees.read",
    "attendees.write",
    "checkin.perform",
    "reports.export",
    "audit.read",
  ],
  REGISTRATION_MANAGER: [
    "event.read",
    "invitees.read",
    "invitations.read",
    "registrations.read",
    "registrations.write",
    "attendees.read",
    "reports.export",
  ],
  CHECKIN_STAFF: ["event.read", "checkin.perform"],
};

export function hasPermission(
  grants: Permission[],
  permission: Permission,
) {
  return grants.includes(permission);
}

/**
 * Resolve grants for an event-scoped action.
 * Organisation OWNER/ADMIN keep full org permissions on every event.
 * Otherwise the EventUser role for THIS event is the authority.
 */
export function resolveEventAccess(input: {
  platformAdmin: boolean;
  orgRole: OrgRole | null;
  eventRole: EventRole | null;
  permission: Permission;
}): { grants: Permission[]; via: "platform" | "org" | "event" } | null {
  if (input.platformAdmin) {
    return { grants: ORG_PERMISSIONS.OWNER, via: "platform" };
  }

  if (input.orgRole) {
    const orgGrants = ORG_PERMISSIONS[input.orgRole];
    if (hasPermission(orgGrants, input.permission)) {
      return { grants: orgGrants, via: "org" };
    }
  }

  if (input.eventRole) {
    const eventGrants = EVENT_PERMISSIONS[input.eventRole];
    if (hasPermission(eventGrants, input.permission)) {
      return { grants: eventGrants, via: "event" };
    }
  }

  return null;
}
