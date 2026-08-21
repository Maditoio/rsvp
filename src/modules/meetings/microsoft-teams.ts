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

/**
 * Microsoft Graph onlineMeeting startDateTime/endDateTime are DateTimeOffset.
 * Docs use fractional seconds with an explicit offset, e.g.
 * 2019-07-12T14:30:34.2444915-07:00 — not a bare "...00Z" form.
 */
export function toGraphOnlineMeetingDateTime(date: Date): string {
  const iso = date.toISOString(); // e.g. 2026-09-15T12:00:00.000Z
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\.(\d{3})Z$/.exec(iso);
  if (!match) {
    // Fallback: keep a parseable UTC offset form.
    return iso.replace(/Z$/, "+00:00");
  }
  const [, head, ms] = match;
  return `${head}.${ms}0000+00:00`;
}

function sanitizeGraphErrorBody(text: string) {
  try {
    const json = JSON.parse(text) as {
      error?: {
        code?: string;
        message?: string;
        innerError?: Record<string, unknown>;
      };
    };
    return {
      graphCode: json.error?.code,
      graphMessage: json.error?.message?.slice(0, 500),
      innerError: json.error?.innerError
        ? {
            code: json.error.innerError.code,
            message:
              typeof json.error.innerError.message === "string"
                ? json.error.innerError.message.slice(0, 300)
                : undefined,
            "request-id": json.error.innerError["request-id"],
            "client-request-id": json.error.innerError["client-request-id"],
            date: json.error.innerError.date,
          }
        : undefined,
    };
  } catch {
    return {
      rawPreview: text.slice(0, 300).replace(/[A-Za-z0-9_-]{20,}/g, "[redacted]"),
    };
  }
}

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
  if (status === 400) {
    if (/9002|15000|personal|MSA|license/i.test(body)) {
      return "Microsoft could not create a Teams meeting for this account. Use a work or school Microsoft account with a Teams license, and check the session start/end times.";
    }
    return "Microsoft rejected the Teams meeting details. Check the session title and start/end times, then try again.";
  }
  return "Could not complete the Teams meeting request. Try again in a moment.";
}

async function graphJson(
  connection: CalendarConnectionRecord,
  path: string,
  init?: RequestInit & { diagnosticLabel?: string },
) {
  const token = await getValidMicrosoftAccessToken(connection);
  const { diagnosticLabel, ...fetchInit } = init ?? {};
  const method = (fetchInit.method ?? "GET").toUpperCase();
  const headerNames = [
    "Authorization",
    "Content-Type",
    ...Object.keys(fetchInit.headers ?? {}),
  ];
  const uniqueHeaderNames = [...new Set(headerNames.map((h) => h.toLowerCase()))];

  let parsedBody: unknown = undefined;
  if (typeof fetchInit.body === "string" && fetchInit.body.length > 0) {
    try {
      parsedBody = JSON.parse(fetchInit.body) as unknown;
    } catch {
      parsedBody = { parseError: true, bodyLength: fetchInit.body.length };
    }
  }

  console.info("[teams-graph] request", {
    label: diagnosticLabel ?? path,
    method,
    path,
    headerNames: uniqueHeaderNames,
    hasAuthorization: true,
    contentType: "application/json",
    // Sanitized payload only — never tokens.
    body: parsedBody,
  });

  const res = await fetch(`${GRAPH}${path}`, {
    ...fetchInit,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(fetchInit.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    const sanitized = sanitizeGraphErrorBody(text);
    console.error("[teams-graph] response_error", {
      label: diagnosticLabel ?? path,
      status: res.status,
      method,
      path,
      requestBody: parsedBody,
      ...sanitized,
    });
    throw new Error(userMessageFromGraph(res.status, text));
  }

  console.info("[teams-graph] response_ok", {
    label: diagnosticLabel ?? path,
    status: res.status,
    bodyLength: text.length,
  });

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
 * Times are sent as Graph DateTimeOffset strings per create onlineMeeting docs.
 */
export async function createTeamsMeeting(
  connection: CalendarConnectionRecord,
  input: {
    subject: string;
    start: Date;
    end: Date;
  },
): Promise<TeamsMeetingResult> {
  const body = {
    subject: input.subject,
    startDateTime: toGraphOnlineMeetingDateTime(input.start),
    endDateTime: toGraphOnlineMeetingDateTime(input.end),
  };

  const payload = await graphJson(connection, "/me/onlineMeetings", {
    method: "POST",
    diagnosticLabel: "createOnlineMeeting",
    body: JSON.stringify(body),
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
    { diagnosticLabel: "getOnlineMeeting" },
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
    start?: Date;
    end?: Date;
  },
): Promise<TeamsMeetingResult> {
  const body: Record<string, string> = {};
  if (input.subject) body.subject = input.subject;
  if (input.start) {
    body.startDateTime = toGraphOnlineMeetingDateTime(input.start);
  }
  if (input.end) {
    body.endDateTime = toGraphOnlineMeetingDateTime(input.end);
  }

  const payload = await graphJson(
    connection,
    `/me/onlineMeetings/${encodeURIComponent(providerMeetingId)}`,
    {
      method: "PATCH",
      diagnosticLabel: "updateOnlineMeeting",
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
    { method: "DELETE", diagnosticLabel: "deleteOnlineMeeting" },
  );
}
