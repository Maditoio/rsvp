import { describe, expect, it } from "vitest";
import {
  getLayoutPreset,
  moveLayoutElement,
  poseFromSnap,
  poseLeftEdge,
  snapElementPose,
} from "./layout";

describe("poseLeftEdge", () => {
  it("converts centre anchor to left edge", () => {
    expect(poseLeftEdge({ x: 50, y: 10, zIndex: 1, anchorX: "center" }, 20)).toBe(
      40,
    );
  });
});

describe("poseFromSnap", () => {
  it("stores centre anchor when snapped horizontally", () => {
    const snapped = snapElementPose(40, 45, 20, 10);
    expect(poseFromSnap(snapped, 20)).toEqual({
      x: 50,
      y: 45,
      anchorX: "center",
    });
  });

  it("keeps left anchor when not snapped", () => {
    const snapped = snapElementPose(5, 5, 10, 10);
    expect(poseFromSnap(snapped, 10)).toEqual({
      x: 5,
      y: 5,
      anchorX: "left",
    });
  });
});

describe("snapElementPose", () => {
  it("snaps element centre to badge centre", () => {
    const snapped = snapElementPose(40, 45, 20, 10);
    expect(snapped.x).toBe(40);
    expect(snapped.guides.vertical).toBe(true);
    expect(snapped.y).toBe(45);
    expect(snapped.guides.horizontal).toBe(true);
  });

  it("leaves position when far from centre", () => {
    const snapped = snapElementPose(5, 5, 10, 10);
    expect(snapped.guides.vertical).toBe(false);
    expect(snapped.guides.horizontal).toBe(false);
    expect(snapped.x).toBe(5);
  });
});

describe("moveLayoutElement", () => {
  it("clamps to 0–100", () => {
    const next = moveLayoutElement(getLayoutPreset("classic"), "qr", -5, 120);
    expect(next.qr.x).toBe(0);
    expect(next.qr.y).toBe(100);
  });
});
