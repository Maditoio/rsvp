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
