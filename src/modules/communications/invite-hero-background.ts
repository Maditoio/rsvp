export type EmailHeroBackgroundMode = "IMAGE" | "COLOR" | "GRADIENT";

export type EmailHeroGradientStyle = "indigo" | "violet" | "teal";

export const EMAIL_HERO_BACKGROUND_MODES: {
  id: EmailHeroBackgroundMode;
  label: string;
}[] = [
  { id: "IMAGE", label: "Photo" },
  { id: "COLOR", label: "Colour" },
  { id: "GRADIENT", label: "Gradient" },
];

export const EMAIL_HERO_GRADIENTS: {
  id: EmailHeroGradientStyle;
  label: string;
  /** CSS linear-gradient for live preview */
  css: string;
  /** SVG stop colours for sharp render (top → bottom) */
  top: string;
  bottom: string;
}[] = [
  {
    id: "indigo",
    label: "Indigo",
    css: "linear-gradient(165deg, #6366F1 0%, #312E81 100%)",
    top: "#6366F1",
    bottom: "#312E81",
  },
  {
    id: "violet",
    label: "Violet",
    css: "linear-gradient(165deg, #8B5CF6 0%, #4F46E5 100%)",
    top: "#8B5CF6",
    bottom: "#4F46E5",
  },
  {
    id: "teal",
    label: "Teal",
    css: "linear-gradient(165deg, #14B8A6 0%, #0F766E 100%)",
    top: "#14B8A6",
    bottom: "#0F766E",
  },
];

export function parseEmailHeroBackgroundMode(
  value: unknown,
): EmailHeroBackgroundMode {
  if (value === "IMAGE" || value === "COLOR" || value === "GRADIENT") {
    return value;
  }
  return "COLOR";
}

export function parseEmailHeroGradientStyle(
  value: unknown,
): EmailHeroGradientStyle {
  if (value === "indigo" || value === "violet" || value === "teal") {
    return value;
  }
  return "indigo";
}

export function gradientPreset(id: EmailHeroGradientStyle) {
  return (
    EMAIL_HERO_GRADIENTS.find((g) => g.id === id) ?? EMAIL_HERO_GRADIENTS[0]!
  );
}
