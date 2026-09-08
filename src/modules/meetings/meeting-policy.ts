export const SESSION_MEETING_POLICIES = [
  "BLOCK_REGISTERED",
  "BLOCK_ALL",
  "MEETING_WINDOW",
] as const;

export type SessionMeetingPolicyValue =
  (typeof SESSION_MEETING_POLICIES)[number];

export type MeetingPolicyBlock = {
  startsAt: Date | null;
  endsAt: Date | null;
  meetingPolicy: SessionMeetingPolicyValue;
  title?: string | null;
};

export function sessionMeetingPolicyLabel(policy: SessionMeetingPolicyValue) {
  switch (policy) {
    case "BLOCK_ALL":
      return "No meetings for everyone";
    case "MEETING_WINDOW":
      return "Meeting window";
    case "BLOCK_REGISTERED":
    default:
      return "Block registered attendees";
  }
}

export function sessionMeetingPolicyHelp(policy: SessionMeetingPolicyValue) {
  switch (policy) {
    case "BLOCK_ALL":
      return "Use for keynotes, lunch, opening and closing sessions.";
    case "MEETING_WINDOW":
      return "Auto-scheduling can place meetings only inside these agenda items.";
    case "BLOCK_REGISTERED":
    default:
      return "Only attendees registered for this session are blocked from meetings.";
  }
}

export function sessionMeetingPolicyTone(
  policy: SessionMeetingPolicyValue,
): "muted" | "warning" | "success" {
  switch (policy) {
    case "BLOCK_ALL":
      return "warning";
    case "MEETING_WINDOW":
      return "success";
    case "BLOCK_REGISTERED":
    default:
      return "muted";
  }
}

export function splitMeetingPolicyBlocks(
  sessions: MeetingPolicyBlock[],
): {
  meetingWindows: Array<{ start: Date; end: Date }>;
  globalBlocks: Array<{ start: Date; end: Date; title?: string | null }>;
} {
  const meetingWindows: Array<{ start: Date; end: Date }> = [];
  const globalBlocks: Array<{ start: Date; end: Date; title?: string | null }> = [];

  for (const session of sessions) {
    if (!session.startsAt || !session.endsAt || session.startsAt >= session.endsAt) {
      continue;
    }
    if (session.meetingPolicy === "MEETING_WINDOW") {
      meetingWindows.push({ start: session.startsAt, end: session.endsAt });
      continue;
    }
    if (session.meetingPolicy === "BLOCK_ALL") {
      globalBlocks.push({
        start: session.startsAt,
        end: session.endsAt,
        title: session.title ?? null,
      });
    }
  }

  return { meetingWindows, globalBlocks };
}
