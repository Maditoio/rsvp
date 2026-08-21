import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "@/lib/crypto/secret";

describe("secret encryption (HubSpot token storage)", () => {
  it("round-trips plaintext through AES-256-GCM", () => {
    const plain = "hubspot-access-token-example";
    const enc = encryptSecret(plain);
    expect(enc).not.toBe(plain);
    expect(enc.split(".")).toHaveLength(3);
    expect(decryptSecret(enc)).toBe(plain);
  });

  it("produces distinct ciphertexts for the same plaintext", () => {
    const plain = "same-refresh-token";
    expect(encryptSecret(plain)).not.toBe(encryptSecret(plain));
  });
});
