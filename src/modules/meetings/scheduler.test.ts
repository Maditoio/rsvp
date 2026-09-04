import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    event: { findUnique: vi.fn() },
    meeting: { findMany: vi.fn() },
    sessionRegistration: { findMany: vi.fn() },
    meetingRoom: { findMany: vi.fn(), count: vi.fn() },
  },
}));

vi.mock("@/modules/calendar/conflicts", () => ({
  loadGoogleBusyByAttendee: vi.fn(async () => new Map()),
  slotFreeOnGoogleCalendars: vi.fn(() => true),
}));

import { prisma } from "@/lib/db/prisma";
import { findAvailableSlots, pickFirstAvailableSlot } from "./scheduler";

describe("findAvailableSlots", () => {
  const eventId = "evt-1";
  const attendeeA = "att-a";
  const attendeeB = "att-b";
  const orgId = "org-1";

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(prisma.event.findUnique).mockResolvedValue({
      id: eventId,
      organisationId: orgId,
      timezone: "UTC",
      startsAt: new Date("2026-09-03T00:00:00.000Z"),
      endsAt: new Date("2026-09-05T23:59:59.000Z"),
      settings: {
        meetingDurationMinutes: 15,
        eventStartTime: "09:00",
        eventEndTime: "18:00",
      },
    } as never);

    vi.mocked(prisma.meeting.findMany).mockResolvedValue([]);
    vi.mocked(prisma.sessionRegistration.findMany).mockResolvedValue([]);
    vi.mocked(prisma.meetingRoom.findMany).mockResolvedValue([
      { id: "room-1", name: "Room A" },
    ] as never);
    vi.mocked(prisma.meetingRoom.count).mockResolvedValue(1);
  });

  it("skips slots that have already started and returns the first future slot", async () => {
    const now = new Date("2026-09-04T10:00:00.000Z");
    const slots = await findAvailableSlots(eventId, attendeeA, attendeeB, { now });

    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0].startsAt.getTime()).toBeGreaterThanOrEqual(now.getTime());
    expect(slots[0].startsAt.toISOString()).toBe("2026-09-04T10:00:00.000Z");
    expect(slots.every((s) => s.startsAt.getTime() >= now.getTime())).toBe(true);
  });

  it("returns no slots when the entire event window is already past", async () => {
    const now = new Date("2026-09-06T12:00:00.000Z");
    const slots = await findAvailableSlots(eventId, attendeeA, attendeeB, { now });
    expect(slots).toEqual([]);
  });

  it("pickFirstAvailableSlot prefers a future day over day-one past hours", async () => {
    const now = new Date("2026-09-04T08:00:00.000Z");
    const slot = await pickFirstAvailableSlot(eventId, attendeeA, attendeeB, { now });
    expect(slot.startsAt.toISOString()).toBe("2026-09-04T09:00:00.000Z");
  });
});
