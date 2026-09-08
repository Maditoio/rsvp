export type ReminderEmailKind = "invitation" | "registration" | "event";

export function reminderEmailSubject(kind: ReminderEmailKind, eventName: string) {
  switch (kind) {
    case "invitation":
      return `Reminder: your invitation to ${eventName}`;
    case "registration":
      return `Reminder: complete registration for ${eventName}`;
    case "event":
      return `${eventName} starts soon`;
  }
}
