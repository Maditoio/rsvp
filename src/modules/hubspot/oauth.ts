import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { decryptSecret, encryptSecret } from "@/lib/crypto/secret";

const HUBSPOT_AUTH_URL = "https://app.hubspot.com/oauth/authorize";
const HUBSPOT_TOKEN_URL = "https://api.hubapi.com/oauth/v3/token";
const HUBSPOT_INTROSPECT_URL = "https://api.hubapi.com/oauth/v3/token/introspect";

/** Scopes required for org CRM contact read (import later). */
export const HUBSPOT_SCOPES = ["oauth", "crm.objects.contacts.read"] as const;

export function hubspotConfigured() {
  return Boolean(
    process.env.HUBSPOT_CLIENT_ID?.trim() &&
      process.env.HUBSPOT_CLIENT_SECRET?.trim(),
  );
}

function getClientId() {
  const id = process.env.HUBSPOT_CLIENT_ID?.trim();
  if (!id) throw new Error("HUBSPOT_CLIENT_ID is not configured");
  return id;
}

function getClientSecret() {
  const secret = process.env.HUBSPOT_CLIENT_SECRET?.trim();
  if (!secret) throw new Error("HUBSPOT_CLIENT_SECRET is not configured");
  return secret;
}

/** Fixed redirect URI — register exactly this URL in HubSpot app settings. */
export function getHubSpotRedirectUri(appUrl: string) {
  return `${appUrl.replace(/\/$/, "")}/api/auth/hubspot/callback`;
}

export function getHubSpotAuthUrl(appUrl: string, state: string): string {
  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: getHubSpotRedirectUri(appUrl),
    scope: HUBSPOT_SCOPES.join(" "),
    state,
  });
  return `${HUBSPOT_AUTH_URL}?${params.toString()}`;
}

const tokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
  token_type: z.string().optional(),
  hub_id: z.union([z.number(), z.string()]).optional(),
  scopes: z.array(z.string()).optional(),
});

export type HubSpotTokenBundle = {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  portalId: string | null;
  scopes: string;
};

export async function exchangeHubSpotCode(
  code: string,
  appUrl: string,
): Promise<HubSpotTokenBundle> {
  const res = await fetch(HUBSPOT_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: getClientId(),
      client_secret: getClientSecret(),
      redirect_uri: getHubSpotRedirectUri(appUrl),
      code,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HubSpot token exchange failed: ${res.status} ${text}`);
  }

  const data = tokenResponseSchema.parse(await res.json());
  let portalId =
    data.hub_id !== undefined && data.hub_id !== null
      ? String(data.hub_id)
      : null;

  if (!portalId) {
    portalId = await fetchHubSpotPortalId(data.access_token);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
    portalId,
    scopes: (data.scopes ?? [...HUBSPOT_SCOPES]).join(" "),
  };
}

export async function refreshHubSpotToken(
  refreshToken: string,
): Promise<Omit<HubSpotTokenBundle, "refreshToken" | "portalId" | "scopes"> & {
  refreshToken?: string;
}> {
  const res = await fetch(HUBSPOT_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: getClientId(),
      client_secret: getClientSecret(),
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HubSpot token refresh failed: ${res.status} ${text}`);
  }

  const data = tokenResponseSchema.parse(await res.json());
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

const introspectSchema = z.object({
  hub_id: z.union([z.number(), z.string()]).optional(),
  active: z.boolean().optional(),
});

/** Official token metadata (portal / hub id) via OAuth introspect. */
export async function fetchHubSpotPortalId(
  accessToken: string,
): Promise<string | null> {
  const res = await fetch(HUBSPOT_INTROSPECT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: getClientId(),
      client_secret: getClientSecret(),
      token_type_hint: "access_token",
      token: accessToken,
      access_token: accessToken,
    }),
  });

  if (!res.ok) return null;
  const data = introspectSchema.safeParse(await res.json());
  if (!data.success || data.data.hub_id === undefined || data.data.hub_id === null) {
    return null;
  }
  return String(data.data.hub_id);
}

export type HubSpotConnectionRecord = {
  id: string;
  accessTokenEnc: string;
  refreshTokenEnc: string;
  expiresAt: Date | null;
};

/**
 * Decrypt a stored access token, refreshing and re-encrypting when near expiry.
 */
export async function getValidHubSpotAccessToken(
  connection: HubSpotConnectionRecord,
): Promise<string> {
  if (connection.expiresAt && connection.expiresAt > new Date(Date.now() + 60_000)) {
    return decryptSecret(connection.accessTokenEnc);
  }

  const refreshToken = decryptSecret(connection.refreshTokenEnc);
  const refreshed = await refreshHubSpotToken(refreshToken);

  await prisma.hubSpotConnection.update({
    where: { id: connection.id },
    data: {
      accessTokenEnc: encryptSecret(refreshed.accessToken),
      ...(refreshed.refreshToken
        ? { refreshTokenEnc: encryptSecret(refreshed.refreshToken) }
        : {}),
      expiresAt: refreshed.expiresAt,
    },
  });

  return refreshed.accessToken;
}

/** Best-effort revoke of the HubSpot refresh token on disconnect. */
export async function revokeHubSpotRefreshToken(refreshToken: string) {
  try {
    await fetch(
      `https://api.hubapi.com/oauth/v1/refresh-tokens/${encodeURIComponent(refreshToken)}`,
      { method: "DELETE" },
    );
  } catch {
    // Ignore revoke failures — local disconnect still proceeds.
  }
}
