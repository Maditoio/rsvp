"use client";

import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { prepareImageForUpload } from "@/modules/files/prepare-image-upload";
import { uploadEventSiteImage } from "@/modules/event-sites/actions";
import {
  SECTION_BACKGROUND_OPTIONS,
  SECTION_BACKGROUND_OVERLAY_OPTIONS,
  SECTION_TEXT_COLOR_OPTIONS,
  TEXT_ALIGN_OPTIONS,
  getSectionBackgroundOverlay,
  getSectionBackgroundOverlayStrength,
  getSectionBackgroundValue,
  getSectionTextAlign,
  getSectionTextColor,
  type SectionTextAlign,
} from "@/modules/event-sites/section-style";

type Props = {
  orgSlug: string;
  eventId: string;
  content: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
  /** Hide the background controls, e.g. when a layout's image already fills the section. */
  showBackground?: boolean;
  /** Hide the text position controls. */
  showTextAlign?: boolean;
  /** Matches the layout's actual default alignment so the picker starts in sync. */
  defaultAlign?: SectionTextAlign;
};

function OptionRow<T extends string>({
  value,
  options,
  onChange,
  columns = 4,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  columns?: number;
}) {
  return (
    <div
      className="mt-1.5 grid gap-1.5"
      style={{ gridTemplateColumns: `repeat(${Math.min(columns, options.length)}, minmax(0, 1fr))` }}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-md border px-2 py-1.5 text-xs font-medium transition",
            value === opt.value
              ? "border-indigo-500 bg-indigo-50 text-indigo-900"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function SectionAppearanceControls({
  orgSlug,
  eventId,
  content,
  onChange,
  showBackground = true,
  showTextAlign = true,
  defaultAlign = "left",
}: Props) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  if (!showBackground && !showTextAlign) return null;

  const background = getSectionBackgroundValue(content);
  const align = getSectionTextAlign(content, defaultAlign);
  const customColor =
    typeof content.backgroundColor === "string" && content.backgroundColor
      ? content.backgroundColor
      : "#FFFFFF";
  const backgroundImageUrl =
    typeof content.backgroundImageUrl === "string" ? content.backgroundImageUrl : null;
  const overlay = getSectionBackgroundOverlay(content, "none");
  const overlayStrength = getSectionBackgroundOverlayStrength(content);
  const textColor = getSectionTextColor(content);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const prepared = await prepareImageForUpload(file, "background");
      if (!prepared.ok) {
        toast.error(prepared.error);
        return;
      }
      const formData = new FormData();
      formData.set("file", prepared.file);
      const result = await uploadEventSiteImage(orgSlug, eventId, formData, "section-bg");
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (result.data?.url) {
        onChange({ background: "image", backgroundImageUrl: result.data.url });
        toast.success("Background image uploaded.");
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50/80 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Appearance
      </p>

      {showBackground ? (
        <div className="space-y-3">
          <div>
            <Label>Background</Label>
            <OptionRow value={background} options={SECTION_BACKGROUND_OPTIONS} onChange={(v) => onChange({ background: v })} />
          </div>

          {background === "custom" ? (
            <div className="space-y-3 rounded-md border border-slate-200 bg-white p-3">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={/^#([0-9A-Fa-f]{6})$/.test(customColor) ? customColor : "#FFFFFF"}
                  onChange={(e) => onChange({ background: "custom", backgroundColor: e.target.value })}
                  className="size-9 shrink-0 cursor-pointer rounded border border-slate-200"
                  aria-label="Custom background colour"
                />
                <Input
                  value={customColor}
                  onChange={(e) => onChange({ background: "custom", backgroundColor: e.target.value })}
                  className="h-9 flex-1"
                  placeholder="#FFFFFF"
                />
              </div>
              <TextColorField value={textColor} onChange={(v) => onChange({ backgroundTextColor: v })} />
            </div>
          ) : null}

          {background === "image" ? (
            <div className="space-y-3 rounded-md border border-slate-200 bg-white p-3">
              {backgroundImageUrl ? (
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={backgroundImageUrl}
                    alt=""
                    className="h-16 w-24 border border-slate-200 object-cover"
                    style={{ borderRadius: 0 }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={uploading}
                    onClick={() => onChange({ backgroundImageUrl: null })}
                  >
                    Remove
                  </Button>
                </div>
              ) : null}
              {uploading ? (
                <div className="flex items-center gap-2 text-sm text-indigo-600">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  <span>Uploading image…</span>
                </div>
              ) : null}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {backgroundImageUrl ? "Replace image" : "Upload image"}
              </Button>

              <div>
                <Label>Overlay</Label>
                <OptionRow
                  value={overlay}
                  options={SECTION_BACKGROUND_OVERLAY_OPTIONS}
                  onChange={(v) => onChange({ backgroundOverlay: v })}
                  columns={3}
                />
              </div>
              {overlay !== "none" ? (
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <Label>Overlay strength</Label>
                    <span className="text-xs text-slate-500">{overlayStrength}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={overlayStrength}
                    onChange={(e) => onChange({ backgroundOverlayStrength: Number(e.target.value) })}
                    className="mt-2 w-full accent-indigo-600"
                  />
                </div>
              ) : null}
              <TextColorField value={textColor} onChange={(v) => onChange({ backgroundTextColor: v })} />
            </div>
          ) : null}
        </div>
      ) : null}

      {showTextAlign ? (
        <div>
          <Label>Text position</Label>
          <OptionRow value={align} options={TEXT_ALIGN_OPTIONS} onChange={(v) => onChange({ textAlign: v })} columns={3} />
        </div>
      ) : null}
    </div>
  );
}

function TextColorField({
  value,
  onChange,
}: {
  value: "auto" | "light";
  onChange: (v: "auto" | "light") => void;
}) {
  return (
    <div>
      <Label>Text colour</Label>
      <OptionRow value={value} options={SECTION_TEXT_COLOR_OPTIONS} onChange={onChange} columns={2} />
      <p className="mt-1 text-xs text-slate-500">
        Switch to light text when the background is dark or a busy photo.
      </p>
    </div>
  );
}
