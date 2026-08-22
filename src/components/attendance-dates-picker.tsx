"use client";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import type { EventDayOption } from "@/lib/event-dates";

export function AttendanceDatesPicker({
  name,
  options,
  required = false,
  defaultSelected = [],
}: {
  name: string;
  options: EventDayOption[];
  required?: boolean;
  defaultSelected?: string[];
}) {
  if (options.length === 0) {
    return (
      <div className="space-y-2">
        <Label>Attendance dates</Label>
        <p className="text-sm text-stone-500">
          Event dates have not been published yet. The organiser will confirm your
          attendance separately.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label>
        Which day(s) will you attend?
        {required ? " *" : ""}
      </Label>
      <p className="text-sm text-stone-500">
        Select every event date you plan to attend.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-sm border px-4 py-3 text-sm transition-colors has-[:checked]:border-ink-700 has-[:checked]:bg-stone-50",
              "border-stone-200 bg-stone-0 hover:border-stone-300",
            )}
          >
            <input
              type="checkbox"
              name={name}
              value={option.value}
              defaultChecked={defaultSelected.includes(option.value)}
              required={required && defaultSelected.length === 0}
              className="size-4 accent-ink-700"
            />
            <span className="text-ink-800">{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
