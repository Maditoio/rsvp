import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

function key() {
  const secret =
    process.env.CLERK_SECRET_KEY ||
    process.env.TOKEN_ENCRYPTION_KEY ||
    "delegate-dev-encryption-key";
  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${enc.toString("base64url")}`;
}

export function decryptSecret(payload: string) {
  const [iv, tag, enc] = payload.split(".");
  if (!iv || !tag || !enc) throw new Error("Invalid secret payload");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(enc, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
