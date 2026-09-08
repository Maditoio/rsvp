import { describe, expect, it } from "vitest";
import { reminderEmailSubject } from "./reminder-copy";

describe("reminderEmailSubject", () => {
  it("builds invitation and registration reminder subjects", () => {
    expect(reminderEmailSubject("invitation", "Farmers Summit")).toBe(
      "Reminder: your invitation to Farmers Summit",
    );
    expect(reminderEmailSubject("registration", "Farmers Summit")).toBe(
      "Reminder: complete registration for Farmers Summit",
    );
  });

  it("builds event reminder subjects", () => {
    expect(reminderEmailSubject("event", "Farmers Summit")).toBe(
      "Farmers Summit starts soon",
    );
  });
});
