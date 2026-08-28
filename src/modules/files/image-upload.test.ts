import { describe, expect, it } from "vitest";
import {
  eventImageTooLargeMessage,
  eventImageTypeError,
  friendlyUploadFailure,
  isServerActionBodyTooLarge,
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
});
