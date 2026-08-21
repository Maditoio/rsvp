import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { CalendarConnectionRecord } from "./google";

export type { CalendarConnectionRecord };

const TENANT = process.env.MICROSOFT_TENANT_ID?.trim() || "common";
const MS_AUTH_URL = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/authorize`;
const MS_TOKEN_URL = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`;
const GRAPH_API = "https://graph.microsoft.com/v1.0";

const SCOPES = [
  "openid",
  "offline_access",
  "Calendars.ReadWrite",
  // Required to create/update/delete Teams online meetings for event sessions.
  // Existing Microsoft connections must reconnect once to grant this scope.
  "OnlineMeetings.ReadWrite",
];

export const MICROSOFT_OAUTH_SCOPES = SCOPES;

function getClientId() {
  const id = process.env.MICROSOFT_CLIENT_ID;
  if (!id) throw new Error("MICROSOFT_CLIENT_ID is not configured");
  return id;
}

function getClientSecret() {
  const secret = process.env.MICROSOFT_CLIENT_SECRET;
  if (!secret) throw new Error("MICROSOFT_CLIENT_SECRET is not configured");
  return secret;
}

/** Fixed redirect URI — register exactly this URL in Microsoft Entra. */
export function getMicrosoftRedirectUri(appUrl: string) {
  return `${appUrl.replace(/\/$/, "")}/api/auth/microsoft/callback`;
}

export function getMicrosoftAuthUrl(appUrl: string, state: string): string {
  const redirectUri = getMicrosoftRedirectUri(appUrl);
  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES.join(" "),
    response_mode: "query",
    // Ensure a refresh token is issued (needed for Connected → sync later).
    prompt: "consent",
    state,
  });
  return `${MS_AUTH_URL}?${params.toString()}`;
}

const tokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  expires_in: z.number(),
  token_type: z.string(),
});

/** Strip anything that could be a secret from Microsoft token error bodies. */
function sanitizeMicrosoftTokenErrorBody(text: string) {
  try {
    const json = JSON.parse(text) as Record<string, unknown>;
    return {
      error: typeof json.error === "string" ? json.error : undefined,
      errorCodes: Array.isArray(json.error_codes) ? json.error_codes : undefined,
      errorDescription:
        typeof json.error_description === "string"
          ? json.error_description.slice(0, 500)
          : undefined,
      correlationId:
        typeof json.correlation_id === "string" ? json.correlation_id : undefined,
      traceId: typeof json.trace_id === "string" ? json.trace_id : undefined,
    };
  } catch {
    return { rawPreview: text.slice(0, 200).replace(/[A-Za-z0-9_-]{20,}/g, "[redacted]") };
  }
}

export async function exchangeMicrosoftCode(code: string, appUrl: string) {
  const redirectUri = getMicrosoftRedirectUri(appUrl);
  console.info("[microsoft-oauth] token_exchange_start", {
    tokenHost: new URL(MS_TOKEN_URL).host,
    tenantMode: TENANT === "common" ? "common" : "specific",
    redirectUri,
    scopeCount: SCOPES.length,
    scopes: SCOPES.filter((s) => s !== "openid"),
    hasCode: Boolean(code),
    codeLength: code.length,
  });

  const res = await fetch(MS_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: getClientId(),
      client_secret: getClientSecret(),
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      scope: SCOPES.join(" "),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    const sanitized = sanitizeMicrosoftTokenErrorBody(text);
    console.error("[microsoft-oauth] token_exchange_failed", {
      status: res.status,
      redirectUri,
      ...sanitized,
    });
    throw new Error(
      `Microsoft token exchange failed: ${res.status} ${sanitized.error ?? "unknown"} ${sanitized.errorDescription ?? ""}`.trim(),
    );
  }

  let data: z.infer<typeof tokenResponseSchema>;
  try {
    data = tokenResponseSchema.parse(await res.json());
  } catch (parseErr) {
    console.error("[microsoft-oauth] token_response_parse_failed", {
      message: parseErr instanceof Error ? parseErr.message : String(parseErr),
    });
    throw parseErr;
  }

  console.info("[microsoft-oauth] token_exchange_ok", {
    hasAccessToken: Boolean(data.access_token),
    hasRefreshToken: Boolean(data.refresh_token),
    expiresIn: data.expires_in,
    tokenType: data.token_type,
  });

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

export async function refreshMicrosoftToken(refreshToken: string) {
  const res = await fetch(MS_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: getClientId(),
      client_secret: getClientSecret(),
      grant_type: "refresh_token",
      scope: SCOPES.join(" "),
    }),
  });

  if (!res.ok) {
    throw new Error(`Microsoft token refresh failed: ${res.status}`);
  }

  const data = tokenResponseSchema.parse(await res.json());
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

export async function getValidMicrosoftAccessToken(
  connection: CalendarConnectionRecord,
): Promise<string> {
  if (connection.expiresAt && connection.expiresAt > new Date(Date.now() + 60_000)) {
    return connection.accessTokenEnc;
  }
  if (!connection.refreshTokenEnc) {
    throw new Error("Microsoft Calendar access expired. Reconnect your calendar.");
  }
  const refreshed = await refreshMicrosoftToken(connection.refreshTokenEnc);
  await prisma.calendarConnection.update({
    where: { id: connection.id },
    data: {
      accessTokenEnc: refreshed.accessToken,
      refreshTokenEnc: refreshed.refreshToken,
      expiresAt: refreshed.expiresAt,
    },
  });
  return refreshed.accessToken;
}

export async function createMicrosoftCalendarEvent(
  accessToken: string,
  event: {
    subject: string;
    location?: string;
    startDateTime: string;
    endDateTime: string;
    attendees: { email: string }[];
  },
): Promise<{ id: string } | { error: string }> {
  const body = {
    subject: event.subject,
    location: event.location ? { displayName: event.location } : undefined,
    start: { dateTime: event.startDateTime, timeZone: "UTC" },
    end: { dateTime: event.endDateTime, timeZone: "UTC" },
    attendees: event.attendees.map((a) => ({
      emailAddress: { address: a.email },
      type: "required" as const,
    })),
  };

  const res = await fetch(`${GRAPH_API}/me/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    return { error: `Could not create Outlook event (${res.status}). ${text.slice(0, 120)}` };
  }

  const data = await res.json();
  return { id: data.id as string };
}

export async function updateMicrosoftCalendarEvent(
  accessToken: string,
  externalId: string,
  event: {
    subject?: string;
    location?: string;
    startDateTime: string;
    endDateTime: string;
  },
): Promise<boolean> {
  const body = {
    subject: event.subject,
    location: event.location ? { displayName: event.location } : undefined,
    start: { dateTime: event.startDateTime, timeZone: "UTC" },
    end: { dateTime: event.endDateTime, timeZone: "UTC" },
  };

  const res = await fetch(`${GRAPH_API}/me/events/${externalId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return res.ok;
}

export async function deleteMicrosoftCalendarEvent(
  accessToken: string,
  externalId: string,
): Promise<boolean> {
  const res = await fetch(`${GRAPH_API}/me/events/${externalId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return res.ok || res.status === 404;
}

const scheduleResponseSchema = z.object({
  value: z.array(
    z.object({
      scheduleItems: z.array(
        z.object({
          start: z.object({ dateTime: z.string() }),
          end: z.object({ dateTime: z.string() }),
        }),
      ),
    }),
  ),
});

export async function fetchMicrosoftFreeBusy(
  accessToken: string,
  timeMin: Date,
  timeMax: Date,
  email: string,
): Promise<{ start: Date; end: Date }[]> {
  const body = {
    schedules: [email],
    startTime: { dateTime: timeMin.toISOString(), timeZone: "UTC" },
    endTime: { dateTime: timeMax.toISOString(), timeZone: "UTC" },
    availabilityViewInterval: 15,
  };

  const res = await fetch(`${GRAPH_API}/me/calendar/getSchedule`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Microsoft Calendar free/busy failed: ${res.status} ${text}`);
  }

  const data = scheduleResponseSchema.parse(await res.json());
  const items = data.value[0]?.scheduleItems ?? [];
  return items.map((item) => ({
    start: new Date(item.start.dateTime + "Z"),
    end: new Date(item.end.dateTime + "Z"),
  }));
}

export function microsoftConfigured(): boolean {
  return Boolean(
    process.env.MICROSOFT_CLIENT_ID?.trim() &&
    process.env.MICROSOFT_CLIENT_SECRET?.trim(),
  );
}
