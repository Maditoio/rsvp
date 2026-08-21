import { randomBytes } from "crypto";
import { prisma } from "@/lib/db/prisma";
import { decryptSecret, encryptSecret } from "@/lib/crypto/secret";

const STATE_TTL_MS = 15 * 60 * 1000;

/**
 * Salesforce OAuth `state` = `{nonce}~{encryptedPkceVerifier}`.
 * PKCE verifier stays off the authorize querystring (only challenge is public)
 * but rides back on the callback `state` so token exchange works even when
 * start and callback hit different app hosts that share the encryption key
 * (e.g. local start + prod redirect_uri). Nonce alone is stored in OAuthState.
 */
export function packSalesforceOAuthState(nonce: string, codeVerifier: string) {
  return `${nonce}~${encryptSecret(codeVerifier)}`;
}

export function unpackSalesforceOAuthState(stateParam: string): {
  nonce: string;
  codeVerifier: string;
} {
  const sep = stateParam.indexOf("~");
  if (sep <= 0 || sep === stateParam.length - 1) {
    throw new Error("invalid_oauth_state");
  }
  const nonce = stateParam.slice(0, sep);
  const encrypted = stateParam.slice(sep + 1);
  try {
    return { nonce, codeVerifier: decryptSecret(encrypted) };
  } catch {
    throw new Error("invalid_oauth_state");
  }
}

/**
 * Create a single-use Salesforce OAuth nonce. Returns the packed `state`
 * value to send to Salesforce (nonce + encrypted PKCE verifier).
 */
export async function createOAuthState(input: {
  provider: "salesforce";
  userId: string;
  organisationId: string;
  codeVerifier: string;
}) {
  const nonce = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + STATE_TTL_MS);

  await prisma.oAuthState.create({
    data: {
      nonce,
      provider: input.provider,
      userId: input.userId,
      organisationId: input.organisationId,
      expiresAt,
    },
  });

  return packSalesforceOAuthState(nonce, input.codeVerifier);
}

/**
 * Validate and consume a single-use Salesforce OAuth state.
 * Accepts the full packed state param from the callback.
 */
export async function consumeOAuthState(input: {
  provider: "salesforce";
  nonce: string;
  userId: string;
}): Promise<{ organisationId: string; codeVerifier: string }> {
  const { nonce, codeVerifier } = unpackSalesforceOAuthState(input.nonce);

  const state = await prisma.oAuthState.findUnique({
    where: { nonce },
  });

  if (!state) {
    throw new Error("invalid_oauth_state");
  }
  if (state.provider !== input.provider) {
    throw new Error("invalid_oauth_state");
  }
  if (state.userId !== input.userId) {
    throw new Error("invalid_oauth_state");
  }
  if (state.usedAt) {
    throw new Error("oauth_state_reused");
  }
  if (state.expiresAt.getTime() <= Date.now()) {
    await prisma.oAuthState.delete({ where: { id: state.id } }).catch(() => undefined);
    throw new Error("oauth_state_expired");
  }

  const consumed = await prisma.oAuthState.updateMany({
    where: { id: state.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (consumed.count !== 1) {
    throw new Error("oauth_state_reused");
  }
  await prisma.oAuthState.delete({ where: { id: state.id } }).catch(() => undefined);

  return {
    organisationId: state.organisationId,
    codeVerifier,
  };
}

/** Best-effort cleanup of expired rows (optional housekeeping). */
export async function purgeExpiredOAuthStates() {
  await prisma.oAuthState.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
}
