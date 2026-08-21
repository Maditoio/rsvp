import { describe, expect, it } from "vitest";
import {
  ONLINE_MEETING_PROVIDERS,
  isActiveOnlineMeetingProvider,
} from "./providers";

describe("online meeting providers", () => {
  it("lists Teams as active and Zoom as coming soon", () => {
    expect(ONLINE_MEETING_PROVIDERS).toEqual([
      expect.objectContaining({
        id: "TEAMS",
        status: "active",
      }),
      expect.objectContaining({
        id: "ZOOM",
        status: "coming_soon",
        description: "Coming soon",
      }),
    ]);
  });

  it("only allows Teams as a selectable provider", () => {
    expect(isActiveOnlineMeetingProvider("TEAMS")).toBe(true);
    expect(isActiveOnlineMeetingProvider("ZOOM")).toBe(false);
    expect(isActiveOnlineMeetingProvider("other")).toBe(false);
  });
});
