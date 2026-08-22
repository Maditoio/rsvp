import {
  Accessibility,
  Dog,
  Ear,
  Eye,
  HandHelping,
  type LucideIcon,
  PersonStanding,
  UtensilsCrossed,
} from "lucide-react";

export type AccessibilityOption = {
  value: string;
  label: string;
  Icon: LucideIcon;
};

export const ACCESSIBILITY_OPTIONS: AccessibilityOption[] = [
  { value: "wheelchair", label: "Wheelchair access", Icon: Accessibility },
  { value: "step_free", label: "Step-free route", Icon: PersonStanding },
  { value: "hearing_loop", label: "Hearing loop", Icon: Ear },
  { value: "sign_language", label: "Sign language support", Icon: HandHelping },
  { value: "large_print", label: "Large-print materials", Icon: Eye },
  { value: "guide_dog", label: "Guide dog accommodation", Icon: Dog },
  { value: "dietary_support", label: "Dietary support at meals", Icon: UtensilsCrossed },
];

const allowed = new Set(ACCESSIBILITY_OPTIONS.map((option) => option.value));

export function parseAccessibilityValues(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === "string" && allowed.has(item));
}

export function accessibilityLabels(values: string[]): string[] {
  const byValue = new Map(ACCESSIBILITY_OPTIONS.map((option) => [option.value, option.label]));
  return values.map((value) => byValue.get(value) ?? value);
}
