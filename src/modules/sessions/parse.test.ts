import { describe, expect, it } from "vitest";
import {
  guessSessionColumnMap,
  parseSessionDatetime,
  previewSessionImport,
  sessionTemplateCsv,
  splitSpeakerNames,
} from "@/modules/sessions/parse";

describe("session import parse", () => {
  it("guesses template column headers", () => {
    const map = guessSessionColumnMap([
      "Title",
      "Description",
      "Start datetime",
      "End datetime",
      "Location",
      "Track",
      "Speaker names",
      "Format",
      "Registration",
    ]);
    expect(map.Title).toBe("title");
    expect(map["Start datetime"]).toBe("startsAt");
    expect(map["Speaker names"]).toBe("speakers");
    expect(map.Registration).toBe("registrationMode");
  });

  it("parses ISO and UK datetimes", () => {
    const iso = parseSessionDatetime("2026-11-14 09:00");
    expect(iso?.getFullYear()).toBe(2026);
    expect(iso?.getMonth()).toBe(10);
    expect(iso?.getDate()).toBe(14);

    const uk = parseSessionDatetime("14/11/2026 10:30");
    expect(uk?.getHours()).toBe(10);
    expect(uk?.getMinutes()).toBe(30);
  });

  it("parses datetimes in the event timezone without server offset drift", () => {
    const startsAt = parseSessionDatetime(
      "2026-09-09 08:00",
      "Africa/Johannesburg",
    );
    const endsAt = parseSessionDatetime(
      "2026-09-09 09:00",
      "Africa/Johannesburg",
    );

    expect(startsAt?.toISOString()).toBe("2026-09-09T06:00:00.000Z");
    expect(endsAt?.toISOString()).toBe("2026-09-09T07:00:00.000Z");
  });

  it("previews import rows using the event timezone", () => {
    const preview = previewSessionImport(
      [
        {
          Title: "Keynote",
          Description: "Welcome",
          "Start datetime": "2026-11-14 09:00",
          "End datetime": "2026-11-14 10:00",
          Location: "Hall A",
          Track: "Main",
          "Speaker names": "Ada Lovelace",
          Format: "Hybrid",
          Registration: "Required",
        },
      ],
      undefined,
      "Africa/Johannesburg",
    );

    expect(preview.valid[0]?.startsAt?.toISOString()).toBe(
      "2026-11-14T07:00:00.000Z",
    );
    expect(preview.valid[0]?.registrationMode).toBe("REQUIRED");
    expect(preview.valid[0]?.speakerNames).toEqual(["Ada Lovelace"]);
  });

  it("previews valid rows and reports issues", () => {
    const preview = previewSessionImport([
      {
        Title: "Keynote",
        Description: "Welcome",
        "Start datetime": "2026-11-14 09:00",
        "End datetime": "2026-11-14 10:00",
        Location: "Hall A",
        Track: "Main",
        "Speaker names": "Ada Lovelace; Grace Hopper",
        Format: "Hybrid",
        Registration: "Open",
      },
      {
        Title: "",
        "Start datetime": "2026-11-14 11:00",
        "End datetime": "2026-11-14 12:00",
      },
      {
        Title: "Workshop",
        Registration: "maybe",
      },
    ]);

    expect(preview.valid).toHaveLength(1);
    expect(preview.valid[0]?.title).toBe("Keynote");
    expect(preview.valid[0]?.location).toBe("Hall A · Main");
    expect(preview.valid[0]?.description).toBe("Welcome");
    expect(preview.valid[0]?.speakerNames).toEqual([
      "Ada Lovelace",
      "Grace Hopper",
    ]);
    expect(preview.valid[0]?.format).toBe("HYBRID");
    expect(preview.valid[0]?.registrationMode).toBe("OPEN");
    expect(preview.issues.some((i) => i.reason === "missing_title")).toBe(true);
    expect(preview.issues.some((i) => i.reason === "invalid_registration")).toBe(
      true,
    );
  });

  it("splits speaker names on common separators", () => {
    expect(splitSpeakerNames("Ada Lovelace; Grace Hopper")).toEqual([
      "Ada Lovelace",
      "Grace Hopper",
    ]);
    expect(splitSpeakerNames("Ada Lovelace | Grace Hopper")).toEqual([
      "Ada Lovelace",
      "Grace Hopper",
    ]);
  });

  it("exports a template CSV with headers", () => {
    const csv = sessionTemplateCsv();
    expect(csv).toContain("Title,Description,Start datetime");
    expect(csv).toContain("Registration");
    expect(csv).toContain("Opening keynote");
  });
});
