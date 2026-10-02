import { describe, expect, it } from "vitest";
import {
  defaultFieldVisibility,
  peerDisplayName,
  redactAttendeeForViewer,
  resolveFieldVisibility,
  type AttendeeForRedaction,
  type FieldVisibility,
} from "./visibility";

const fullAttendee: AttendeeForRedaction = {
  firstName: "Ada",
  lastName: "Lovelace",
  company: "Analytical Engines",
  jobTitle: "Mathematician",
  country: "UK",
  email: "ada@example.com",
  phone: "+44 7700 900123",
  profile: {
    about: "Pioneer of computing",
    lookingFor: "Partners",
    offering: "Algorithms",
    interests: ["math", "poetry"],
    industry: "Technology",
    website: "https://ada.example",
    photoUrl: "https://cdn.example/ada.jpg",
    linkedinUrl: "https://linkedin.com/in/ada",
  },
};

function privacyWith(
  visibility: Partial<FieldVisibility>,
  extras?: { profileVisible?: boolean; showEmail?: boolean; showPhone?: boolean },
) {
  return {
    profileVisible: extras?.profileVisible ?? true,
    showEmail: extras?.showEmail ?? false,
    showPhone: extras?.showPhone ?? false,
    visibility: {
      ...defaultFieldVisibility({
        profileVisible: extras?.profileVisible ?? true,
        showEmail: extras?.showEmail ?? false,
        showPhone: extras?.showPhone ?? false,
      }),
      ...visibility,
    },
  };
}

describe("resolveFieldVisibility", () => {
  it("defaults public fields on and contact fields off when profile is visible", () => {
    const flags = resolveFieldVisibility({
      profileVisible: true,
      showEmail: false,
      showPhone: false,
      visibility: null,
    });
    expect(flags.name).toBe(true);
    expect(flags.photo).toBe(true);
    expect(flags.website).toBe(true);
    expect(flags.linkedin).toBe(true);
    expect(flags.industry).toBe(true);
    expect(flags.email).toBe(false);
    expect(flags.phone).toBe(false);
  });

  it("honours legacy showEmail/showPhone when visibility JSON is absent", () => {
    const flags = resolveFieldVisibility({
      profileVisible: true,
      showEmail: true,
      showPhone: true,
      visibility: null,
    });
    expect(flags.email).toBe(true);
    expect(flags.phone).toBe(true);
  });

  it("reads field flags from visibility JSON", () => {
    const flags = resolveFieldVisibility(
      privacyWith({ company: false, email: true, about: false }),
    );
    expect(flags.company).toBe(false);
    expect(flags.email).toBe(true);
    expect(flags.about).toBe(false);
    expect(flags.name).toBe(true);
  });
});

describe("redactAttendeeForViewer", () => {
  it("returns full data for staff regardless of field flags", () => {
    const privacy = privacyWith({
      name: false,
      email: false,
      about: false,
      photo: false,
    });
    const redacted = redactAttendeeForViewer(fullAttendee, privacy, "staff");
    expect(redacted).not.toBeNull();
    expect(redacted!.firstName).toBe("Ada");
    expect(redacted!.email).toBe("ada@example.com");
    expect(redacted!.about).toBe("Pioneer of computing");
    expect(redacted!.photoUrl).toBe("https://cdn.example/ada.jpg");
    expect(redacted!.linkedinUrl).toBe("https://linkedin.com/in/ada");
    expect(redacted!.industry).toBe("Technology");
  });

  it("returns full data for self", () => {
    const privacy = privacyWith({ name: false, phone: false });
    const redacted = redactAttendeeForViewer(fullAttendee, privacy, "self");
    expect(redacted!.lastName).toBe("Lovelace");
    expect(redacted!.phone).toBe("+44 7700 900123");
  });

  it("hides opted-out fields from peer attendees", () => {
    const privacy = privacyWith({
      name: true,
      jobTitle: true,
      company: false,
      country: false,
      photo: false,
      about: true,
      interests: false,
      lookingFor: true,
      offering: false,
      website: false,
      linkedin: true,
      industry: false,
      email: false,
      phone: true,
    });

    const redacted = redactAttendeeForViewer(fullAttendee, privacy, "peer");
    expect(redacted).not.toBeNull();
    expect(redacted!.firstName).toBe("Ada");
    expect(redacted!.jobTitle).toBe("Mathematician");
    expect(redacted!.company).toBeNull();
    expect(redacted!.country).toBeNull();
    expect(redacted!.photoUrl).toBeNull();
    expect(redacted!.about).toBe("Pioneer of computing");
    expect(redacted!.interests).toEqual([]);
    expect(redacted!.lookingFor).toBe("Partners");
    expect(redacted!.offering).toBeNull();
    expect(redacted!.website).toBeNull();
    expect(redacted!.linkedinUrl).toBe("https://linkedin.com/in/ada");
    expect(redacted!.industry).toBeNull();
    expect(redacted!.email).toBeNull();
    expect(redacted!.phone).toBe("+44 7700 900123");
  });

  it("returns null for peers when profile is not listed", () => {
    const privacy = privacyWith({ name: true }, { profileVisible: false });
    expect(redactAttendeeForViewer(fullAttendee, privacy, "peer")).toBeNull();
  });

  it("can redact fields for peers even when profile is unlisted", () => {
    const privacy = privacyWith(
      { name: true, company: false },
      { profileVisible: false },
    );
    const redacted = redactAttendeeForViewer(fullAttendee, privacy, "peer", {
      requireListed: false,
    });
    expect(redacted).not.toBeNull();
    expect(redacted!.firstName).toBe("Ada");
    expect(redacted!.company).toBeNull();
  });

  it("treats missing privacy as visible with public defaults for peers", () => {
    const redacted = redactAttendeeForViewer(fullAttendee, null, "peer");
    expect(redacted).not.toBeNull();
    expect(redacted!.firstName).toBe("Ada");
    expect(redacted!.company).toBe("Analytical Engines");
    expect(redacted!.email).toBeNull();
    expect(redacted!.phone).toBeNull();
    expect(redacted!.website).toBe("https://ada.example");
  });
});

describe("peerDisplayName", () => {
  it("falls back to company then Attendee when name is hidden", () => {
    expect(
      peerDisplayName({
        firstName: null,
        lastName: null,
        company: "Acme",
        jobTitle: null,
        country: null,
        email: null,
        phone: null,
        about: null,
        lookingFor: null,
        offering: null,
        interests: [],
        industry: null,
        website: null,
        photoUrl: null,
        linkedinUrl: null,
      }),
    ).toBe("Acme");

    expect(
      peerDisplayName({
        firstName: null,
        lastName: null,
        company: null,
        jobTitle: null,
        country: null,
        email: null,
        phone: null,
        about: null,
        lookingFor: null,
        offering: null,
        interests: [],
        industry: null,
        website: null,
        photoUrl: null,
        linkedinUrl: null,
      }),
    ).toBe("Attendee");
  });
});
