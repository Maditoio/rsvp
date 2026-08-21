import { z } from "zod";
import {
  getValidMicrosoftAccessToken,
  type CalendarConnectionRecord,
} from "@/modules/calendar/microsoft";

const GRAPH = "https://graph.microsoft.com/v1.0";

const onlineMeetingSchema = z.object({
  id: z.string(),
  joinWebUrl: z.string().url().optional(),
  joinUrl: z.string().url().optional(),
  subject: z.string().optional(),
});

export type TeamsMeetingResult = {
  providerMeetingId: string;
  joinUrl: string;
  raw: unknown;
};

function userMessageFromGraph(status: number, body: string): string {
  if (status === 401 || status === 403) {
    if (/OnlineMeetings/i.test(body) || /scope|permission|consent/i.test(body)) {
      return "Microsoft needs to be reconnected before you can create a Teams meeting. Reconnect and grant online meeting access.";
    }
    return "Microsoft authorization expired or was revoked. Reconnect Microsoft and try again.";
  }
  if (status === 404) {
    return "The Teams meeting could not be found. It may have been deleted in Microsoft Teams.";
  }
  return "Could not complete the Teams meeting request. Try again in a moment.";
}

async function graphJson(
  connection: CalendarConnectionRecord,
  path: string,
  init?: RequestInit,
) {
  const token = await getValidMicrosoftAccessToken(connection);
  const res = await fetch(`${GRAPH}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    console.error("[teams-graph]", res.status, text.slice(0, 500));
    throw new Error(userMessageFromGraph(res.status, text));
  }
  if (!text) return null;
  return JSON.parse(text) as unknown;
}

function joinUrlFromPayload(data: z.infer<typeof onlineMeetingSchema>) {
  const url = data.joinWebUrl ?? data.joinUrl;
  if (!url) throw new Error("Microsoft did not return a Teams join link.");
  return url;
}

/**
 * Create a Teams online meeting for the connected Microsoft user.
 * Times must be ISO-8601 (prefer absolute offsets / UTC).
 */
export async function createTeamsMeeting(
  connection: CalendarConnectionRecord,
  input: {
    subject: string;
    startIso: string;
    endIso: string;
  },
): Promise<TeamsMeetingResult> {
  const payload = await graphJson(connection, "/me/onlineMeetings", {
    method: "POST",
    body: JSON.stringify({
      subject: input.subject,
      startDateTime: input.startIso,
      endDateTime: input.endIso,
    }),
  });
  const data = onlineMeetingSchema.parse(payload);
  return {
    providerMeetingId: data.id,
    joinUrl: joinUrlFromPayload(data),
    raw: payload,
  };
}

export async function getTeamsMeeting(
  connection: CalendarConnectionRecord,
  providerMeetingId: string,
): Promise<TeamsMeetingResult> {
  const payload = await graphJson(
    connection,
    `/me/onlineMeetings/${encodeURIComponent(providerMeetingId)}`,
  );
  const data = onlineMeetingSchema.parse(payload);
  return {
    providerMeetingId: data.id,
    joinUrl: joinUrlFromPayload(data),
    raw: payload,
  };
}

export async function updateTeamsMeeting(
  connection: CalendarConnectionRecord,
  providerMeetingId: string,
  input: {
    subject?: string;
    startIso?: string;
    endIso?: string;
  },
): Promise<TeamsMeetingResult> {
  const body: Record<string, string> = {};
  if (input.subject) body.subject = input.subject;
  if (input.startIso) body.startDateTime = input.startIso;
  if (input.endIso) body.endDateTime = input.endIso;

  const payload = await graphJson(
    connection,
    `/me/onlineMeetings/${encodeURIComponent(providerMeetingId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
  const data = onlineMeetingSchema.parse(payload);
  return {
    providerMeetingId: data.id,
    joinUrl: joinUrlFromPayload(data),
    raw: payload,
  };
}

export async function deleteTeamsMeeting(
  connection: CalendarConnectionRecord,
  providerMeetingId: string,
): Promise<void> {
  await graphJson(
    connection,
    `/me/onlineMeetings/${encodeURIComponent(providerMeetingId)}`,
    { method: "DELETE" },
  );
}
