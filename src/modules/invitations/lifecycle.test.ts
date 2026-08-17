import { describe, expect, it } from "vitest";
import { canTransition, invitationUsable } from "./lifecycle";

describe("invitation lifecycle", () => {
  it("does not treat cancelled or expired invitations as usable", () => {
    expect(invitationUsable("CANCELLED", null)).toBe(false);
    expect(invitationUsable("EXPIRED", null)).toBe(false);
    expect(
      invitationUsable("SENT", new Date(Date.now() - 60_000)),
    ).toBe(false);
    expect(invitationUsable("OPENED", new Date(Date.now() + 60_000))).toBe(
      true,
    );
  });

  it("allows accept and decline from delivered/opened, not from cancelled or expired", () => {
    expect(canTransition("DELIVERED", "ACCEPTED")).toBe(true);
    expect(canTransition("OPENED", "ACCEPTED")).toBe(true);
    expect(canTransition("DELIVERED", "DECLINED")).toBe(true);
    expect(canTransition("OPENED", "DECLINED")).toBe(true);

    expect(canTransition("CANCELLED", "ACCEPTED")).toBe(false);
    expect(canTransition("CANCELLED", "DECLINED")).toBe(false);
    expect(canTransition("EXPIRED", "ACCEPTED")).toBe(false);
    expect(canTransition("EXPIRED", "DECLINED")).toBe(false);
    expect(canTransition("DECLINED", "ACCEPTED")).toBe(false);
  });
});
