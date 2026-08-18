import type { Permission } from "@/lib/authz/permissions";

export const comingSoonNav = [
  { href: "#", label: "Matchmaking", soon: true as const },
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
      href: `${base}/applications`,
      label: "Applications",
      permission: "invitations.read",
    },
    {
      href: `${base}/registration-form`,
      label: "Form",
      permission: "event.read",
    },
    {
      href: `${base}/registrations`,
      label: "Registrations",
      permission: "registrations.read",
    },
    { href: `${base}/attendees`, label: "Attendees", permission: "attendees.read" },
    { href: `${base}/agenda`, label: "Agenda", permission: "event.read" },
    { href: `${base}/meetings`, label: "Meetings", permission: "event.read" },
    {
      href: `${base}/communications`,
      label: "Communications",
      permission: "invitations.write",
    },
    { href: `${base}/check-in`, label: "Check-in", permission: "checkin.perform" },
    { href: `${base}/settings`, label: "Settings", permission: "event.update" },
    { href: `${base}/reports`, label: "Reports", permission: "reports.export" },
    { href: `${base}/settings`, label: "Settings", permission: "event.update" },
    ...comingSoonNav,
  ];
}
