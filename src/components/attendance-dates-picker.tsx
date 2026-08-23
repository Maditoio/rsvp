"use client";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
        <p className="text-body text-slate-500">
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
      <p className="text-body text-slate-500">
        Select every event date you plan to attend.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-body shadow-xs transition-colors",
              "border-slate-200 bg-white hover:border-slate-300",
              "has-[:checked]:border-indigo-600 has-[:checked]:bg-indigo-50",
            )}
          >
            <Checkbox
              name={name}
              value={option.value}
              defaultChecked={defaultSelected.includes(option.value)}
              required={required && defaultSelected.length === 0}
            />
            <span className="font-medium text-slate-900">{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
