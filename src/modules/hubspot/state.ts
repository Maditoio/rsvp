import { randomBytes } from "crypto";
import { prisma } from "@/lib/db/prisma";

const STATE_TTL_MS = 15 * 60 * 1000;

export async function createOAuthState(input: {
  provider: string;
  userId: string;
  organisationId: string;
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

  return nonce;
}

/**
 * Validate and consume a single-use OAuth state nonce.
 * Returns the bound organisationId on success; throws on failure.
 */
export async function consumeOAuthState(input: {
  provider: string;
  nonce: string;
  userId: string;
}): Promise<{ organisationId: string }> {
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

  // Single-use: mark used then delete so the nonce cannot be replayed.
  const consumed = await prisma.oAuthState.updateMany({
    where: { id: state.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (consumed.count !== 1) {
    throw new Error("oauth_state_reused");
  }
  await prisma.oAuthState.delete({ where: { id: state.id } }).catch(() => undefined);

  return { organisationId: state.organisationId };
}

/** Best-effort cleanup of expired rows (optional housekeeping). */
export async function purgeExpiredOAuthStates() {
  await prisma.oAuthState.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
}
