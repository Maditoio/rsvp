import { describe, expect, it } from "vitest";
import { mapHubSpotContact } from "./contacts";

describe("mapHubSpotContact", () => {
  it("maps HubSpot properties to contact row fields", () => {
    expect(
      mapHubSpotContact({
        id: "51",
        properties: {
          firstname: "Ada",
          lastname: "Lovelace",
          email: "Ada@Example.com",
          company: "Analytical Engines",
          jobtitle: "Mathematician",
        },
      }),
    ).toEqual({
      id: "51",
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      company: "Analytical Engines",
      jobTitle: "Mathematician",
    });
  });

  it("trims blanks and lowercases email", () => {
    expect(
      mapHubSpotContact({
        id: "9",
        properties: {
          firstname: "  ",
          lastname: null,
          email: "  Person@Org.IO ",
          company: undefined,
          jobtitle: "  Lead  ",
        },
      }),
    ).toEqual({
      id: "9",
      firstName: "",
      lastName: "",
      email: "person@org.io",
      company: "",
      jobTitle: "Lead",
    });
  });
});
