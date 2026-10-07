import { describe, expect, it } from "vitest";
import { renderInviteHeroPng } from "./invite-hero-render";
import { heroTextPath } from "./invite-hero-fonts";

describe("renderInviteHeroPng", () => {
  it("renders a PNG with brand colour when no background is set", async () => {
    const { png, usedBackgroundPhoto } = await renderInviteHeroPng({
      accentColor: "#4F46E5",
      eyebrow: "You are invited to",
      title: "Summit 2026",
      detailLines: ["12-14 May 2026", "London"],
      closing: "We look forward to welcoming you",
    });
    expect(usedBackgroundPhoto).toBe(false);
    expect(
      png
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    ).toBe(true);
    // Path-based text makes the PNG larger than a flat colour field.
    expect(png.byteLength).toBeGreaterThan(20_000);
  });

  it("builds SVG paths for hero copy", () => {
    const path = heroTextPath({
      text: "Summit 2026",
      x: 560,
      y: 400,
      fontSize: 54,
      style: "bold",
    });
    expect(path.startsWith("<path d=")).toBe(true);
    expect(path.length).toBeGreaterThan(80);
    expect(path.includes("fill=\"#FFFFFF\"")).toBe(true);
  });
});
