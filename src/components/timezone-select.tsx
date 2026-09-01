"use client";

import { useMemo } from "react";
import {
  detectBrowserTimezone,
  groupTimezoneOptions,
  listIanaTimezones,
} from "@/lib/timezone-options";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  className?: string;
  label?: string;
  hint?: string;
};

export function TimezoneSelect({
  id = "timezone",
  name = "timezone",
  value,
  defaultValue,
  onChange,
  required,
  className,
  label = "Timezone",
  hint = "Agenda times, event dates, and imports use this timezone.",
}: Props) {
  const groups = useMemo(() => groupTimezoneOptions(listIanaTimezones()), []);
  const resolvedDefault = defaultValue || detectBrowserTimezone();

  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        name={name}
        required={required}
        value={value}
        defaultValue={value === undefined ? resolvedDefault : undefined}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        className={cn(
          "mt-1.5 w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900",
          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30",
        )}
      >
        {groups.map((group) => (
          <optgroup key={group.region} label={group.region}>
            {group.zones.map((zone) => (
              <option key={zone.value} value={zone.value}>
                {zone.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}
