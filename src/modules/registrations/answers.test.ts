import { describe, expect, it } from "vitest";
import {
  answerRowsForDisplay,
  buildRegistrationPrefill,
  diffImportantFieldChanges,
  formatAnswerValue,
  hydrateAttendeeFromRegistrationData,
} from "./answers";

const contact = {
  firstName: "John",
  lastName: "Smith",
  email: "john@abc.com",
  phone: null,
  company: "ABC Mining",
  jobTitle: "CEO",
  country: "South Africa",
};

describe("buildRegistrationPrefill", () => {
  it("pre-fills from contact fields", () => {
    expect(buildRegistrationPrefill({ contact })).toEqual({
      firstName: "John",
      lastName: "Smith",
      email: "john@abc.com",
      phone: "",
      company: "ABC Mining",
      jobTitle: "CEO",
      country: "South Africa",
    });
  });

  it("overlays prior registration answers over contact defaults", () => {
    const prefill = buildRegistrationPrefill({
      contact,
      priorResponseData: {
        company: "ABC Mining Ltd",
        industry: "Mining",
        website: "https://abc.example",
        phone: "+27 11 000 0000",
      },
    });
    expect(prefill.company).toBe("ABC Mining Ltd");
    expect(prefill.industry).toBe("Mining");
    expect(prefill.website).toBe("https://abc.example");
    expect(prefill.phone).toBe("+27 11 000 0000");
    expect(prefill.firstName).toBe("John");
  });
});

describe("diffImportantFieldChanges", () => {
  it("records attendee changes against organiser pre-fill", () => {
    const prefill = buildRegistrationPrefill({ contact });
    const changes = diffImportantFieldChanges(prefill, {
      ...prefill,
      jobTitle: "Managing Director",
      industry: "Energy",
      phone: "+27 82 111 2222",
    });
    expect(changes).toEqual([
      {
        field: "phone",
        old: "",
        new: "+27 82 111 2222",
        source: "attendee",
      },
      {
        field: "jobTitle",
        old: "CEO",
        new: "Managing Director",
        source: "attendee",
      },
      {
        field: "industry",
        old: "",
        new: "Energy",
        source: "attendee",
      },
    ]);
  });

  it("returns no changes when answers match pre-fill", () => {
    const prefill = buildRegistrationPrefill({ contact });
    expect(diffImportantFieldChanges(prefill, { ...prefill })).toEqual([]);
  });
});

describe("hydrateAttendeeFromRegistrationData", () => {
  it("maps known keys onto attendee and profile columns", () => {
    const result = hydrateAttendeeFromRegistrationData({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ADA@Example.com",
      phone: "123",
      company: "Analytical Engines",
      jobTitle: "Mathematician",
      country: "UK",
      industry: "Computing",
      website: "https://ada.example",
      about: "Invented the analytical engine notes",
      dietary: "Vegetarian",
    });

    expect(result.attendee).toEqual({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      phone: "123",
      company: "Analytical Engines",
      jobTitle: "Mathematician",
      country: "UK",
    });
    expect(result.profile).toEqual({
      about: "Invented the analytical engine notes",
      industry: "Computing",
      website: "https://ada.example",
      linkedinUrl: null,
      photoUrl: null,
    });
    expect(result.hydratedFields).toEqual([
      "firstName",
      "lastName",
      "email",
      "phone",
      "company",
      "jobTitle",
      "country",
      "about",
      "industry",
      "website",
    ]);
  });

  it("maps key aliases for website, LinkedIn, bio, photo, phone, company, title", () => {
    const result = hydrateAttendeeFromRegistrationData({
      websiteUrl: "https://site.example",
      linkedin: "https://linkedin.com/in/ada",
      bio: "Pioneer",
      photo: "https://cdn.example/ada.jpg",
      mobile: "+27 82 000 1111",
      organisation: "Analytical Engines",
      title: "Mathematician",
    });

    expect(result.attendee.phone).toBe("+27 82 000 1111");
    expect(result.attendee.company).toBe("Analytical Engines");
    expect(result.attendee.jobTitle).toBe("Mathematician");
    expect(result.profile).toEqual({
      about: "Pioneer",
      industry: null,
      website: "https://site.example",
      linkedinUrl: "https://linkedin.com/in/ada",
      photoUrl: "https://cdn.example/ada.jpg",
    });
  });

  it("prefers canonical keys over aliases", () => {
    const result = hydrateAttendeeFromRegistrationData({
      website: "https://primary.example",
      websiteUrl: "https://alt.example",
      linkedinUrl: "https://linkedin.com/in/primary",
      linkedInUrl: "https://linkedin.com/in/alt",
      about: "Canonical about",
      bio: "Alias bio",
      photoUrl: "https://cdn.example/primary.jpg",
      photo: "https://cdn.example/alt.jpg",
    });

    expect(result.profile.website).toBe("https://primary.example");
    expect(result.profile.linkedinUrl).toBe("https://linkedin.com/in/primary");
    expect(result.profile.about).toBe("Canonical about");
    expect(result.profile.photoUrl).toBe("https://cdn.example/primary.jpg");
  });

  it("ignores empty answer values", () => {
    const result = hydrateAttendeeFromRegistrationData({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      phone: "  ",
      company: "",
      industry: [],
      website: "",
      about: "  ",
    });

    expect(result.attendee.phone).toBeNull();
    expect(result.attendee.company).toBeNull();
    expect(result.profile.industry).toBeNull();
    expect(result.profile.website).toBeNull();
    expect(result.profile.about).toBeNull();
    expect(result.hydratedFields).toEqual(["firstName", "lastName", "email"]);
  });

  it("does not overwrite non-empty existing attendee or profile fields", () => {
    const result = hydrateAttendeeFromRegistrationData(
      {
        firstName: "New",
        lastName: "Name",
        email: "new@example.com",
        phone: "+1 555 0000",
        company: "New Co",
        jobTitle: "New Title",
        country: "US",
        industry: "New Industry",
        website: "https://new.example",
        about: "New about",
        linkedinUrl: "https://linkedin.com/in/new",
      },
      {
        attendee: {
          firstName: "Ada",
          lastName: "Lovelace",
          email: "ada@example.com",
          phone: "123",
          company: "Analytical Engines",
          jobTitle: null,
          country: "",
        },
        profile: {
          about: "Existing bio",
          industry: null,
          website: "https://old.example",
          linkedinUrl: null,
        },
      },
    );

    expect(result.attendee).toEqual({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      phone: "123",
      company: "Analytical Engines",
      jobTitle: "New Title",
      country: "US",
    });
    expect(result.profile).toEqual({
      about: "Existing bio",
      industry: "New Industry",
      website: "https://old.example",
      linkedinUrl: "https://linkedin.com/in/new",
      photoUrl: null,
    });
    expect(result.hydratedFields).toEqual([
      "jobTitle",
      "country",
      "industry",
      "linkedinUrl",
    ]);
  });
});

describe("answer display helpers", () => {
  it("formats multi-value answers and pairs labels", () => {
    expect(formatAnswerValue(["Wheelchair", "Quiet room"])).toBe(
      "Wheelchair; Quiet room",
    );
    expect(
      answerRowsForDisplay(
        [
          { key: "company", label: "Company" },
          { key: "industry", label: "Industry" },
        ],
        { company: "ABC", industry: "" },
      ),
    ).toEqual([
      { key: "company", label: "Company", value: "ABC" },
      { key: "industry", label: "Industry", value: "—" },
    ]);
  });
});
