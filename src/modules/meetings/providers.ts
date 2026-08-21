/**
 * Online meeting provider catalogue for event sessions.
 * Zoom is visible but intentionally unimplemented.
 */

export const ONLINE_MEETING_PROVIDERS = [
  {
    id: "TEAMS" as const,
    label: "Microsoft Teams",
    description: "Create a Teams meeting",
    status: "active" as const,
  },
  {
    id: "ZOOM" as const,
    label: "Zoom",
    description: "Coming soon",
    status: "coming_soon" as const,
  },
];

export type OnlineMeetingProviderId =
  (typeof ONLINE_MEETING_PROVIDERS)[number]["id"];

export function isActiveOnlineMeetingProvider(
  id: string,
): id is "TEAMS" {
  return id === "TEAMS";
}
