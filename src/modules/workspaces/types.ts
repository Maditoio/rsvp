import type { EventRole, OrgRole } from "@prisma/client";

/**
 * Product surfaces a signed-in user can switch between.
 * Add new kinds (e.g. badge_printing) without changing shell routing.
 */
export type WorkspaceKind =
  | "attendee"
  | "organiser"
  | "event_operations"
  | "platform";

export type WorkspaceMeta = {
  orgSlug?: string;
  orgName?: string;
  eventId?: string;
  eventName?: string;
  orgRole?: OrgRole;
  eventRole?: EventRole;
};

export type UserWorkspace = {
  /** Stable id for React keys and “last workspace” persistence. */
  id: string;
  kind: WorkspaceKind;
  label: string;
  description: string;
  href: string;
  meta?: WorkspaceMeta;
};

export type UserWorkspacesResult = {
  workspaces: UserWorkspace[];
  /** When only one workspace exists, /home redirects here. */
  defaultHref: string | null;
};

export const WORKSPACE_KIND_LABELS: Record<WorkspaceKind, string> = {
  attendee: "Attendee",
  organiser: "Organiser",
  event_operations: "Event day",
  platform: "Platform",
};
