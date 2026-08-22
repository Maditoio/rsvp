import { describe, expect, it } from "vitest";
import {
  guessSessionColumnMap,
  parseSessionDatetime,
  previewSessionImport,
  sessionTemplateCsv,
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
    ]);
    expect(map.Title).toBe("title");
    expect(map["Start datetime"]).toBe("startsAt");
    expect(map["Speaker names"]).toBe("speakers");
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

  it("previews valid rows and reports issues", () => {
    const preview = previewSessionImport([
      {
        Title: "Keynote",
        Description: "Welcome",
        "Start datetime": "2026-11-14 09:00",
        "End datetime": "2026-11-14 10:00",
        Location: "Hall A",
        Track: "Main",
        "Speaker names": "Ada Lovelace",
        Format: "Hybrid",
      },
      {
        Title: "",
        "Start datetime": "2026-11-14 11:00",
        "End datetime": "2026-11-14 12:00",
      },
    ]);

    expect(preview.valid).toHaveLength(1);
    expect(preview.valid[0]?.title).toBe("Keynote");
    expect(preview.valid[0]?.location).toBe("Hall A · Main");
    expect(preview.valid[0]?.description).toContain("Speakers: Ada Lovelace");
    expect(preview.valid[0]?.format).toBe("HYBRID");
    expect(preview.issues.some((i) => i.reason === "missing_title")).toBe(true);
  });

  it("exports a template CSV with headers", () => {
    const csv = sessionTemplateCsv();
    expect(csv).toContain("Title,Description,Start datetime");
    expect(csv).toContain("Opening keynote");
  });
});
