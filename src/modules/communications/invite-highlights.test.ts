import { describe, expect, it } from "vitest";
import {
  formatInviteHighlights,
  INVITE_HIGHLIGHT_MAX_LINES,
  parseInviteHighlights,
} from "./invite-highlights";
import { ul } from "./email-layout";

describe("invite highlights", () => {
  it("parses one bullet per line and clamps length and count", () => {
    const long = "x".repeat(200);
    const lines = Array.from({ length: 12 }, (_, i) => `Point ${i + 1} ${long}`);
    const parsed = parseInviteHighlights(lines.join("\n"));
    expect(parsed).toHaveLength(INVITE_HIGHLIGHT_MAX_LINES);
    expect(parsed[0]?.length).toBe(120);
    expect(parsed[0]?.startsWith("Point 1")).toBe(true);
  });

  it("formats empty input as null", () => {
    expect(formatInviteHighlights("  \n  ")).toBeNull();
    expect(formatInviteHighlights("First insight\nSecond")).toBe(
      "First insight\nSecond",
    );
  });

  it("renders escaped HTML list items", () => {
    const html = ul(["Safe <script>", "Networking & prizes"]);
    expect(html).toContain("<ul");
    expect(html).toContain("<li");
    expect(html).toContain("Safe &lt;script&gt;");
    expect(html).toContain("Networking &amp; prizes");
    expect(html).not.toContain("<script>");
  });
});
