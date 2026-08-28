"use client";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import {
  getSectionVariantOptions,
  type EventSiteSectionType,
} from "@/modules/event-sites/sections";

type Props = {
  sectionType: EventSiteSectionType;
  value: string;
  onChange: (variant: string) => void;
};

export function LayoutVariantPicker({ sectionType, value, onChange }: Props) {
  const options = getSectionVariantOptions(sectionType);
  if (options.length <= 1) return null;

  return (
    <div>
      <Label>Layout variant</Label>
      <div className="mt-2 grid gap-2" role="radiogroup" aria-label="Layout variant">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.value)}
              className={cn(
                "rounded-lg border px-3 py-2.5 text-left transition",
                selected
                  ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-200"
                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
              )}
            >
              <span className="block text-sm font-semibold text-slate-900">
                {option.label}
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                {option.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
