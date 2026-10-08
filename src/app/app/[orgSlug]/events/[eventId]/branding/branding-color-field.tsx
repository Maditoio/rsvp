"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Check, Pipette } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type ColorSwatch = { label: string; value: string };

const DEFAULT_SWATCHES: ColorSwatch[] = [
  { label: "White", value: "#FFFFFF" },
  { label: "Slate 50", value: "#F8FAFC" },
  { label: "Slate 900", value: "#0F172A" },
  { label: "Indigo", value: "#4F46E5" },
  { label: "Indigo 700", value: "#4338CA" },
  { label: "Violet", value: "#8B5CF6" },
  { label: "Teal", value: "#0D9488" },
  { label: "Rose", value: "#E11D48" },
  { label: "Amber", value: "#D97706" },
];

function normalizeHex(value: string): string | null {
  const trimmed = value.trim().toUpperCase();
  if (/^#[0-9A-F]{6}$/.test(trimmed)) return trimmed;
  if (/^#[0-9A-F]{3}$/.test(trimmed)) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`;
  }
  if (/^[0-9A-F]{6}$/.test(trimmed)) return `#${trimmed}`;
  return null;
}

export function BrandingColorField({
  label,
  value,
  onChange,
  disabled,
  swatches = DEFAULT_SWATCHES,
  hint,
  shortcuts,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  disabled?: boolean;
  swatches?: ColorSwatch[];
  hint?: string;
  /** Quick chips shown above the swatch grid */
  shortcuts?: { label: string; value: string }[];
}) {
  const id = useId();
  const [draft, setDraft] = useState(value);
  const safe = useMemo(() => normalizeHex(value) ?? "#4F46E5", [value]);

  useEffect(() => {
    setDraft(safe);
  }, [safe]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id}>{label}</Label>
        <span className="font-mono text-[11px] font-medium tracking-wide text-slate-400">
          {safe}
        </span>
      </div>

      <div className="flex items-stretch gap-3">
        <label
          className={cn(
            "relative size-14 shrink-0 cursor-pointer overflow-hidden rounded-xl shadow-sm ring-1 ring-slate-200 transition-transform duration-150",
            !disabled && "hover:-translate-y-0.5 hover:shadow-md",
            disabled && "cursor-not-allowed opacity-50",
          )}
          style={{ backgroundColor: safe }}
          title="Open colour picker"
        >
          <input
            id={id}
            type="color"
            value={safe}
            disabled={disabled}
            onChange={(e) => {
              const next = e.target.value.toUpperCase();
              setDraft(next);
              onChange(next);
            }}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label={`${label} picker`}
          />
          <span className="pointer-events-none absolute inset-0 flex items-end justify-end p-1.5">
            <span className="inline-flex size-5 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-xs">
              <Pipette className="size-3" strokeWidth={2} aria-hidden />
            </span>
          </span>
        </label>

        <div className="min-w-0 flex-1 space-y-2">
          <Input
            value={draft.startsWith("#") ? draft : value}
            disabled={disabled}
            onChange={(e) => {
              const raw = e.target.value.toUpperCase();
              setDraft(raw);
              const next = normalizeHex(raw);
              if (next) onChange(next);
            }}
            onBlur={() => {
              const next = normalizeHex(draft);
              if (next) {
                setDraft(next);
                onChange(next);
              } else {
                setDraft(safe);
              }
            }}
            className="h-10 font-mono text-xs uppercase"
            placeholder="#4F46E5"
            aria-label={`${label} hex`}
          />
          {hint ? <p className="text-xs text-slate-400">{hint}</p> : null}
        </div>
      </div>

      {shortcuts && shortcuts.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {shortcuts.map((chip) => {
            const active = safe === normalizeHex(chip.value);
            return (
              <button
                key={chip.label}
                type="button"
                disabled={disabled}
                onClick={() => {
                  const next = normalizeHex(chip.value) ?? chip.value;
                  setDraft(next);
                  onChange(next);
                }}
                className={cn(
                  "rounded-full px-3 py-1 text-[11.5px] font-semibold transition-colors duration-150",
                  active
                    ? "bg-indigo-50 text-indigo-700"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200/80",
                  disabled && "opacity-50",
                )}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {swatches.map((swatch) => {
          const hex = normalizeHex(swatch.value) ?? swatch.value;
          const active = safe === hex;
          const isLight = ["#FFFFFF", "#F8FAFC", "#F1F5F9", "#EEF2FF"].includes(
            hex,
          );
          return (
            <button
              key={swatch.value}
              type="button"
              title={swatch.label}
              aria-label={swatch.label}
              aria-pressed={active}
              disabled={disabled}
              onClick={() => {
                setDraft(hex);
                onChange(hex);
              }}
              className={cn(
                "relative size-8 rounded-full border shadow-sm transition-transform duration-150",
                isLight ? "border-slate-200" : "border-transparent",
                !disabled && "hover:scale-105",
                active && "ring-2 ring-indigo-600 ring-offset-2",
                disabled && "opacity-50",
              )}
              style={{ backgroundColor: hex }}
            >
              {active ? (
                <Check
                  className={cn(
                    "absolute inset-0 m-auto size-3.5",
                    isLight ? "text-slate-900" : "text-white",
                  )}
                  strokeWidth={2.5}
                  aria-hidden
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
