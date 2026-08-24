export const EVENT_SETTINGS_TABS = [
  { id: "general", label: "General" },
  { id: "operations", label: "Operations" },
  { id: "badges", label: "Badges" },
] as const;

export type EventSettingsTabId = (typeof EVENT_SETTINGS_TABS)[number]["id"];

export function resolveEventSettingsTab(
  value: string | null | undefined,
): EventSettingsTabId {
  switch (value) {
    case "operations":
    case "badges":
    case "general":
      return value;
    default:
      return "general";
  }
}
