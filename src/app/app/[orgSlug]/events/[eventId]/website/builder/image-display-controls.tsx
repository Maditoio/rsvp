"use client";

import { Label } from "@/components/ui/label";
import {
  SITE_IMAGE_FITS,
  SITE_IMAGE_POSITIONS,
  SITE_IMAGE_RADIUS,
  SITE_IMAGE_RADIUS_LABELS,
} from "@/modules/event-sites/site-image";

type Props = {
  content: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
  /** Hide corner control (e.g. full-bleed backgrounds). */
  hideRadius?: boolean;
};

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <select
        className="mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ImageDisplayControls({ content, onChange, hideRadius }: Props) {
  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/80 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Image display
      </p>
      <SelectField
        label="Fit"
        value={String(content.imageFit ?? "cover")}
        options={SITE_IMAGE_FITS.map((fit) => ({ value: fit, label: fit }))}
        onChange={(imageFit) => onChange({ imageFit })}
      />
      <SelectField
        label="Position"
        value={String(content.imagePosition ?? "center")}
        options={SITE_IMAGE_POSITIONS.map((pos) => ({ value: pos, label: pos }))}
        onChange={(imagePosition) => onChange({ imagePosition })}
      />
      {!hideRadius ? (
        <SelectField
          label="Corners"
          value={String(content.imageRadius ?? "none")}
          options={SITE_IMAGE_RADIUS.map((radius) => ({
            value: radius,
            label: SITE_IMAGE_RADIUS_LABELS[radius],
          }))}
          onChange={(imageRadius) => onChange({ imageRadius })}
        />
      ) : null}
    </div>
  );
}
