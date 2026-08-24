import type { EventRole, OrgRole } from "@prisma/client";
import { EventRole as EventRoleEnum } from "@prisma/client";
import { eventNavGroups, eventSettingsItem } from "@/components/nav";
import {
  eventRoleDefaultHref,
  eventRoleLabel,
  eventRoleWorkspaceDescription,
} from "@/modules/workspaces/labels";
import { WORKSPACE_KIND_LABELS, type WorkspaceKind } from "@/modules/workspaces/types";

export type PlatformSurfaceLink = {
  href: string;
  label: string;
  description?: string;
  roleLabel?: string;
  kind?: WorkspaceKind | "route";
};

export type PlatformSurfaceGroup = {
  id: string;
  title: string;
  description?: string;
  links: PlatformSurfaceLink[];
};

const ORG_ROLE_LABELS: Record<OrgRole, string> = {
  OWNER: "Organisation owner",
  ADMIN: "Organisation admin",
};

const ATTENDEE_EVENT_ROUTES = [
  { suffix: "", label: "Event overview", description: "Delegate home for this event" },
  { suffix: "/agenda", label: "Agenda", description: "Sessions and Teams join links" },
  { suffix: "/directory", label: "Directory", description: "Matchmaking and connections" },
  { suffix: "/matchmaking", label: "Matching", description: "Questionnaire and profile" },
  { suffix: "/meetings", label: "Meetings", description: "Meeting requests and schedule" },
  { suffix: "/calendar", label: "Calendar", description: "Calendar connections" },
  { suffix: "/profile", label: "Profile", description: "Public delegate profile" },
  { suffix: "/privacy", label: "Privacy", description: "Visibility and AI opt-in" },
  { suffix: "/qr", label: "Check-in QR", description: "Personal check-in code" },
] as const;

function globalWorkspaceLinks(): PlatformSurfaceLink[] {
  return [
    {
      href: "/home",
      label: "Workspace picker",
      description: "Choose attendee, organiser, or platform surface",
      roleLabel: "All signed-in users",
      kind: "route",
    },
    {
      href: "/me",
      label: "Attendee portal",
      description: "Registered delegate experience",
      roleLabel: WORKSPACE_KIND_LABELS.attendee,
      kind: "attendee",
    },
    {
      href: "/platform",
      label: "Platform oversight",
      description: "Super-admin metrics and controls",
      roleLabel: WORKSPACE_KIND_LABELS.platform,
      kind: "platform",
    },
  ];
}

function organiserLinks(orgSlug: string, orgName: string): PlatformSurfaceLink[] {
  const base = `/app/${orgSlug}`;
  return [
    {
      href: base,
      label: "Organiser dashboard",
      description: orgName,
      roleLabel: ORG_ROLE_LABELS.OWNER,
      kind: "organiser",
    },
    {
      href: `${base}/events`,
      label: "Events list",
      description: "All events for this organisation",
      roleLabel: ORG_ROLE_LABELS.ADMIN,
      kind: "organiser",
    },
    {
      href: `${base}/audit`,
      label: "Audit logs",
      description: "Organisation audit trail",
      roleLabel: ORG_ROLE_LABELS.ADMIN,
      kind: "organiser",
    },
    {
      href: `${base}/settings`,
      label: "Organisation settings",
      description: "Members, integrations, and configuration",
      roleLabel: ORG_ROLE_LABELS.OWNER,
      kind: "organiser",
    },
    {
      href: `${base}/settings?tab=integrations`,
      label: "Integrations",
      description: "HubSpot, Salesforce, Microsoft, and more",
      roleLabel: ORG_ROLE_LABELS.ADMIN,
      kind: "organiser",
    },
  ];
}

function eventDayLinks(
  orgSlug: string,
  eventId: string,
  eventName: string,
): PlatformSurfaceLink[] {
  const base = `/app/${orgSlug}/events/${eventId}/day`;
  return [
    {
      href: base,
      label: "Scan check-in",
      description: `${eventName} · QR scan and immediate check-in`,
      roleLabel: eventRoleLabel("CHECKIN_STAFF"),
      kind: "event_operations",
    },
    {
      href: `${base}/lookup`,
      label: "Delegate lookup",
      description: `${eventName} · Search by name or company`,
      roleLabel: eventRoleLabel("CHECKIN_STAFF"),
      kind: "event_operations",
    },
    {
      href: `${base}/badges`,
      label: "Badge print queue",
      description: `${eventName} · Print and invalidate badges after desk check-in`,
      roleLabel: eventRoleLabel("CHECKIN_STAFF"),
      kind: "event_operations",
    },
    {
      href: `${base}/entrance`,
      label: "Entrance scan",
      description: `${eventName} · Validate printed badge credentials (reprints revoke old badges)`,
      roleLabel: eventRoleLabel("CHECKIN_STAFF"),
      kind: "event_operations",
    },
    {
      href: `/app/${orgSlug}/events/${eventId}/check-in`,
      label: "Check-in (redirect)",
      description: `${eventName} · Legacy URL redirects to event day scan`,
      roleLabel: eventRoleLabel("CHECKIN_STAFF"),
      kind: "event_operations",
    },
  ];
}

function eventRoleLinks(
  orgSlug: string,
  eventId: string,
  eventName: string,
): PlatformSurfaceLink[] {
  const roles = Object.values(EventRoleEnum) as EventRole[];
  return roles.map((role) => ({
    href: eventRoleDefaultHref(orgSlug, eventId, role),
    label: eventName,
    description: eventRoleWorkspaceDescription(role),
    roleLabel: eventRoleLabel(role),
    kind: "event_operations" as const,
  }));
}

function eventOrganiserRouteLinks(
  orgSlug: string,
  eventId: string,
): PlatformSurfaceLink[] {
  const groups = eventNavGroups(orgSlug, eventId);
  const items = groups.flatMap((group) =>
    group.items.map((item) => ({
      href: item.href,
      label: item.label,
      description: `${group.label} · organiser event console`,
      roleLabel: "Organiser / event admin",
      kind: "organiser" as const,
    })),
  );
  const settings = eventSettingsItem(orgSlug, eventId);
  items.push({
    href: settings.href,
    label: settings.label,
    description: "Event configuration · organiser event console",
    roleLabel: "Organiser / event admin",
    kind: "organiser",
  });
  return items;
}

function attendeeEventLinks(eventId: string, eventName: string): PlatformSurfaceLink[] {
  const base = `/me/events/${eventId}`;
  return ATTENDEE_EVENT_ROUTES.map((route) => ({
    href: `${base}${route.suffix}`,
    label: route.label,
    description: `${eventName} · ${route.description}`,
    roleLabel: WORKSPACE_KIND_LABELS.attendee,
    kind: "attendee" as const,
  }));
}

export function buildPlatformSurfaceCatalog(input: {
  organisations: { slug: string; name: string }[];
  events: { id: string; name: string; organisation: { slug: string; name: string } }[];
}): PlatformSurfaceGroup[] {
  const groups: PlatformSurfaceGroup[] = [
    {
      id: "global",
      title: "Global workspaces",
      description:
        "Core product surfaces. Platform admins can open any route below without separate membership.",
      links: globalWorkspaceLinks(),
    },
  ];

  for (const org of input.organisations) {
    groups.push({
      id: `org:${org.slug}`,
      title: org.name,
      description: `Organiser console · ${org.slug}`,
      links: organiserLinks(org.slug, org.name),
    });
  }

  for (const event of input.events) {
    const { slug, name: orgName } = event.organisation;
    groups.push({
      id: `event_day:${event.id}`,
      title: `${event.name} — event day`,
      description: `${orgName} · Mobile-first staff surfaces for check-in and lookup`,
      links: eventDayLinks(slug, event.id, event.name),
    });

    groups.push({
      id: `event_roles:${event.id}`,
      title: `${event.name}`,
      description: `${orgName} · Event role entry points (Phase 2–4 staff surfaces)`,
      links: eventRoleLinks(slug, event.id, event.name),
    });

    groups.push({
      id: `event_routes:${event.id}`,
      title: `${event.name} — organiser routes`,
      description: "Full event console sections available to organisers and event administrators",
      links: eventOrganiserRouteLinks(slug, event.id),
    });

    groups.push({
      id: `event_attendee:${event.id}`,
      title: `${event.name} — attendee routes`,
      description:
        "Delegate portal pages. Requires a registered attendee on the signed-in account to use fully.",
      links: attendeeEventLinks(event.id, event.name),
    });
  }

  return groups;
}

export { ORG_ROLE_LABELS, ATTENDEE_EVENT_ROUTES };
