import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  Calendar,
  CalendarDays,
  ChartColumn,
  ClipboardList,
  Handshake,
  Inbox,
  LayoutDashboard,
  Mail,
  Megaphone,
  QrCode,
  ScrollText,
  Settings,
  Tags,
  UserCheck,
  Users,
} from "lucide-react";
import { hasPermission, type Permission } from "@/lib/authz/permissions";

export type NavIcon = LucideIcon;

export type EventNavItem = {
  href: string;
  label: string;
  permission: Permission;
  icon: NavIcon;
  exact?: boolean;
};

export type OrgNavItem = {
  href: string;
  label: string;
  icon: NavIcon;
  exact?: boolean;
  show: boolean;
};

export function orgNav(
  orgSlug: string,
  grants?: Permission[],
  orgRole?: "OWNER" | "ADMIN" | null,
): OrgNavItem[] {
  return [
    {
      href: `/app/${orgSlug}`,
      label: "Dashboard",
      icon: LayoutDashboard,
      exact: true,
      show: true,
    },
    {
      href: `/app/${orgSlug}/events`,
      label: "Events",
      icon: Calendar,
      show: !grants || hasPermission(grants, "event.read"),
    },
    {
      href: `/app/${orgSlug}/settings`,
      label: "Settings",
      icon: Settings,
      show: orgRole != null,
    },
    {
      href: `/app/${orgSlug}/audit`,
      label: "Audit logs",
      icon: ScrollText,
      show: !grants || hasPermission(grants, "audit.read"),
    },
  ].filter((item) => item.show);
}

export function eventNav(orgSlug: string, eventId: string): EventNavItem[] {
  const base = `/app/${orgSlug}/events/${eventId}`;
  return [
    {
      href: base,
      label: "Dashboard",
      permission: "event.read",
      icon: LayoutDashboard,
      exact: true,
    },
    { href: `${base}/invitees`, label: "Invitees", permission: "invitees.read", icon: Users },
    {
      href: `${base}/invitations`,
      label: "Invitations",
      permission: "invitations.read",
      icon: Mail,
    },
    {
      href: `${base}/categories`,
      label: "Categories",
      permission: "invitations.read",
      icon: Tags,
    },
    {
      href: `${base}/applications`,
      label: "Applications",
      permission: "invitations.read",
      icon: Inbox,
    },
    {
      href: `${base}/registration-form`,
      label: "Form",
      permission: "event.read",
      icon: ClipboardList,
    },
    {
      href: `${base}/registrations`,
      label: "Registrations",
      permission: "registrations.read",
      icon: UserCheck,
    },
    {
      href: `${base}/attendees`,
      label: "Attendees",
      permission: "attendees.read",
      icon: BadgeCheck,
    },
    { href: `${base}/agenda`, label: "Agenda", permission: "event.read", icon: CalendarDays },
    { href: `${base}/meetings`, label: "Meetings", permission: "event.read", icon: Handshake },
    {
      href: `${base}/communications`,
      label: "Communications",
      permission: "invitations.write",
      icon: Megaphone,
    },
    { href: `${base}/check-in`, label: "Check-in", permission: "checkin.perform", icon: QrCode },
    { href: `${base}/settings`, label: "Settings", permission: "event.update", icon: Settings },
    { href: `${base}/reports`, label: "Reports", permission: "reports.export", icon: ChartColumn },
  ];
}

export function parseOrganiserEventId(pathname: string, orgSlug: string) {
  const prefix = `/app/${orgSlug}/events/`;
  if (!pathname.startsWith(prefix)) return null;
  const eventId = pathname.slice(prefix.length).split("/")[0];
  if (!eventId || eventId === "new") return null;
  return eventId;
}

export function parseAttendeeEventId(pathname: string) {
  const prefix = "/me/events/";
  if (!pathname.startsWith(prefix)) return null;
  const eventId = pathname.slice(prefix.length).split("/")[0];
  return eventId || null;
}

export function isNavActive(pathname: string, href: string, exact?: boolean) {
  if (pathname === href) return true;
  if (exact) return false;
  return pathname.startsWith(`${href}/`);
}
