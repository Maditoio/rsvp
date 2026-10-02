import { describe, expect, it } from "vitest";
import {
  eventImageTooLargeMessage,
  eventImageTypeError,
  friendlyUploadFailure,
  formatFileBytes,
  isServerActionBodyTooLarge,
  sniffImageMime,
} from "@/modules/files/image-upload";

describe("image-upload helpers", () => {
  it("detects Next.js Server Action body limit errors", () => {
    expect(
      isServerActionBodyTooLarge(
        new Error(
          "Body exceeded 1 MB limit. To configure the body size limit for Server Actions, see the Next.js docs.",
        ),
      ),
    ).toBe(true);
    expect(isServerActionBodyTooLarge(new Error("network failed"))).toBe(false);
  });

  it("maps body-limit failures to a friendly message", () => {
    expect(
      friendlyUploadFailure(
        new Error("Body exceeded 1 MB limit."),
        "background",
        "fallback",
      ),
    ).toBe(eventImageTooLargeMessage("background"));
  });

  it("keeps type and size copy consistent", () => {
    expect(eventImageTypeError()).toMatch(/PNG/);
    expect(eventImageTooLargeMessage("logo")).toMatch(/2 MB/);
  });

  it("includes reported type, name, and size in type errors", () => {
    const message = eventImageTypeError({
      reportedType: "",
      fileName: "logo.png",
      sizeBytes: 58 * 1024,
    });
    expect(message).toContain('browser type "(empty)"');
    expect(message).toContain('file "logo.png"');
    expect(message).toContain("58.0 KB");
  });

  it("formats file sizes", () => {
    expect(formatFileBytes(58 * 1024)).toBe("58.0 KB");
  });

  it("sniffs PNG magic bytes when MIME is missing", async () => {
    const pngHeader = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0,
    ]);
    const blob = new Blob([pngHeader], { type: "" });
    await expect(sniffImageMime(blob)).resolves.toBe("image/png");
  });

  it("sniffs JPEG magic bytes", async () => {
    const jpegHeader = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
    const blob = new Blob([jpegHeader], { type: "application/octet-stream" });
    await expect(sniffImageMime(blob)).resolves.toBe("image/jpeg");
  });

  it("passes through real Error messages from uploads", () => {
    expect(
      friendlyUploadFailure(
        new Error(
          'This file isn\'t an accepted image type (browser type "(empty)", file "logo.png", 58.0 KB). Use PNG, JPEG, WebP, or SVG.',
        ),
        "logo",
        "fallback",
      ),
    ).toMatch(/browser type/);
  });
});
