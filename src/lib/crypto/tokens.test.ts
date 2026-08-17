import { describe, expect, it } from "vitest";
import { generateOpaqueToken, hashToken, tokensMatch } from "./tokens";

describe("opaque tokens", () => {
  it("generates a raw token, hashes it, and matches only that raw value", () => {
    const { raw, hash } = generateOpaqueToken();
    expect(hash).toBe(hashToken(raw));
    expect(tokensMatch(raw, hash)).toBe(true);
    expect(tokensMatch(`${raw}x`, hash)).toBe(false);
    expect(tokensMatch("", hash)).toBe(false);
  });

  it("does not produce guessable sequential tokens", () => {
    const tokens = Array.from({ length: 40 }, () => generateOpaqueToken().raw);
    expect(new Set(tokens).size).toBe(tokens.length);

    for (const token of tokens) {
      expect(token.length).toBeGreaterThanOrEqual(32);
      expect(/^\d+$/.test(token)).toBe(false);
    }

    const looksSequential = tokens.some((token, index) => {
      if (index === 0) return false;
      const previous = tokens[index - 1];
      const prevMatch = previous.match(/^(.*?)(\d+)$/);
      const nextMatch = token.match(/^(.*?)(\d+)$/);
      if (!prevMatch || !nextMatch) return false;
      return (
        prevMatch[1] === nextMatch[1] &&
        Number(nextMatch[2]) === Number(prevMatch[2]) + 1
      );
    });
    expect(looksSequential).toBe(false);
  });
});
