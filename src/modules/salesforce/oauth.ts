import { createHash, randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { decryptSecret, encryptSecret } from "@/lib/crypto/secret";

/**
 * Connected App OAuth scopes for read-only Contact import.
 * - api: REST/SOQL access (Contact read)
 * - refresh_token / offline_access: long-lived refresh (synonymous in Salesforce;
 *   both requested; enable refresh tokens on the Connected App)
 *
 * Production callback: https://bizconrsvp.com/api/auth/salesforce/callback
 *
 * Many Connected Apps require PKCE (`code_challenge`). Without it Salesforce
 * returns `error=invalid_request&error_description=missing required code challenge`
 * with an empty Content-Type — browsers download that body as a file named "authorize".
 */
export const SALESFORCE_SCOPES = [
  "api",
  "refresh_token",
  "offline_access",
] as const;

const API_VERSION = "v59.0";

export function salesforceConfigured() {
  return Boolean(
    process.env.SALESFORCE_CLIENT_ID?.trim() &&
      process.env.SALESFORCE_CLIENT_SECRET?.trim(),
  );
}

/**
 * Login host for authorize/token (production or sandbox).
 * Always returns an absolute https origin — a missing scheme makes
 * NextResponse.redirect treat the Location as relative, and Salesforce
 * OAuth errors without Content-Type then download as a file named "authorize".
 */
export function getSalesforceLoginUrl() {
  let raw =
    process.env.SALESFORCE_LOGIN_URL?.trim() || "https://login.salesforce.com";
  raw = raw.replace(/\/$/, "");
  if (!/^https?:\/\//i.test(raw)) {
    raw = `https://${raw}`;
  }
  const url = new URL(raw);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`Invalid SALESFORCE_LOGIN_URL: ${raw}`);
  }
  // Origin only — never keep a path that would double up /services/oauth2/...
  return url.origin;
}

function getClientId() {
  const id = process.env.SALESFORCE_CLIENT_ID?.trim();
  if (!id) throw new Error("SALESFORCE_CLIENT_ID is not configured");
  return id;
}

function getClientSecret() {
  const secret = process.env.SALESFORCE_CLIENT_SECRET?.trim();
  if (!secret) throw new Error("SALESFORCE_CLIENT_SECRET is not configured");
  return secret;
}

function looksProductionLike(url: string) {
  try {
    const host = new URL(url).hostname;
    return host !== "localhost" && host !== "127.0.0.1";
  } catch {
    return false;
  }
}

/**
 * Redirect URI registered on the Connected App.
 * Prefer SALESFORCE_REDIRECT_URI when set (exact match required by Salesforce);
 * otherwise `{appUrl}/api/auth/salesforce/callback`.
 *
 * A mismatch makes Salesforce return a form-urlencoded error with no
 * Content-Type — browsers save that body as a file named "authorize".
 */
export function getSalesforceRedirectUri(appUrl: string) {
  const override = process.env.SALESFORCE_REDIRECT_URI?.trim();
  const candidate = override
    ? override.replace(/\/$/, "")
    : `${appUrl.replace(/\/$/, "")}/api/auth/salesforce/callback`;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error(`Invalid Salesforce redirect URI: ${candidate}`);
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(`Salesforce redirect URI must be absolute http(s): ${candidate}`);
  }
  // Production-like callbacks must be https (Connected App + browser expectations).
  if (looksProductionLike(candidate) && parsed.protocol !== "https:") {
    throw new Error(
      `Salesforce redirect URI must use https for non-local hosts: ${candidate}`,
    );
  }
  return candidate;
}

/** PKCE S256 pair for the Web Server flow (required by many Connected Apps). */
export function generateSalesforcePkce() {
  const codeVerifier = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  return { codeVerifier, codeChallenge };
}

export type SalesforceAuthStart = {
  url: string;
  codeVerifier: string;
};

/**
 * Web Server flow authorize URL — path must be /services/oauth2/authorize.
 * Always includes PKCE (code_challenge + S256).
 */
export function getSalesforceAuthUrl(
  appUrl: string,
  state: string,
  pkce?: { codeVerifier: string; codeChallenge: string },
): SalesforceAuthStart {
  const pair = pkce ?? generateSalesforcePkce();
  const authorize = new URL(
    "/services/oauth2/authorize",
    `${getSalesforceLoginUrl()}/`,
  );
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("client_id", getClientId());
  authorize.searchParams.set(
    "redirect_uri",
    getSalesforceRedirectUri(appUrl),
  );
  authorize.searchParams.set("scope", SALESFORCE_SCOPES.join(" "));
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("code_challenge", pair.codeChallenge);
  authorize.searchParams.set("code_challenge_method", "S256");

  const href = authorize.href;
  if (!href.startsWith("https://") && !href.startsWith("http://")) {
    throw new Error(`Salesforce authorize URL must be absolute: ${href}`);
  }
  return { url: href, codeVerifier: pair.codeVerifier };
}

const tokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  instance_url: z.string().url(),
  id: z.string().optional(),
  token_type: z.string().optional(),
  issued_at: z.string().optional(),
  scope: z.string().optional(),
});

export type SalesforceTokenBundle = {
  accessToken: string;
  refreshToken: string;
  instanceUrl: string;
  salesforceOrgId: string | null;
  expiresAt: Date | null;
  scopes: string;
};

/** Parse org id from identity URL: …/id/{orgId}/{userId} */
export function parseSalesforceOrgIdFromIdentityUrl(
  identityUrl: string | undefined,
): string | null {
  if (!identityUrl) return null;
  try {
    const path = new URL(identityUrl).pathname;
    const parts = path.split("/").filter(Boolean);
    // ["id", orgId, userId]
    const idIdx = parts.indexOf("id");
    if (idIdx >= 0 && parts[idIdx + 1]) return parts[idIdx + 1] ?? null;
  } catch {
    return null;
  }
  return null;
}

export async function exchangeSalesforceCode(
  code: string,
  appUrl: string,
  codeVerifier: string,
): Promise<SalesforceTokenBundle> {
  if (!codeVerifier.trim()) {
    throw new Error(
      "Salesforce PKCE code_verifier is required for token exchange",
    );
  }
  const login = getSalesforceLoginUrl();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: getClientId(),
    client_secret: getClientSecret(),
    redirect_uri: getSalesforceRedirectUri(appUrl),
    code,
    code_verifier: codeVerifier,
  });

  const res = await fetch(`${login}/services/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Salesforce token exchange failed: ${res.status} ${text}`);
  }

  const data = tokenResponseSchema.parse(await res.json());
  if (!data.refresh_token) {
    throw new Error(
      "Salesforce did not return a refresh_token. Enable refresh tokens on the Connected App and request the refresh_token and offline_access scopes.",
    );
  }

  let salesforceOrgId = parseSalesforceOrgIdFromIdentityUrl(data.id);
  if (!salesforceOrgId) {
    salesforceOrgId = await fetchSalesforceOrgId(
      data.instance_url,
      data.access_token,
    );
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    instanceUrl: data.instance_url.replace(/\/$/, ""),
    salesforceOrgId,
    // Salesforce access tokens do not always include expires_in; refresh proactively when needed.
    expiresAt: null,
    scopes: data.scope ?? SALESFORCE_SCOPES.join(" "),
  };
}

export async function refreshSalesforceToken(
  refreshToken: string,
): Promise<{
  accessToken: string;
  refreshToken?: string;
  instanceUrl?: string;
  expiresAt: Date | null;
}> {
  const login = getSalesforceLoginUrl();
  const res = await fetch(`${login}/services/oauth2/token`, {
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
    throw new Error(`Salesforce token refresh failed: ${res.status} ${text}`);
  }

  const data = tokenResponseSchema.parse(await res.json());
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    instanceUrl: data.instance_url?.replace(/\/$/, ""),
    expiresAt: null,
  };
}

const identitySchema = z.object({
  organization_id: z.string().optional(),
  user_id: z.string().optional(),
});

/** Fetch org id via identity / userinfo endpoint when not in token response. */
export async function fetchSalesforceOrgId(
  instanceUrl: string,
  accessToken: string,
): Promise<string | null> {
  const base = instanceUrl.replace(/\/$/, "");
  const res = await fetch(`${base}/services/oauth2/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = identitySchema.safeParse(await res.json());
  return data.success ? (data.data.organization_id ?? null) : null;
}

export type SalesforceConnectionRecord = {
  id: string;
  instanceUrl: string;
  accessTokenEnc: string;
  refreshTokenEnc: string;
  expiresAt: Date | null;
};

/**
 * Decrypt a stored access token. Refreshes when expiresAt is set and near expiry,
 * or when forceRefresh is requested after a 401.
 */
export async function getValidSalesforceAccessToken(
  connection: SalesforceConnectionRecord,
  options?: { forceRefresh?: boolean },
): Promise<{ accessToken: string; instanceUrl: string }> {
  const nearExpiry =
    connection.expiresAt &&
    connection.expiresAt <= new Date(Date.now() + 60_000);

  if (!options?.forceRefresh && !nearExpiry) {
    return {
      accessToken: decryptSecret(connection.accessTokenEnc),
      instanceUrl: connection.instanceUrl,
    };
  }

  const refreshToken = decryptSecret(connection.refreshTokenEnc);
  const refreshed = await refreshSalesforceToken(refreshToken);

  const instanceUrl = refreshed.instanceUrl ?? connection.instanceUrl;
  await prisma.salesforceConnection.update({
    where: { id: connection.id },
    data: {
      accessTokenEnc: encryptSecret(refreshed.accessToken),
      ...(refreshed.refreshToken
        ? { refreshTokenEnc: encryptSecret(refreshed.refreshToken) }
        : {}),
      instanceUrl,
      expiresAt: refreshed.expiresAt,
    },
  });

  return { accessToken: refreshed.accessToken, instanceUrl };
}

export function salesforceApiBase(instanceUrl: string) {
  return `${instanceUrl.replace(/\/$/, "")}/services/data/${API_VERSION}`;
}

/** Best-effort revoke of the Salesforce token on disconnect. */
export async function revokeSalesforceToken(token: string) {
  try {
    const login = getSalesforceLoginUrl();
    await fetch(`${login}/services/oauth2/revoke`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token }),
    });
  } catch {
    // Ignore revoke failures — local disconnect still proceeds.
  }
}
