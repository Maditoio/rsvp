import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  Calendar,
  CalendarDays,
  ChartColumn,
  ClipboardList,
  Handshake,
  LayoutDashboard,
  Mail,
  Megaphone,
  QrCode,
  ScrollText,
  Settings,
  Shield,
  SlidersHorizontal,
  Tags,
  UserCheck,
  Users,
} from "lucide-react";
import { hasPermission, type Permission } from "@/lib/authz/permissions";

export type NavIcon = LucideIcon;

export type OrgNavItem = {
  href: string;
  label: string;
  icon: NavIcon;
  exact?: boolean;
  show: boolean;
};

export type EventNavItem = {
  href: string;
  label: string;
  permission: Permission;
  icon: NavIcon;
  exact?: boolean;
};

export type EventNavGroup = {
  label: string;
  items: EventNavItem[];
};

/* ── Rail 1: Organisation nav ── */

export function orgPrimaryNav(
  orgSlug: string,
  grants?: Permission[],
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
      href: `/app/${orgSlug}/audit`,
      label: "Audit logs",
      icon: ScrollText,
      show: !grants || hasPermission(grants, "audit.read"),
    },
  ].filter((item) => item.show);
}

export function orgFooterNav(
  orgSlug: string,
  orgRole?: "OWNER" | "ADMIN" | null,
): OrgNavItem[] {
  return [
    {
      href: `/app/${orgSlug}/settings`,
      label: "Settings",
      icon: Settings,
      show: orgRole != null,
    },
  ].filter((item) => item.show);
}

/* ── Rail 2: Event panel grouped nav ── */

export function eventNavGroups(
  orgSlug: string,
  eventId: string,
): EventNavGroup[] {
  const base = `/app/${orgSlug}/events/${eventId}`;
  return [
    {
      label: "Setup",
      items: [
        { href: base, label: "Overview", permission: "event.read", icon: LayoutDashboard, exact: true },
        { href: `${base}/registration-form`, label: "Form builder", permission: "event.read", icon: ClipboardList },
        { href: `${base}/categories`, label: "Categories", permission: "invitations.read", icon: Tags },
        { href: `${base}/staff`, label: "Staff", permission: "event.update", icon: Shield },
      ],
    },
    {
      label: "Guests",
      items: [
        { href: `${base}/invitees`, label: "Invitees", permission: "invitees.read", icon: Users },
        { href: `${base}/invitations`, label: "Invitations", permission: "invitations.read", icon: Mail },
        { href: `${base}/applications`, label: "Applications", permission: "invitations.read", icon: ClipboardList },
        { href: `${base}/registrations`, label: "Registrations", permission: "registrations.read", icon: UserCheck },
        { href: `${base}/attendees`, label: "Attendees", permission: "attendees.read", icon: BadgeCheck },
      ],
    },
    {
      label: "Event day",
      items: [
        {
          href: `${base}/day`,
          label: "Event day",
          permission: "checkin.perform",
          icon: QrCode,
          exact: true,
        },
        {
          href: `${base}/day/lookup`,
          label: "Delegate lookup",
          permission: "checkin.perform",
          icon: Users,
        },
        { href: `${base}/agenda`, label: "Agenda", permission: "event.read", icon: CalendarDays },
        { href: `${base}/meetings`, label: "Meetings", permission: "event.read", icon: Handshake },
      ],
    },
    {
      label: "Communications & data",
      items: [
        { href: `${base}/communications`, label: "Communications", permission: "invitations.write", icon: Megaphone },
        { href: `${base}/reports`, label: "Reports", permission: "reports.export", icon: ChartColumn },
      ],
    },
  ];
}

export function eventSettingsItem(
  orgSlug: string,
  eventId: string,
): EventNavItem {
  return {
    href: `/app/${orgSlug}/events/${eventId}/settings`,
    label: "Event settings",
    permission: "event.update",
    icon: SlidersHorizontal,
  };
}

/** Flat list for backward compat (e.g. mobile drawer). */
export function eventNav(orgSlug: string, eventId: string): EventNavItem[] {
  const groups = eventNavGroups(orgSlug, eventId);
  const items = groups.flatMap((g) => g.items);
  items.push(eventSettingsItem(orgSlug, eventId));
  return items;
}

/** Keep legacy orgNav for backward compat. */
export function orgNav(
  orgSlug: string,
  grants?: Permission[],
  orgRole?: "OWNER" | "ADMIN" | null,
): OrgNavItem[] {
  return [
    ...orgPrimaryNav(orgSlug, grants),
    ...orgFooterNav(orgSlug, orgRole),
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
  // Org events list should not stay active inside a specific event workspace.
  // Keep active on /events/new; exclude only real event ids.
  if (
    /\/events\/(?!new(?:\/|$))[^/]+(?:\/|$)/.test(pathname) &&
    href.endsWith("/events")
  ) {
    return false;
  }
  return pathname.startsWith(`${href}/`);
}
