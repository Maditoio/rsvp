import type { Permission } from "@/lib/authz/permissions";

export const comingSoonNav = [
  { href: "#", label: "Matchmaking", soon: true as const },
  { href: "#", label: "Meetings", soon: true as const },
  { href: "#", label: "Agenda", soon: true as const },
  { href: "#", label: "Communications", soon: true as const },
];

export type EventNavItem =
  | { href: string; label: string; permission: Permission }
  | { href: string; label: string; soon: true };

export function eventNav(orgSlug: string, eventId: string): EventNavItem[] {
  const base = `/app/${orgSlug}/events/${eventId}`;
  return [
    { href: base, label: "Dashboard", permission: "event.read" },
    { href: `${base}/invitees`, label: "Invitees", permission: "invitees.read" },
    {
      href: `${base}/invitations`,
      label: "Invitations",
      permission: "invitations.read",
    },
    {
      href: `${base}/categories`,
      label: "Categories",
      permission: "invitations.read",
    },
    {
      href: `${base}/registrations`,
      label: "Registrations",
      permission: "registrations.read",
    },
    { href: `${base}/attendees`, label: "Attendees", permission: "attendees.read" },
    { href: `${base}/check-in`, label: "Check-in", permission: "checkin.perform" },
    { href: `${base}/reports`, label: "Reports", permission: "reports.export" },
    ...comingSoonNav,
  ];
}
