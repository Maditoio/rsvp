import { describe, expect, it } from "vitest";
import { classifyPreprintCandidate } from "./preprint";

describe("classifyPreprintCandidate", () => {
  it("queues people with a desk QR and no badge yet", () => {
    expect(classifyPreprintCandidate(true, null)).toBe("enqueue");
    expect(classifyPreprintCandidate(true, undefined)).toBe("enqueue");
  });

  it("skips printed badges and people without a QR", () => {
    expect(classifyPreprintCandidate(true, "PRINTED")).toBe("printed");
    expect(classifyPreprintCandidate(false, null)).toBe("no_qr");
  });

  it("treats already-queued as already queued", () => {
    expect(classifyPreprintCandidate(true, "QUEUED")).toBe("already_queued");
  });
});
