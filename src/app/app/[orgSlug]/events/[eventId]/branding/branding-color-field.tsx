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

function SwatchRow({
  title,
  items,
  safe,
  disabled,
  onPick,
}: {
  title?: string;
  items: ColorSwatch[];
  safe: string;
  disabled?: boolean;
  onPick: (hex: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-1.5">
      {title ? (
        <p className="text-[11px] font-medium text-slate-400">{title}</p>
      ) : null}
      <div className="flex flex-wrap gap-1.5">
        {items.map((swatch) => {
          const hex = normalizeHex(swatch.value) ?? swatch.value;
          const active = safe === hex;
          const isLight = [
            "#FFFFFF",
            "#F8FAFC",
            "#F1F5F9",
            "#EEF2FF",
          ].includes(hex);
          return (
            <button
              key={`${title ?? "swatch"}-${hex}`}
              type="button"
              title={swatch.label}
              aria-label={swatch.label}
              aria-pressed={active}
              disabled={disabled}
              onClick={() => onPick(hex)}
              className={cn(
                "relative size-7 rounded-full transition-transform duration-150",
                isLight ? "ring-1 ring-slate-200" : "ring-1 ring-black/5",
                !disabled && "hover:scale-110",
                active && "ring-2 ring-indigo-600 ring-offset-1",
                disabled && "opacity-50",
              )}
              style={{ backgroundColor: hex }}
            >
              {active ? (
                <Check
                  className={cn(
                    "absolute inset-0 m-auto size-3",
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

export function BrandingColorField({
  label,
  value,
  onChange,
  disabled,
  swatches = DEFAULT_SWATCHES,
  logoSuggestions,
  recent,
  hint,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  disabled?: boolean;
  swatches?: ColorSwatch[];
  /** Colours sampled from the event logo */
  logoSuggestions?: ColorSwatch[];
  /** Recently used custom colours */
  recent?: ColorSwatch[];
  hint?: string;
}) {
  const id = useId();
  const [draft, setDraft] = useState(value);
  const safe = useMemo(() => normalizeHex(value) ?? "#4F46E5", [value]);
  const uniqueSwatches = useMemo(() => {
    const seen = new Set<string>();
    return swatches.filter((s) => {
      const hex = normalizeHex(s.value) ?? s.value;
      if (seen.has(hex)) return false;
      seen.add(hex);
      return true;
    });
  }, [swatches]);

  useEffect(() => {
    setDraft(safe);
  }, [safe]);

  return (
    <div className="space-y-2.5">
      <Label htmlFor={id} className="mb-0">
        {label}
      </Label>

      <div className="flex items-center gap-2">
        <label
          className={cn(
            "relative size-10 shrink-0 cursor-pointer overflow-hidden rounded-lg ring-1 ring-slate-200 transition-shadow duration-150",
            !disabled && "hover:ring-indigo-300",
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
          <span className="pointer-events-none absolute inset-0 flex items-end justify-end p-1">
            <span className="inline-flex size-4 items-center justify-center rounded-full bg-white/95 text-slate-600 shadow-xs">
              <Pipette className="size-2.5" strokeWidth={2} aria-hidden />
            </span>
          </span>
        </label>

        <div className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[11px] text-slate-400">
            #
          </span>
          <Input
            value={draft.replace(/^#/, "")}
            disabled={disabled}
            onChange={(e) => {
              const raw = e.target.value
                .replace(/[^0-9A-Fa-f]/g, "")
                .toUpperCase();
              setDraft(`#${raw}`);
              const next = normalizeHex(`#${raw}`);
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
            className="h-10 pl-7 font-mono text-xs uppercase tracking-wide"
            placeholder="4F46E5"
            maxLength={6}
            aria-label={`${label} hex`}
          />
        </div>
      </div>

      <SwatchRow
        title={
          (logoSuggestions?.length ?? 0) > 0 || (recent?.length ?? 0) > 0
            ? "Presets"
            : undefined
        }
        items={uniqueSwatches}
        safe={safe}
        disabled={disabled}
        onPick={(hex) => {
          setDraft(hex);
          onChange(hex);
        }}
      />

      <SwatchRow
        title="From logo"
        items={logoSuggestions ?? []}
        safe={safe}
        disabled={disabled}
        onPick={(hex) => {
          setDraft(hex);
          onChange(hex);
        }}
      />

      <SwatchRow
        title="Recent"
        items={recent ?? []}
        safe={safe}
        disabled={disabled}
        onPick={(hex) => {
          setDraft(hex);
          onChange(hex);
        }}
      />

      {hint ? (
        <p className="text-[11px] leading-snug text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}
