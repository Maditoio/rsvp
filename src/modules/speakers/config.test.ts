import { describe, expect, it } from "vitest";
import {
  legacyWebsiteSpeakerToRecord,
  speakerDisplayName,
} from "./config";

describe("speakerDisplayName", () => {
  it("joins first and last name", () => {
    expect(
      speakerDisplayName({ firstName: "Alex", lastName: "Morgan" }),
    ).toBe("Alex Morgan");
  });

  it("falls back to Speaker", () => {
    expect(speakerDisplayName({ firstName: "", lastName: "" })).toBe("Speaker");
  });
});

describe("legacyWebsiteSpeakerToRecord", () => {
  it("maps modern website speaker items", () => {
    const mapped = legacyWebsiteSpeakerToRecord(
      {
        id: "spk_1",
        firstName: "Alex",
        lastName: "Morgan",
        jobTitle: "CEO",
        organization: "Acme",
        bio: "Bio text",
        photoUrl: "https://example.com/a.jpg",
        featured: true,
        hidden: false,
        order: 2,
      },
      0,
    );
    expect(mapped).toMatchObject({
      id: "spk_1",
      firstName: "Alex",
      lastName: "Morgan",
      jobTitle: "CEO",
      organization: "Acme",
      bio: "Bio text",
      photoUrl: "https://example.com/a.jpg",
      featured: true,
      hidden: false,
      sortOrder: 2,
    });
  });

  it("maps legacy name field", () => {
    const mapped = legacyWebsiteSpeakerToRecord(
      {
        id: "legacy",
        name: "Jane Doe",
        title: "CTO",
        company: "Beta Inc",
      },
      1,
    );
    expect(mapped.firstName).toBe("Jane");
    expect(mapped.lastName).toBe("Doe");
    expect(mapped.jobTitle).toBe("CTO");
    expect(mapped.organization).toBe("Beta Inc");
    expect(mapped.sortOrder).toBe(1);
  });

  it("truncates oversized bios", () => {
    const mapped = legacyWebsiteSpeakerToRecord(
      { id: "x", firstName: "A", lastName: "B", bio: "x".repeat(5000) },
      0,
    );
    expect(mapped.bio).toHaveLength(4000);
  });
});
