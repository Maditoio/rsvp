import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    attendee: { findMany: vi.fn() },
    calendarConnection: { findMany: vi.fn() },
  },
}));

vi.mock("./google", () => ({
  getValidGoogleAccessToken: vi.fn(),
  fetchGoogleFreeBusy: vi.fn(),
}));

vi.mock("./microsoft", () => ({
  getValidMicrosoftAccessToken: vi.fn(),
  fetchMicrosoftFreeBusy: vi.fn(),
}));

import { prisma } from "@/lib/db/prisma";
import { checkGoogleCalendarConflicts } from "./conflicts";
import { fetchGoogleFreeBusy, getValidGoogleAccessToken } from "./google";

describe("checkGoogleCalendarConflicts", () => {
  const attendeeId = "att-1";
  const userId = "user-1";
  const startsAt = new Date("2026-08-23T10:00:00Z");
  const endsAt = new Date("2026-08-23T10:30:00Z");

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.attendee.findMany).mockResolvedValue([
      {
        id: attendeeId,
        firstName: "Freddie",
        lastName: "Mukendi",
        userId,
      },
    ] as never);
    vi.mocked(prisma.calendarConnection.findMany).mockResolvedValue([
      {
        id: "conn-1",
        userId,
        provider: "google",
        user: { email: "freddie@example.com" },
      },
    ] as never);
  });

  it("does not throw when a calendar connection read fails", async () => {
    vi.mocked(getValidGoogleAccessToken).mockRejectedValue(new Error("token expired"));

    await expect(
      checkGoogleCalendarConflicts([attendeeId], startsAt, endsAt),
    ).resolves.toBeNull();
  });

  it("returns a conflict when the calendar is readable and the slot overlaps", async () => {
    vi.mocked(getValidGoogleAccessToken).mockResolvedValue("token");
    vi.mocked(fetchGoogleFreeBusy).mockResolvedValue([
      { start: new Date("2026-08-23T10:00:00Z"), end: new Date("2026-08-23T11:00:00Z") },
    ]);

    await expect(
      checkGoogleCalendarConflicts([attendeeId], startsAt, endsAt),
    ).resolves.toMatch(/has another event in their Google Calendar/);
  });
});
