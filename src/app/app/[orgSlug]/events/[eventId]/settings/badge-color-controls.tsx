"use client";

import type { ReactNode } from "react";
import {
  BADGE_COLOR_SWATCHES,
  BADGE_GRADIENT_PRESETS,
  type BadgeBgFill,
  type BadgeTextFill,
} from "@/modules/badges/config";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function BadgeColorField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {BADGE_COLOR_SWATCHES.map((swatch) => {
          const active = value.toUpperCase() === swatch.value.toUpperCase();
          return (
            <button
              key={swatch.value}
              type="button"
              title={swatch.label}
              aria-label={swatch.label}
              aria-pressed={active}
              onClick={() => onChange(swatch.value)}
              className={cn(
                "size-7 rounded-full border border-slate-200 shadow-sm transition-transform hover:scale-105",
                active && "ring-2 ring-indigo-600 ring-offset-2",
              )}
              style={{ backgroundColor: swatch.value }}
            />
          );
        })}
        <Input
          id={id}
          type="color"
          value={value.length === 7 ? value : "#0F172A"}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-9 w-12 cursor-pointer rounded-md border border-slate-200 bg-white p-1 shadow-xs"
          aria-label={`${label} custom`}
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-9 w-[6.5rem] px-2 font-mono text-xs uppercase"
          aria-label={`${label} hex`}
        />
      </div>
    </div>
  );
}

export function BadgeFillControls({
  fillId,
  fill,
  onFillChange,
  solidId,
  solidLabel,
  solidColor,
  onSolidChange,
  fromId,
  fromColor,
  onFromChange,
  toId,
  toColor,
  onToChange,
  angleId,
  angle,
  onAngleChange,
}: {
  fillId: string;
  fill: BadgeTextFill;
  onFillChange: (fill: BadgeTextFill) => void;
  solidId: string;
  solidLabel: string;
  solidColor: string;
  onSolidChange: (color: string) => void;
  fromId: string;
  fromColor: string;
  onFromChange: (color: string) => void;
  toId: string;
  toColor: string;
  onToChange: (color: string) => void;
  angleId: string;
  angle: number;
  onAngleChange: (angle: number) => void;
}) {
  return (
    <div className="space-y-4 rounded-xl bg-slate-50 p-3">
      <div>
        <Label htmlFor={fillId}>Fill style</Label>
        <Select
          id={fillId}
          value={fill}
          onChange={(e) => onFillChange(e.target.value as BadgeTextFill)}
          className="mt-1.5"
        >
          <option value="solid">Solid colour</option>
          <option value="gradient">Gradient</option>
        </Select>
      </div>

      {fill === "solid" ? (
        <BadgeColorField
          id={solidId}
          label={solidLabel}
          value={solidColor}
          onChange={onSolidChange}
        />
      ) : (
        <>
          <div>
            <Label>Gradient presets</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {BADGE_GRADIENT_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  title={preset.label}
                  onClick={() => {
                    onFromChange(preset.from);
                    onToChange(preset.to);
                    onAngleChange(preset.angle);
                  }}
                  className="h-8 w-16 rounded-full border border-slate-200 shadow-sm"
                  style={{
                    backgroundImage: `linear-gradient(${preset.angle}deg, ${preset.from}, ${preset.to})`,
                  }}
                  aria-label={preset.label}
                />
              ))}
            </div>
          </div>
          <BadgeColorField
            id={fromId}
            label="Gradient from"
            value={fromColor}
            onChange={onFromChange}
          />
          <BadgeColorField
            id={toId}
            label="Gradient to"
            value={toColor}
            onChange={onToChange}
          />
          <div>
            <Label htmlFor={angleId}>Gradient angle ({angle}°)</Label>
            <input
              id={angleId}
              type="range"
              min={0}
              max={360}
              value={angle}
              onChange={(e) => onAngleChange(Number(e.target.value))}
              className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-indigo-600"
            />
          </div>
        </>
      )}
    </div>
  );
}

/** Badge surface: solid colour, gradient, or uploaded background image. */
export function BadgeBackgroundControls({
  fillId,
  fill,
  onFillChange,
  solidId,
  solidColor,
  onSolidChange,
  fromId,
  fromColor,
  onFromChange,
  toId,
  toColor,
  onToChange,
  angleId,
  angle,
  onAngleChange,
  imageUrl,
  imageSlot,
}: {
  fillId: string;
  fill: BadgeBgFill;
  onFillChange: (fill: BadgeBgFill) => void;
  solidId: string;
  solidColor: string;
  onSolidChange: (color: string) => void;
  fromId: string;
  fromColor: string;
  onFromChange: (color: string) => void;
  toId: string;
  toColor: string;
  onToChange: (color: string) => void;
  angleId: string;
  angle: number;
  onAngleChange: (angle: number) => void;
  imageUrl: string | null;
  /** Upload / remove controls rendered when fill is `image`. */
  imageSlot: ReactNode;
}) {
  return (
    <div className="space-y-4 rounded-xl bg-slate-50 p-3">
      <div>
        <Label htmlFor={fillId}>Badge background</Label>
        <Select
          id={fillId}
          value={fill}
          onChange={(e) => onFillChange(e.target.value as BadgeBgFill)}
          className="mt-1.5"
        >
          <option value="solid">Solid colour</option>
          <option value="gradient">Gradient</option>
          <option value="image">Background image</option>
        </Select>
      </div>

      {fill === "solid" ? (
        <BadgeColorField
          id={solidId}
          label="Background colour"
          value={solidColor}
          onChange={onSolidChange}
        />
      ) : null}

      {fill === "gradient" ? (
        <>
          <div>
            <Label>Gradient presets</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {BADGE_GRADIENT_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  title={preset.label}
                  onClick={() => {
                    onFromChange(preset.from);
                    onToChange(preset.to);
                    onAngleChange(preset.angle);
                  }}
                  className="h-8 w-16 rounded-full border border-slate-200 shadow-sm"
                  style={{
                    backgroundImage: `linear-gradient(${preset.angle}deg, ${preset.from}, ${preset.to})`,
                  }}
                  aria-label={preset.label}
                />
              ))}
            </div>
          </div>
          <BadgeColorField
            id={fromId}
            label="Gradient from"
            value={fromColor}
            onChange={onFromChange}
          />
          <BadgeColorField
            id={toId}
            label="Gradient to"
            value={toColor}
            onChange={onToChange}
          />
          <div>
            <Label htmlFor={angleId}>Gradient angle ({angle}°)</Label>
            <input
              id={angleId}
              type="range"
              min={0}
              max={360}
              value={angle}
              onChange={(e) => onAngleChange(Number(e.target.value))}
              className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-indigo-600"
            />
          </div>
        </>
      ) : null}

      {fill === "image" ? (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            Upload a PNG, JPEG, WebP, or SVG. It covers the badge; text and logos
            sit on top. Choose a solid fallback colour in case the image fails to
            load when printing.
          </p>
          {imageSlot}
          <BadgeColorField
            id={solidId}
            label="Fallback colour"
            value={solidColor}
            onChange={onSolidChange}
          />
          {imageUrl ? (
            <div
              className="h-16 w-full overflow-hidden rounded-md border border-slate-200"
              style={{
                backgroundImage: `url(${JSON.stringify(imageUrl)})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
              aria-label="Background preview"
            />
          ) : (
            <p className="text-sm text-amber-700">
              No background image yet — upload one below, or switch to solid /
              gradient.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
