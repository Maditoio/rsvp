"use client";

import { Copy } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { EventSiteConfig } from "@/modules/event-sites/config";
import {
  EVENT_SITE_COLOR_SWATCHES,
  EVENT_SITE_THEME_PRESETS,
  applyThemePreset,
} from "@/modules/event-sites/theme";
import { EVENT_SITE_FONT_LABELS, EVENT_SITE_FONT_IDS } from "@/modules/event-sites/fonts";
import { TemplateGallery } from "./template-gallery";
import type { EventSiteTemplateId } from "@/modules/event-sites/templates";

type Props = {
  config: EventSiteConfig;
  onChange: (config: EventSiteConfig) => void;
  onApplyTemplate: (templateId: EventSiteTemplateId) => void;
  publicUrl: string;
  isPublished: boolean;
  publishedAt: string | null;
  publicQrDataUrl: string | null;
  eventSlug: string;
  pending: boolean;
};

export function SetupPanel({
  config,
  onChange,
  onApplyTemplate,
  publicUrl,
  isPublished,
  publishedAt,
  publicQrDataUrl,
  eventSlug,
  pending,
}: Props) {
  const toast = useToast();

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Template</h2>
        <p className="mt-1 text-sm text-slate-600">
          Choose a starting layout. Your content is preserved where possible when switching.
        </p>
        <div className="mt-4">
          <TemplateGallery
            selectedId={config.templateId}
            onSelect={(id) => {
              onChange({ ...config, templateId: id });
              onApplyTemplate(id);
            }}
          />
        </div>
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Theme</h2>
        <p className="mt-1 text-sm text-slate-600">
          Global colours, typography, and navigation style for your site.
        </p>
        <div className="mt-5 space-y-5">
          <div>
            <Label>Theme preset</Label>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {EVENT_SITE_THEME_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  disabled={pending}
                  className={`rounded-lg border px-3 py-2 text-left text-xs font-semibold capitalize ${
                    config.theme.preset === preset
                      ? "border-indigo-500 bg-indigo-50 text-indigo-900"
                      : "border-slate-200"
                  }`}
                  onClick={() =>
                    onChange({
                      ...config,
                      theme: { ...applyThemePreset(preset), preset },
                    })
                  }
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <ColorSwatches
            label="Accent colour"
            value={config.theme.accentColor}
            onChange={(accentColor) =>
              onChange({ ...config, theme: { ...config.theme, accentColor } })
            }
          />
          <ColorSwatches
            label="Primary colour"
            value={config.theme.primaryColor}
            onChange={(primaryColor) =>
              onChange({ ...config, theme: { ...config.theme, primaryColor } })
            }
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Heading font</Label>
              <select
                className="mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm"
                value={config.theme.headingFont}
                onChange={(e) =>
                  onChange({
                    ...config,
                    theme: {
                      ...config.theme,
                      headingFont: e.target.value as typeof config.theme.headingFont,
                    },
                  })
                }
              >
                {EVENT_SITE_FONT_IDS.map((id) => (
                  <option key={id} value={id}>
                    {EVENT_SITE_FONT_LABELS[id]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Body font</Label>
              <select
                className="mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm"
                value={config.theme.bodyFont}
                onChange={(e) =>
                  onChange({
                    ...config,
                    theme: {
                      ...config.theme,
                      bodyFont: e.target.value as typeof config.theme.bodyFont,
                    },
                  })
                }
              >
                {EVENT_SITE_FONT_IDS.map((id) => (
                  <option key={id} value={id}>
                    {EVENT_SITE_FONT_LABELS[id]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Navigation style</Label>
              <select
                className="mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm"
                value={config.globalStyles.navStyle}
                onChange={(e) =>
                  onChange({
                    ...config,
                    globalStyles: {
                      ...config.globalStyles,
                      navStyle: e.target.value as typeof config.globalStyles.navStyle,
                    },
                  })
                }
              >
                <option value="sticky-light">Sticky light</option>
                <option value="sticky-dark">Sticky dark</option>
                <option value="solid">Solid</option>
                <option value="transparent">Transparent</option>
              </select>
            </div>
            <div>
              <Label>Section spacing</Label>
              <select
                className="mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm"
                value={config.globalStyles.sectionSpacing}
                onChange={(e) =>
                  onChange({
                    ...config,
                    globalStyles: {
                      ...config.globalStyles,
                      sectionSpacing: e.target.value as typeof config.globalStyles.sectionSpacing,
                    },
                  })
                }
              >
                <option value="compact">Compact</option>
                <option value="normal">Normal</option>
                <option value="spacious">Spacious</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Publish & URL</h2>
        <p className="mt-1 text-sm text-slate-600">
          Your public event website address and publish status.
        </p>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <dt className="text-slate-500">Status</dt>
            <dd>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  isPublished ? "bg-teal-50 text-teal-700" : "bg-amber-50 text-amber-700"
                }`}
              >
                <span
                  className={`size-1.5 rounded-full ${isPublished ? "bg-teal-500" : "bg-amber-500"}`}
                />
                {isPublished ? "Published" : "Draft"}
              </span>
            </dd>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <dt className="text-slate-500">Event slug</dt>
            <dd className="font-mono text-slate-800">{eventSlug}</dd>
          </div>
          {publishedAt ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <dt className="text-slate-500">Last published</dt>
              <dd className="text-slate-800">
                {new Date(publishedAt).toLocaleString()}
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="text-slate-500">Public URL</dt>
            <dd className="mt-1 flex items-center gap-2">
              <p className="min-w-0 flex-1 truncate font-mono text-xs text-slate-700">
                {publicUrl}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  void navigator.clipboard.writeText(publicUrl);
                  toast.success("URL copied.");
                }}
              >
                <Copy className="size-3.5" />
              </Button>
              {publicQrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={publicQrDataUrl}
                  alt=""
                  className="size-10 rounded border border-slate-200"
                />
              ) : null}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

function ColorSwatches({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {EVENT_SITE_COLOR_SWATCHES.map((swatch) => (
          <button
            key={swatch.value}
            type="button"
            title={swatch.label}
            className={`size-7 rounded-full border-2 ${
              value === swatch.value
                ? "border-indigo-600 ring-2 ring-indigo-200"
                : "border-white shadow-sm"
            }`}
            style={{ backgroundColor: swatch.value }}
            onClick={() => onChange(swatch.value)}
          />
        ))}
      </div>
    </div>
  );
}
