import { createHash, randomBytes, timingSafeEqual } from "crypto";

export function generateOpaqueToken(bytes = 32) {
  const raw = randomBytes(bytes).toString("base64url");
  return { raw, hash: hashToken(raw) };
}

export function hashToken(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

export function tokensMatch(raw: string, storedHash: string) {
  const computed = Buffer.from(hashToken(raw), "hex");
  const stored = Buffer.from(storedHash, "hex");
  if (computed.length !== stored.length) return false;
  return timingSafeEqual(computed, stored);
}
