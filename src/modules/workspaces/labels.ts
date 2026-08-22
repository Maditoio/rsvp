import type { EventRole } from "@prisma/client";

/** Human-readable copy for event-staff workspaces (extensible for Phase 4 roles). */
export function eventRoleWorkspaceDescription(role: EventRole): string {
  switch (role) {
    case "CHECKIN_STAFF":
      return "Check-in, QR scanning, and on-site attendance";
    case "REGISTRATION_MANAGER":
      return "Registrations, applications, and delegate records";
    case "EVENT_ADMINISTRATOR":
      return "Full event administration";
    default:
      return "Event operations";
  }
}

/** Default landing route for an event-scoped role. Extend when adding badge printing etc. */
export function eventRoleDefaultHref(
  orgSlug: string,
  eventId: string,
  role: EventRole,
): string {
  const base = `/app/${orgSlug}/events/${eventId}`;
  switch (role) {
    case "CHECKIN_STAFF":
      return `${base}/day`;
    case "REGISTRATION_MANAGER":
      return `${base}/registrations`;
    default:
      return base;
  }
}
