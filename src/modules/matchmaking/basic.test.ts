import { describe, expect, it } from "vitest";
import {
  connectionStatusFor,
  shouldExcludeFromRecommendations,
} from "./basic";

describe("directory connection status", () => {
  it("marks accepted requests as connected", () => {
    expect(
      connectionStatusFor("a", "b", [
        { requesterId: "a", targetId: "b", status: "ACCEPTED" },
      ]),
    ).toBe("connected");
  });

  it("distinguishes pending direction", () => {
    expect(
      connectionStatusFor("a", "b", [
        { requesterId: "a", targetId: "b", status: "PENDING" },
      ]),
    ).toBe("pending_sent");
    expect(
      connectionStatusFor("b", "a", [
        { requesterId: "a", targetId: "b", status: "PENDING" },
      ]),
    ).toBe("pending_received");
  });

  it("excludes active connections from recommendations only", () => {
    expect(shouldExcludeFromRecommendations("none")).toBe(false);
    expect(shouldExcludeFromRecommendations("pending_sent")).toBe(true);
    expect(shouldExcludeFromRecommendations("pending_received")).toBe(true);
    expect(shouldExcludeFromRecommendations("connected")).toBe(true);
  });

  it("does not hide third parties when two others are connected", () => {
    const requests = [
      { requesterId: "user1", targetId: "user2", status: "ACCEPTED" },
    ];
    expect(connectionStatusFor("user3", "user1", requests)).toBe("none");
    expect(connectionStatusFor("user3", "user2", requests)).toBe("none");
    expect(
      shouldExcludeFromRecommendations(
        connectionStatusFor("user3", "user1", requests),
      ),
    ).toBe(false);
  });
});
