import type { AttendeeStatus, PostEventAudience } from "@prisma/client";

export type PostEventAudienceInput =
  | "checked_in"
  | "registered"
  | "registered_not_checked_in";

export function parsePostEventAudience(
  value: string,
): PostEventAudienceInput {
  if (
    value === "checked_in" ||
    value === "registered" ||
    value === "registered_not_checked_in"
  ) {
    return value;
  }
  throw new Error("Invalid post-event audience");
}

export function toPostEventAudienceEnum(
  audience: PostEventAudienceInput,
): PostEventAudience {
  switch (audience) {
    case "checked_in":
      return "CHECKED_IN";
    case "registered":
      return "REGISTERED";
    case "registered_not_checked_in":
      return "REGISTERED_NOT_CHECKED_IN";
  }
}

export function audienceStatusFilter(
  audience: PostEventAudienceInput,
): AttendeeStatus[] {
  switch (audience) {
    case "checked_in":
      return ["CHECKED_IN"];
    case "registered":
      return ["REGISTERED", "CONFIRMED", "CHECKED_IN"];
    case "registered_not_checked_in":
      return ["REGISTERED", "CONFIRMED"];
  }
}

export function audienceLabel(audience: PostEventAudience | PostEventAudienceInput) {
  switch (audience) {
    case "CHECKED_IN":
    case "checked_in":
      return "Checked in";
    case "REGISTERED":
    case "registered":
      return "All registered";
    case "REGISTERED_NOT_CHECKED_IN":
    case "registered_not_checked_in":
      return "Registered, not checked in";
  }
}

export function defaultPostEventSubject(eventName: string) {
  return `Thank you for attending ${eventName}`;
}

/** Escape organiser plain text and turn blank lines into paragraphs. */
export function renderPostEventBodyHtml(
  body: string,
  escapeHtml: (value: string) => string,
  p: (html: string, muted?: boolean) => string,
) {
  const paragraphs = body
    .replaceAll("\r\n", "\n")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    return p("Thank you for being part of this event.");
  }

  return paragraphs
    .map((block) =>
      p(
        escapeHtml(block).replaceAll("\n", "<br />"),
      ),
    )
    .join("");
}

export function assertEventEligibleForPostEvent(input: {
  startsAt: Date | null;
  endsAt: Date | null;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const endsAt = input.endsAt ?? input.startsAt;
  if (!endsAt) {
    throw new Error(
      "Set the event end date before sending a post-event follow-up.",
    );
  }
  if (endsAt.getTime() > now.getTime()) {
    throw new Error(
      "Post-event follow-up can be sent after the event end date.",
    );
  }
}
