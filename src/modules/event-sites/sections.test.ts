import { describe, expect, it } from "vitest";
import {
  createSection,
  isSectionTypeAddable,
  sectionDisplayLabel,
} from "./sections";

describe("event site content sections", () => {
  it("creates a content block with text-first defaults", () => {
    const section = createSection("content", 3);
    expect(section.type).toBe("content");
    expect(section.variant).toBe("text");
    expect(section.content).toMatchObject({
      label: "",
      title: "",
      body: "",
      imageUrl: null,
    });
  });

  it("allows unlimited content blocks but not duplicate heroes", () => {
    const hero = createSection("hero", 0);
    const contentA = createSection("content", 1);
    const contentB = createSection("content", 2);
    const sections = [hero, contentA, contentB];

    expect(isSectionTypeAddable("content", sections)).toBe(true);
    expect(isSectionTypeAddable("gallery", sections)).toBe(true);
    expect(isSectionTypeAddable("hero", sections)).toBe(false);
    expect(isSectionTypeAddable("about", sections)).toBe(true);
  });

  it("uses a custom label or title in the builder list", () => {
    const section = createSection("content", 0, {
      content: { label: "Travel info", title: "Getting here" },
    });
    expect(sectionDisplayLabel(section)).toBe("Travel info");

    const titled = createSection("content", 0, {
      content: { title: "Dress code" },
    });
    expect(sectionDisplayLabel(titled)).toBe("Dress code");
  });
});
