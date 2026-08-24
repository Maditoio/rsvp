import { describe, expect, it } from "vitest";
import {
  detectPollTopic,
  fallbackGeneratePoll,
  isOrganiserBriefLike,
  sanitizeAttendeeDescription,
} from "./ai";

const FOOD_BRIEF =
  "For Pastorial Ministry Summit: I want to know about the food choices, dietary options, and catering quality for attendees.";

describe("detectPollTopic", () => {
  it("detects food-related briefs", () => {
    expect(detectPollTopic(FOOD_BRIEF)).toBe("food");
    expect(detectPollTopic("Feedback on lunch and snacks")).toBe("food");
  });

  it("detects session-related briefs", () => {
    expect(detectPollTopic("Day 1 keynote and workshop feedback")).toBe(
      "sessions",
    );
  });
});

describe("isOrganiserBriefLike", () => {
  it("flags concierge-style brief prefixes", () => {
    expect(
      isOrganiserBriefLike(FOOD_BRIEF, "Pastorial Ministry Summit"),
    ).toBe(true);
    expect(isOrganiserBriefLike("For Some Event: long organiser notes…")).toBe(
      true,
    );
  });

  it("allows short attendee descriptions", () => {
    expect(
      isOrganiserBriefLike(
        "Share your thoughts on meals and catering.",
        "Pastorial Ministry Summit",
      ),
    ).toBe(false);
  });
});

describe("sanitizeAttendeeDescription", () => {
  it("rejects raw organiser brief", () => {
    expect(
      sanitizeAttendeeDescription(FOOD_BRIEF, FOOD_BRIEF, "Pastorial Ministry Summit"),
    ).toBeNull();
  });

  it("keeps attendee-appropriate descriptions", () => {
    expect(
      sanitizeAttendeeDescription(
        "Tell us about your meal experience.",
        FOOD_BRIEF,
        "Pastorial Ministry Summit",
      ),
    ).toBe("Tell us about your meal experience.");
  });
});

describe("fallbackGeneratePoll", () => {
  it("creates food-focused poll without embedding the brief", () => {
    const draft = fallbackGeneratePoll(FOOD_BRIEF, 3, "Pastorial Ministry Summit");

    expect(draft.title).toBe("Meal & catering feedback");
    expect(draft.title).not.toContain("Poll:");
    expect(draft.description).not.toContain("I want to know");
    expect(draft.description).not.toContain("Pastorial Ministry Summit");
    expect(draft.questions).toHaveLength(3);
    expect(draft.questions[0]?.label).toMatch(/meal|food|catering|dietary/i);
    expect(draft.questions[0]?.label).not.toContain(FOOD_BRIEF.slice(0, 40));
    expect(draft.questions[0]?.options.map((o) => o.label)).toEqual([
      "Excellent",
      "Good",
      "Average",
      "Poor",
    ]);
  });

  it("fills five and seven food questions with substantive labels", () => {
    for (const count of [5, 7] as const) {
      const draft = fallbackGeneratePoll(
        FOOD_BRIEF,
        count,
        "Pastorial Ministry Summit",
      );

      expect(draft.questions).toHaveLength(count);
      for (const question of draft.questions) {
        expect(question.label).not.toMatch(/^Question \d+ about /);
        expect(question.label).not.toContain("Pastorial Ministry Summit");
        expect(question.label).not.toContain("I want to know");
        expect(question.label.length).toBeGreaterThan(10);
        if (question.type !== "TEXT") {
          expect(question.options.length).toBeGreaterThanOrEqual(2);
          expect(question.options.every((o) => !/^Option \d+$/.test(o.label))).toBe(
            true,
          );
        }
      }
    }
  });
});
