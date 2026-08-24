"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import {
  BADGE_SIZE_MAX,
  BADGE_SIZE_MIN,
} from "@/modules/badges/sizing";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function BadgeSettingsSection({
  title,
  description,
  defaultOpen = false,
  children,
}: {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span>
          <span className="block text-sm font-semibold text-slate-900">
            {title}
          </span>
          {description ? (
            <span className="mt-0.5 block text-xs text-slate-500">
              {description}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={cn(
            "mt-0.5 size-4 shrink-0 text-slate-400 transition-transform",
            open && "rotate-180",
          )}
          strokeWidth={1.75}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="space-y-4 border-t border-slate-100 px-4 py-4">
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function BadgeSizeSlider({
  id,
  label,
  value,
  onChange,
  unit = "px",
  min = BADGE_SIZE_MIN,
  max = BADGE_SIZE_MAX,
  step = 1,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <Label htmlFor={id}>{label}</Label>
        <div className="flex items-center gap-1.5">
          <Input
            id={`${id}-number`}
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => {
              const next = Number(e.target.value);
              if (!Number.isFinite(next)) return;
              onChange(Math.min(max, Math.max(min, Math.round(next))));
            }}
            className="h-8 w-16 px-2 text-center text-xs"
            aria-label={`${label} value`}
          />
          <span className="text-xs text-slate-400">{unit}</span>
        </div>
      </div>
      <Slider
        id={id}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label={label}
      />
      <div className="mt-1 flex justify-between text-[0.65rem] text-slate-400">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

export function BadgeFieldToggle({
  label,
  checked,
  onChange,
  sizeId,
  sizeLabel,
  sizeValue,
  onSizeChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  sizeId?: string;
  sizeLabel?: string;
  sizeValue?: number;
  onSizeChange?: (value: number) => void;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <Checkbox checked={checked} onChange={(e) => onChange(e.target.checked)} />
        {label}
      </label>
      {checked && sizeId && sizeLabel && sizeValue != null && onSizeChange ? (
        <div className="mt-3">
          <BadgeSizeSlider
            id={sizeId}
            label={sizeLabel}
            value={sizeValue}
            onChange={onSizeChange}
          />
        </div>
      ) : null}
    </div>
  );
}
