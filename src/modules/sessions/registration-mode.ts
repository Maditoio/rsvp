export const SESSION_REGISTRATION_MODES = [
  "OPEN",
  "REQUIRED",
  "CLOSED",
] as const;

export type SessionRegistrationModeValue =
  (typeof SESSION_REGISTRATION_MODES)[number];

export function sessionRegistrationModeLabel(
  mode: SessionRegistrationModeValue,
): string {
  switch (mode) {
    case "REQUIRED":
      return "Registration required";
    case "CLOSED":
      return "Registration closed";
    default:
      return "Optional";
  }
}

export function sessionRegistrationModeHelp(
  mode: SessionRegistrationModeValue,
): string {
  switch (mode) {
    case "REQUIRED":
      return "Attendees should add this session to their agenda.";
    case "CLOSED":
      return "Attendees cannot newly register; existing picks can still be removed.";
    default:
      return "Attendees can optionally add this session to their agenda.";
  }
}

export function sessionRegistrationModeTone(
  mode: SessionRegistrationModeValue,
): "muted" | "warning" | "danger" | "info" {
  switch (mode) {
    case "REQUIRED":
      return "warning";
    case "CLOSED":
      return "danger";
    default:
      return "muted";
  }
}
