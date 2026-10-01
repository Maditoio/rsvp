import { describe, expect, it } from "vitest";
import {
  fallbackGenerateDescription,
  fallbackImproveDescription,
} from "./description-ai";

describe("event description AI fallbacks", () => {
  it("builds a readable draft from short notes", () => {
    const description = fallbackGenerateDescription(
      "Focus on waterways tourism investment and coastal operators.",
      {
        name: "Coastal Investment Summit",
        venue: "Cape Town ICC",
        startsAt: "12 Nov 2026",
        endsAt: "13 Nov 2026",
      },
    );

    expect(description).toContain("Coastal Investment Summit");
    expect(description).toContain("waterways tourism");
    expect(description).toContain("Cape Town ICC");
    expect(description.length).toBeGreaterThan(40);
    expect(description.length).toBeLessThanOrEqual(4000);
  });

  it("improves notes without inventing markdown", () => {
    const description = fallbackImproveDescription(
      "Industry leaders meet to discuss ports",
      { name: "Ports Forum", venue: "Durban" },
    );

    expect(description).toContain("ports");
    expect(description).toContain("Ports Forum");
    expect(description).not.toMatch(/^#/m);
  });
});
