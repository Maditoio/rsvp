import { randomBytes } from "crypto";
import { prisma } from "@/lib/db/prisma";

const STATE_TTL_MS = 15 * 60 * 1000;

/**
 * Create a single-use Salesforce OAuth state, optionally storing a PKCE verifier.
 * Separate from HubSpot helpers so Salesforce can require PKCE without touching HubSpot.
 */
export async function createOAuthState(input: {
  provider: "salesforce";
  userId: string;
  organisationId: string;
  codeVerifier?: string;
}) {
  const nonce = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + STATE_TTL_MS);

  await prisma.oAuthState.create({
    data: {
      nonce,
      provider: input.provider,
      userId: input.userId,
      organisationId: input.organisationId,
      codeVerifier: input.codeVerifier ?? null,
      expiresAt,
    },
  });

  return nonce;
}

/**
 * Validate and consume a single-use Salesforce OAuth state nonce.
 * Returns organisationId and any stored PKCE code_verifier.
 */
export async function consumeOAuthState(input: {
  provider: "salesforce";
  nonce: string;
  userId: string;
}): Promise<{ organisationId: string; codeVerifier: string | null }> {
  const state = await prisma.oAuthState.findUnique({
    where: { nonce: input.nonce },
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
    codeVerifier: state.codeVerifier,
  };
}

/** Best-effort cleanup of expired rows (optional housekeeping). */
export async function purgeExpiredOAuthStates() {
  await prisma.oAuthState.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
}
