import type { CSSProperties } from "react";

/** Decorative category pill colours — Aurora secondary accents only. */
const CATEGORY_ACCENTS: Record<string, string> = {
  vip: "bg-violet-100 text-violet-800",
  speaker: "bg-amber-100 text-amber-900",
  sponsor: "bg-teal-100 text-teal-900",
  exhibitor: "bg-rose-100 text-rose-900",
  delegate: "bg-slate-100 text-slate-700",
  staff: "bg-indigo-100 text-indigo-800",
};

export function categoryAccentClass(categoryName: string): string {
  const key = categoryName.trim().toLowerCase();
  for (const [needle, cls] of Object.entries(CATEGORY_ACCENTS)) {
    if (key.includes(needle)) return cls;
  }
  return "bg-slate-100 text-slate-700";
}

export function categoryAccentStyle(categoryName: string): CSSProperties {
  const key = categoryName.trim().toLowerCase();
  if (key.includes("vip")) return { background: "#ede9fe", color: "#5b21b6" };
  if (key.includes("speaker")) return { background: "#fef3c7", color: "#92400e" };
  if (key.includes("sponsor")) return { background: "#ccfbf1", color: "#115e59" };
  if (key.includes("exhibitor")) return { background: "#ffe4e6", color: "#9f1239" };
  if (key.includes("staff")) return { background: "#e0e7ff", color: "#3730a3" };
  return { background: "#f1f5f9", color: "#334155" };
}
