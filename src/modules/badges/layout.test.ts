import { describe, expect, it } from "vitest";
import {
  getLayoutPreset,
  moveLayoutElement,
  nearestSnapTarget,
  poseFromSnap,
  poseLeftEdge,
  snapElementPose,
  SNAP_CENTER_PCT,
  SNAP_HORIZONTAL_TARGETS,
  SNAP_VERTICAL_TARGETS,
} from "./layout";

describe("poseLeftEdge", () => {
  it("converts centre anchor to left edge", () => {
    expect(poseLeftEdge({ x: 50, y: 10, zIndex: 1, anchorX: "center" }, 20)).toBe(
      40,
    );
  });
});

describe("nearestSnapTarget", () => {
  it("returns the nearest vertical guide within threshold", () => {
    expect(nearestSnapTarget(24, SNAP_VERTICAL_TARGETS)).toBe(25);
    expect(nearestSnapTarget(8.5, SNAP_VERTICAL_TARGETS)).toBe(8);
    expect(nearestSnapTarget(91.5, SNAP_VERTICAL_TARGETS)).toBe(92);
  });

  it("prefers centre within its stronger threshold", () => {
    expect(nearestSnapTarget(49, SNAP_VERTICAL_TARGETS)).toBe(50);
    expect(nearestSnapTarget(47.5, SNAP_VERTICAL_TARGETS)).toBe(50);
  });

  it("returns null when far from every guide", () => {
    expect(nearestSnapTarget(15, SNAP_VERTICAL_TARGETS)).toBeNull();
  });
});

describe("poseFromSnap", () => {
  it("stores centre anchor when snapped to the centre guide", () => {
    const snapped = snapElementPose(40, 45, 20, 10);
    expect(poseFromSnap(snapped, 20)).toEqual({
      x: 50,
      y: 45,
      anchorX: "center",
    });
  });

  it("keeps left anchor when snapped to a non-centre guide", () => {
    // Element centre at 25 → left edge at 15 for width 20
    const snapped = snapElementPose(15, 20, 20, 10);
    expect(snapped.guides.vertical).toBe(25);
    expect(poseFromSnap(snapped, 20)).toEqual({
      x: 15,
      y: snapped.y,
      anchorX: "left",
    });
  });

  it("keeps left anchor when not snapped", () => {
    const snapped = snapElementPose(10, 15, 10, 10);
    expect(snapped.guides.vertical).toBeNull();
    expect(poseFromSnap(snapped, 10)).toEqual({
      x: 10,
      y: 15,
      anchorX: "left",
    });
  });
});

describe("snapElementPose", () => {
  it("snaps element centre to badge centre", () => {
    const snapped = snapElementPose(40, 45, 20, 10);
    expect(snapped.x).toBe(40);
    expect(snapped.guides.vertical).toBe(SNAP_CENTER_PCT);
    expect(snapped.y).toBe(45);
    expect(snapped.guides.horizontal).toBe(SNAP_CENTER_PCT);
  });

  it("snaps to quarter and margin guides", () => {
    const quarter = snapElementPose(65, 18, 20, 10);
    expect(quarter.guides.vertical).toBe(75);
    expect(quarter.x).toBe(65);

    const margin = snapElementPose(0, 3, 16, 10);
    expect(margin.guides.vertical).toBe(8);
    expect(margin.guides.horizontal).toBe(8);
  });

  it("leaves position when far from every guide", () => {
    // Element centre at 15% — between margin (8) and quarter (25)
    const snapped = snapElementPose(10, 15, 10, 10);
    expect(snapped.guides.vertical).toBeNull();
    expect(snapped.guides.horizontal).toBeNull();
    expect(snapped.x).toBe(10);
    expect(snapped.y).toBe(15);
  });

  it("exposes the configured guide sets", () => {
    expect(SNAP_VERTICAL_TARGETS).toContain(50);
    expect(SNAP_HORIZONTAL_TARGETS).toContain(88);
  });
});

describe("moveLayoutElement", () => {
  it("clamps to 0–100", () => {
    const next = moveLayoutElement(getLayoutPreset("classic"), "qr", -5, 120);
    expect(next.qr.x).toBe(0);
    expect(next.qr.y).toBe(100);
  });
});
