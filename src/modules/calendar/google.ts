import { z } from "zod";
import { prisma } from "@/lib/db/prisma";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
];

function getClientId() {
  const id = process.env.GOOGLE_CLIENT_ID;
  if (!id) throw new Error("GOOGLE_CLIENT_ID is not configured");
  return id;
}

function getClientSecret() {
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!secret) throw new Error("GOOGLE_CLIENT_SECRET is not configured");
  return secret;
}

/** Fixed redirect URI — register exactly this URL in Google Cloud Console. */
export function getGoogleRedirectUri(appUrl: string) {
  return `${appUrl.replace(/\/$/, "")}/api/auth/google/callback`;
}

export function getGoogleAuthUrl(appUrl: string, state: string): string {
  const redirectUri = getGoogleRedirectUri(appUrl);
  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

const tokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  expires_in: z.number(),
  token_type: z.string(),
});

export async function exchangeGoogleCode(code: string, appUrl: string) {
  const redirectUri = getGoogleRedirectUri(appUrl);
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: getClientId(),
      client_secret: getClientSecret(),
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google token exchange failed: ${res.status} ${text}`);
  }

  const data = tokenResponseSchema.parse(await res.json());
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

export async function refreshGoogleToken(refreshToken: string) {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: getClientId(),
      client_secret: getClientSecret(),
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    throw new Error(`Google token refresh failed: ${res.status}`);
  }

  const data = tokenResponseSchema.parse(await res.json());
  return {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

export interface CalendarConnectionRecord {
  id: string;
  accessTokenEnc: string;
  refreshTokenEnc: string | null;
  expiresAt: Date | null;
  provider: string;
}

export async function getValidGoogleAccessToken(
  connection: CalendarConnectionRecord,
): Promise<string> {
  if (connection.expiresAt && connection.expiresAt > new Date(Date.now() + 60_000)) {
    return connection.accessTokenEnc;
  }
  if (!connection.refreshTokenEnc) {
    throw new Error("Google Calendar access expired. Reconnect your calendar.");
  }
  const refreshed = await refreshGoogleToken(connection.refreshTokenEnc);
  await prisma.calendarConnection.update({
    where: { id: connection.id },
    data: {
      accessTokenEnc: refreshed.accessToken,
      expiresAt: refreshed.expiresAt,
    },
  });
  return refreshed.accessToken;
}

const freeBusyResponseSchema = z.object({
  calendars: z.record(
    z.string(),
    z.object({
      busy: z.array(
        z.object({
          start: z.string(),
          end: z.string(),
        }),
      ),
    }),
  ),
});

export async function fetchGoogleFreeBusy(
  accessToken: string,
  timeMin: Date,
  timeMax: Date,
): Promise<{ start: Date; end: Date }[]> {
  const res = await fetch(`${GOOGLE_CALENDAR_API}/freeBusy`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      items: [{ id: "primary" }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Calendar free/busy check failed: ${res.status} ${text}`);
  }

  const data = freeBusyResponseSchema.parse(await res.json());
  const busy = data.calendars.primary?.busy ?? [];
  return busy.map((b) => ({ start: new Date(b.start), end: new Date(b.end) }));
}
