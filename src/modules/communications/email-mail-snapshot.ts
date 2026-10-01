import {
  resolveEmailBranding,
  type EmailBranding,
} from "@/modules/communications/email-branding";

export type EventMailContext = {
  eventName: string;
  orgName: string;
  venue: string | null;
  timezone: string;
  startsAt: Date | null;
  endsAt: Date | null;
  description: string | null;
  branding: EmailBranding;
};

/** JSON-safe snapshot for Inngest / queue payloads — load once, reuse for every recipient. */
export type EventMailSnapshot = {
  eventName: string;
  orgName: string;
  venue: string | null;
  timezone: string;
  startsAt: string | null;
  endsAt: string | null;
  description: string | null;
  branding: EmailBranding;
};

export function eventMailContextToSnapshot(
  ctx: EventMailContext,
): EventMailSnapshot {
  return {
    eventName: ctx.eventName,
    orgName: ctx.orgName,
    venue: ctx.venue,
    timezone: ctx.timezone,
    startsAt: ctx.startsAt?.toISOString() ?? null,
    endsAt: ctx.endsAt?.toISOString() ?? null,
    description: ctx.description,
    branding: ctx.branding,
  };
}

export function eventMailContextFromSnapshot(
  snapshot: EventMailSnapshot,
): EventMailContext {
  return {
    eventName: snapshot.eventName,
    orgName: snapshot.orgName,
    venue: snapshot.venue,
    timezone: snapshot.timezone,
    startsAt: snapshot.startsAt ? new Date(snapshot.startsAt) : null,
    endsAt: snapshot.endsAt ? new Date(snapshot.endsAt) : null,
    description: snapshot.description,
    branding: snapshot.branding,
  };
}

export type PartialMailInput = Partial<EventMailContext> & {
  eventName?: string;
  orgName?: string;
  mail?: EventMailSnapshot;
};

export function resolveMailContextFromPartial(
  partial: PartialMailInput = {},
): EventMailContext | null {
  if (partial.mail) {
    return eventMailContextFromSnapshot(partial.mail);
  }

  if (
    partial.branding != null &&
    typeof partial.eventName === "string" &&
    typeof partial.orgName === "string" &&
    partial.venue !== undefined &&
    typeof partial.timezone === "string" &&
    partial.startsAt !== undefined &&
    partial.endsAt !== undefined &&
    partial.description !== undefined
  ) {
    return {
      eventName: partial.eventName,
      orgName: partial.orgName,
      venue: partial.venue ?? null,
      timezone: partial.timezone,
      startsAt: partial.startsAt ?? null,
      endsAt: partial.endsAt ?? null,
      description: partial.description ?? null,
      branding: partial.branding,
    };
  }

  return null;
}

export function emptyEventMailContext(
  partial: PartialMailInput = {},
): EventMailContext {
  return {
    eventName: partial.eventName ?? "your event",
    orgName: partial.orgName ?? "the organiser",
    venue: partial.venue ?? null,
    timezone: partial.timezone ?? "UTC",
    startsAt: partial.startsAt ?? null,
    endsAt: partial.endsAt ?? null,
    description: partial.description ?? null,
    branding: partial.branding ?? resolveEmailBranding({}),
  };
}
