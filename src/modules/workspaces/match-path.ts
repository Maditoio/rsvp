import type { UserWorkspace } from "./types";

/** Match the active workspace from the current URL (client-safe). */
export function matchWorkspaceFromPath(
  pathname: string,
  workspaces: UserWorkspace[],
): UserWorkspace | null {
  if (pathname === "/home") return null;

  if (pathname.startsWith("/platform")) {
    return workspaces.find((w) => w.kind === "platform") ?? null;
  }

  if (pathname === "/me" || pathname.startsWith("/me/")) {
    return workspaces.find((w) => w.kind === "attendee") ?? null;
  }

  const appMatch = pathname.match(/^\/app\/([^/]+)/);
  if (!appMatch) return null;
  const orgSlug = appMatch[1];

  const eventMatch = pathname.match(/^\/app\/[^/]+\/events\/([^/]+)/);
  const eventId = eventMatch?.[1] ?? null;

  if (eventId) {
    const eventDay = workspaces.find(
      (w) =>
        w.kind === "event_operations" &&
        w.meta?.orgSlug === orgSlug &&
        w.meta?.eventId === eventId &&
        pathname.includes("/day"),
    );
    if (eventDay) return eventDay;

    const eventOps = workspaces.find(
      (w) =>
        w.kind === "event_operations" &&
        w.meta?.orgSlug === orgSlug &&
        w.meta?.eventId === eventId,
    );
    if (eventOps) return eventOps;
  }

  return (
    workspaces.find(
      (w) => w.kind === "organiser" && w.meta?.orgSlug === orgSlug,
    ) ?? null
  );
}
