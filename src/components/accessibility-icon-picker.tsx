"use client";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import {
  ACCESSIBILITY_OPTIONS,
  type AccessibilityOption,
} from "@/modules/registrations/accessibility";

export function AccessibilityIconPicker({
  name,
  defaultSelected = [],
}: {
  name: string;
  defaultSelected?: string[];
}) {
  return (
    <div className="space-y-3">
      <Label>Accessibility needs</Label>
      <p className="text-sm text-stone-500">
        Select any support you need on site. Choose icons only — no free-text entry.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {ACCESSIBILITY_OPTIONS.map((option) => (
          <AccessibilityTile
            key={option.value}
            option={option}
            name={name}
            defaultChecked={defaultSelected.includes(option.value)}
          />
        ))}
      </div>
    </div>
  );
}

function AccessibilityTile({
  option,
  name,
  defaultChecked,
}: {
  option: AccessibilityOption;
  name: string;
  defaultChecked: boolean;
}) {
  const Icon = option.Icon;
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-sm border px-4 py-3 transition-colors has-[:checked]:border-ink-700 has-[:checked]:bg-stone-50",
        "border-stone-200 bg-stone-0 hover:border-stone-300",
      )}
    >
      <input
        type="checkbox"
        name={name}
        value={option.value}
        defaultChecked={defaultChecked}
        className="mt-1 size-4 accent-ink-700"
      />
      <span className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-sm bg-stone-100 text-ink-700">
          <Icon className="size-4" strokeWidth={1.75} aria-hidden />
        </span>
        <span className="text-sm text-ink-800">{option.label}</span>
      </span>
    </label>
  );
}
