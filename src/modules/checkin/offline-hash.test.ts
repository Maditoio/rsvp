import { createHash } from "crypto";
import { describe, expect, it } from "vitest";
import { hashToken } from "@/lib/crypto/tokens";

/** Mirrors browser `hashTokenBrowser` using the same SHA-256 hex encoding. */
function hashTokenHexLikeBrowser(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

describe("offline check-in token hashing", () => {
  it("matches server hashToken for opaque QR tokens", () => {
    const samples = [
      "abc",
      "opaque-token-example",
      "x".repeat(64),
    ];
    for (const raw of samples) {
      expect(hashTokenHexLikeBrowser(raw)).toBe(hashToken(raw));
    }
  });
});
