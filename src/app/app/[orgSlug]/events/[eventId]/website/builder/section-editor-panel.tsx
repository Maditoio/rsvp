"use client";

import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  EVENT_SITE_CTA_TYPES,
  type EventSiteConfig,
} from "@/modules/event-sites/config";
import {
  HERO_SPLIT_IMAGE_WIDTH,
  HERO_SPLIT_MIN_HEIGHTS,
} from "@/modules/event-sites/hero-image";
import { ImageDisplayControls } from "./image-display-controls";
import { SectionAppearanceControls } from "./appearance-controls";
import {
  sectionDisplayLabel,
  updateSection,
  type EventSiteSection,
} from "@/modules/event-sites/sections";
import { prepareImageForUpload } from "@/modules/files/prepare-image-upload";
import { uploadEventSiteImage } from "@/modules/event-sites/actions";
import {
  EVENT_SPONSOR_TIERS,
  EVENT_SPONSOR_TIER_LABELS,
  parseSponsorSectionTiers,
  parseSponsorLogoGrayscale,
  parseSponsorLogoSize,
  SPONSOR_LOGO_SIZE_LABELS,
  SPONSOR_LOGO_SIZES,
  type EventSponsorTierId,
} from "@/modules/sponsors/config";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { LayoutVariantPicker } from "./layout-variant-picker";
import type { EventSiteSectionType } from "@/modules/event-sites/sections";

type GalleryImageItem = {
  id: string;
  url: string;
  caption: string;
  imageFit?: string;
  imagePosition?: string;
  imageRadius?: string;
};

type Props = {
  orgSlug: string;
  eventId: string;
  config: EventSiteConfig;
  selectedSectionId: string | null;
  onChange: (config: EventSiteConfig) => void;
  allowPublicApplication: boolean;
};

export function SectionEditorPanel({
  orgSlug,
  eventId,
  config,
  selectedSectionId,
  onChange,
  allowPublicApplication,
}: Props) {
  const toast = useToast();
  const heroInputRef = useRef<HTMLInputElement>(null);
  const headerLogoInputRef = useRef<HTMLInputElement>(null);
  const aboutImageInputRef = useRef<HTMLInputElement>(null);
  const contentImageInputRef = useRef<HTMLInputElement>(null);
  const venueInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  const section = config.sections.find((s) => s.id === selectedSectionId) ?? null;

  function patchSection(id: string, patch: Parameters<typeof updateSection>[2]) {
    onChange({
      ...config,
      sections: updateSection(config.sections, id, patch),
    });
  }

  function patchContent(id: string, content: Record<string, unknown>) {
    patchSection(id, { content });
  }

  async function runUpload(
    uploadKey: string,
    file: File,
    purpose: "hero" | "speaker" | "gallery" | "venue" | "og" | "logo" | "about" | "content",
    onUrl: (url: string) => void,
  ) {
    setUploadingKey(uploadKey);
    try {
      const prepared = await prepareImageForUpload(
        file,
        purpose === "hero" || purpose === "venue" || purpose === "about" || purpose === "content"
          ? "background"
          : "logo",
      );
      if (!prepared.ok) {
        toast.error(prepared.error);
        return;
      }
      const formData = new FormData();
      formData.set("file", prepared.file);
      const result = await uploadEventSiteImage(orgSlug, eventId, formData, purpose);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (result.data?.url) onUrl(result.data.url);
      toast.success("Image uploaded.");
    } finally {
      setUploadingKey(null);
    }
  }

  if (!section) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <p className="text-sm font-medium text-slate-700">No section selected</p>
        <p className="mt-1 text-xs text-slate-500">
          Choose a section from the strip above the preview to edit its content.
        </p>
      </div>
    );
  }

  const title = sectionDisplayLabel(section);

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <p className="mt-0.5 text-xs text-slate-500">Edit section content and layout.</p>
      </div>

      <div className="space-y-4 p-4">
        <LayoutVariantPicker
          sectionType={section.type as EventSiteSectionType}
          value={section.variant}
          onChange={(variant) => patchSection(section.id, { variant })}
        />

        {section.type !== "header" && section.type !== "footer" ? (
          <SectionAppearanceControls
            orgSlug={orgSlug}
            eventId={eventId}
            content={section.content}
            onChange={(patch) => patchContent(section.id, patch)}
            showBackground={
              section.type === "hero"
                ? section.variant === "compact" || section.variant === "editorial"
                : section.type === "venue"
                  ? section.variant !== "overlay"
                  : true
            }
            showTextAlign={section.type !== "registration-cta"}
            defaultAlign={
              section.type === "hero"
                ? section.variant === "compact" || section.variant === "editorial"
                  ? "center"
                  : "left"
                : section.type === "venue"
                  ? section.variant === "minimal" || section.variant === "stacked"
                    ? "center"
                    : "left"
                  : section.type === "statistics" || section.type === "registration-cta"
                    ? "center"
                    : "left"
            }
          />
        ) : null}

        {section.type === "header" ? (
          <>
            <Toggle
              label="Show logo"
              checked={section.content.showLogo !== false}
              onChange={(showLogo) => patchContent(section.id, { showLogo })}
            />
            <ImageUploadField
              label="Site logo"
              hint="Upload your event or organisation logo. This is separate from sponsor logos."
              imageUrl={section.content.logoUrl as string | null}
              inputRef={headerLogoInputRef}
              uploading={uploadingKey === `${section.id}:logo`}
              onUpload={(file) =>
                void runUpload(`${section.id}:logo`, file, "logo", (url) =>
                  patchContent(section.id, { logoUrl: url }),
                )
              }
              onRemove={() => patchContent(section.id, { logoUrl: null })}
            />
            <ImageDisplayControls
              content={section.content}
              onChange={(patch) => patchContent(section.id, patch)}
            />
          </>
        ) : null}

        {section.type === "hero" ? (
          <>
            <Field label="Eyebrow" value={String(section.content.eyebrow ?? "")} onChange={(v) => patchContent(section.id, { eyebrow: v })} />
            <Field label="Headline" value={String(section.content.headline ?? "")} onChange={(v) => patchContent(section.id, { headline: v })} />
            <TextArea label="Subheadline" value={String(section.content.subheadline ?? "")} onChange={(v) => patchContent(section.id, { subheadline: v })} />
            <Toggle label="Show dates" checked={section.content.showDates !== false} onChange={(v) => patchContent(section.id, { showDates: v })} />
            <Toggle label="Show venue" checked={section.content.showVenue !== false} onChange={(v) => patchContent(section.id, { showVenue: v })} />
            <Toggle
              label="Show logo on hero"
              checked={section.content.showLogo !== false}
              onChange={(showLogo) => patchContent(section.id, { showLogo })}
            />
            <Field label="Primary CTA label" value={String(section.content.primaryCtaLabel ?? "")} onChange={(v) => patchContent(section.id, { primaryCtaLabel: v })} />
            <ImageUploadField
              label="Hero image"
              imageUrl={section.content.imageUrl as string | null}
              inputRef={heroInputRef}
              uploading={uploadingKey === `${section.id}:hero`}
              onUpload={(file) =>
                void runUpload(`${section.id}:hero`, file, "hero", (url) =>
                  patchContent(section.id, { imageUrl: url }),
                )
              }
              onRemove={() => patchContent(section.id, { imageUrl: null })}
            />
            <ImageDisplayControls
              content={section.content}
              onChange={(patch) => patchContent(section.id, patch)}
              hideRadius={section.variant === "full"}
            />
            <SelectField
              label="Overlay"
              value={String(section.content.overlay ?? "gradient")}
              options={[
                { value: "gradient", label: "Gradient" },
                { value: "dark", label: "Dark" },
                { value: "none", label: "Light" },
              ]}
              onChange={(v) => patchContent(section.id, { overlay: v })}
            />
            <RangeField
              label="Overlay strength"
              value={typeof section.content.overlayStrength === "number" ? section.content.overlayStrength : 100}
              min={0}
              max={100}
              onChange={(v) => patchContent(section.id, { overlayStrength: v })}
            />
            {section.variant === "full" ? (
              <Field
                label="Hero min height"
                value={String(section.content.heroMinHeight ?? "min(72vh, 800px)")}
                onChange={(v) => patchContent(section.id, { heroMinHeight: v })}
                hint="CSS value, e.g. min(72vh, 800px) or 600px"
              />
            ) : null}
            {section.variant === "split" ? (
              <>
                <SelectField
                  label="Image width"
                  value={String(section.content.imageWidthMode ?? "full")}
                  options={HERO_SPLIT_IMAGE_WIDTH.map((mode) => ({
                    value: mode,
                    label: mode === "full" ? "Full column" : "Inset",
                  }))}
                  onChange={(v) => patchContent(section.id, { imageWidthMode: v })}
                />
                <SelectField
                  label="Image min height"
                  value={String(section.content.imageMinHeight ?? "360px")}
                  options={HERO_SPLIT_MIN_HEIGHTS.map((opt) => ({
                    value: opt.value,
                    label: opt.label,
                  }))}
                  onChange={(v) => patchContent(section.id, { imageMinHeight: v })}
                />
              </>
            ) : null}
          </>
        ) : null}

        {section.type === "event-details" ? (
          <>
            <Field label="Title" value={String(section.content.title ?? "")} onChange={(v) => patchContent(section.id, { title: v })} />
            <Toggle label="Show dates" checked={section.content.showDates !== false} onChange={(v) => patchContent(section.id, { showDates: v })} />
            <Toggle label="Show venue" checked={section.content.showVenue !== false} onChange={(v) => patchContent(section.id, { showVenue: v })} />
            <Toggle label="Show timezone" checked={section.content.showTimezone !== false} onChange={(v) => patchContent(section.id, { showTimezone: v })} />
            <p className="text-xs text-slate-500">
              Dates, venue, and timezone are pulled from your event settings automatically.
            </p>
          </>
        ) : null}

        {section.type === "about" ? (
          <>
            <Field label="Title" value={String(section.content.title ?? "")} onChange={(v) => patchContent(section.id, { title: v })} />
            <TextArea label="Body" value={String(section.content.body ?? "")} onChange={(v) => patchContent(section.id, { body: v })} rows={6} />
            {section.variant === "split" ? (
              <ImageUploadField
                label="Side image"
                hint="Shown beside the text when using the split layout."
                imageUrl={section.content.imageUrl as string | null}
                inputRef={aboutImageInputRef}
                uploading={uploadingKey === `${section.id}:about`}
                onUpload={(file) =>
                  void runUpload(`${section.id}:about`, file, "about", (url) =>
                    patchContent(section.id, { imageUrl: url }),
                  )
                }
                onRemove={() => patchContent(section.id, { imageUrl: null })}
              />
            ) : null}
            {section.variant === "split" ? (
              <ImageDisplayControls
                content={section.content}
                onChange={(patch) => patchContent(section.id, patch)}
              />
            ) : null}
          </>
        ) : null}

        {section.type === "content" ? (
          <>
            <Field
              label="Section label"
              value={String(section.content.label ?? "")}
              onChange={(v) => patchContent(section.id, { label: v })}
              hint="Shown in the builder section list. Optional."
            />
            <Field
              label="Eyebrow"
              value={String(section.content.eyebrow ?? "")}
              onChange={(v) => patchContent(section.id, { eyebrow: v })}
            />
            <Field
              label="Title"
              value={String(section.content.title ?? "")}
              onChange={(v) => patchContent(section.id, { title: v })}
            />
            <Field
              label="Subtitle"
              value={String(section.content.subtitle ?? "")}
              onChange={(v) => patchContent(section.id, { subtitle: v })}
            />
            <TextArea
              label="Body"
              value={String(section.content.body ?? "")}
              onChange={(v) => patchContent(section.id, { body: v })}
              rows={6}
            />
            {section.variant === "split" ||
            section.variant === "split-left" ||
            section.variant === "image" ? (
              <ImageUploadField
                label={section.variant === "image" ? "Featured image" : "Side image"}
                hint={
                  section.variant === "image"
                    ? "Large image with optional copy below."
                    : "Shown beside the text in split layouts."
                }
                imageUrl={section.content.imageUrl as string | null}
                inputRef={contentImageInputRef}
                uploading={uploadingKey === `${section.id}:content`}
                onUpload={(file) =>
                  void runUpload(`${section.id}:content`, file, "content", (url) =>
                    patchContent(section.id, { imageUrl: url }),
                  )
                }
                onRemove={() => patchContent(section.id, { imageUrl: null })}
              />
            ) : null}
            {section.variant === "split" ||
            section.variant === "split-left" ||
            section.variant === "image" ? (
              <ImageDisplayControls
                content={section.content}
                onChange={(patch) => patchContent(section.id, patch)}
              />
            ) : null}
            <Field
              label="Button label"
              value={String(section.content.ctaLabel ?? "")}
              onChange={(v) => patchContent(section.id, { ctaLabel: v })}
            />
            <Field
              label="Button URL"
              value={String(section.content.ctaUrl ?? "")}
              onChange={(v) => patchContent(section.id, { ctaUrl: v || null })}
            />
          </>
        ) : null}

        {section.type === "speakers" ? (
          <>
            <Field
              label="Section title"
              value={String(section.content.title ?? "")}
              onChange={(title) => patchContent(section.id, { title })}
            />
            <ImageDisplayControls
              content={section.content}
              onChange={(patch) => patchContent(section.id, patch)}
              hideRadius
            />
            <p className="text-xs text-slate-500">
              Photo fit and position apply to all speakers. Manage names, bios, photos,
              and visibility on the{" "}
              <Link
                href={`/app/${orgSlug}/events/${eventId}/speakers`}
                className="font-medium text-indigo-600 hover:text-indigo-700"
              >
                Speakers
              </Link>{" "}
              tab — the roster syncs automatically to this preview and the published site.
            </p>
          </>
        ) : null}

        {section.type === "agenda" ? (
          <>
            <Field label="Title" value={String(section.content.title ?? "")} onChange={(v) => patchContent(section.id, { title: v })} />
            <Field label="Max sessions" value={String(section.content.maxSessions ?? 8)} onChange={(v) => patchContent(section.id, { maxSessions: Number(v) || 8 })} />
            <p className="text-xs text-slate-500">Agenda pulls from event sessions automatically.</p>
          </>
        ) : null}

        {section.type === "sponsors" ? (
          <>
            <Field label="Title" value={String(section.content.title ?? "")} onChange={(v) => patchContent(section.id, { title: v })} />
            <SponsorTiersEditor
              value={section.content.showTiers}
              onChange={(showTiers) => patchContent(section.id, { showTiers })}
            />
            <Toggle
              label="Show tier labels"
              checked={section.content.showTierLabels !== false}
              onChange={(showTierLabels) => patchContent(section.id, { showTierLabels })}
            />
            <Toggle
              label="Grayscale logos"
              checked={parseSponsorLogoGrayscale(section.content.logoGrayscale)}
              onChange={(logoGrayscale) => patchContent(section.id, { logoGrayscale })}
            />
            <SelectField
              label="Logo size"
              value={parseSponsorLogoSize(section.content.logoSize)}
              options={SPONSOR_LOGO_SIZES.map((size) => ({
                value: size,
                label: SPONSOR_LOGO_SIZE_LABELS[size],
              }))}
              onChange={(logoSize) => patchContent(section.id, { logoSize })}
            />
            <p className="text-xs text-slate-500">
              Sponsor logos and tiers are managed on the{" "}
              <a
                href={`/app/${orgSlug}/events/${eventId}/sponsors`}
                className="font-medium text-indigo-600 hover:text-indigo-700"
              >
                Sponsors
              </a>{" "}
              tab. Logos are always ordered by tier; turn off labels if you prefer a cleaner look.
              Turn off grayscale to show logos in full colour, and increase logo size when you need
              more prominence.
            </p>
          </>
        ) : null}

        {section.type === "registration-cta" ? (
          <>
            <Field label="Title" value={String(section.content.title ?? "")} onChange={(v) => patchContent(section.id, { title: v })} />
            <TextArea label="Subtitle" value={String(section.content.subtitle ?? "")} onChange={(v) => patchContent(section.id, { subtitle: v })} />
            <div>
              <Label>CTA type</Label>
              <select
                className="mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm"
                value={String(section.content.ctaType ?? "public_apply")}
                onChange={(e) => patchContent(section.id, { ctaType: e.target.value })}
              >
                {EVENT_SITE_CTA_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t === "public_apply" ? "Public apply" : t === "external" ? "External URL" : "Hidden"}
                  </option>
                ))}
              </select>
            </div>
            <Field label="Button label" value={String(section.content.ctaLabel ?? "")} onChange={(v) => patchContent(section.id, { ctaLabel: v })} />
            {section.content.ctaType === "external" ? (
              <Field label="External URL" value={String(section.content.externalUrl ?? "")} onChange={(v) => patchContent(section.id, { externalUrl: v })} />
            ) : null}
            {!allowPublicApplication && section.content.ctaType === "public_apply" ? (
              <p className="text-xs text-amber-700">Enable public applications in event settings for the CTA to work.</p>
            ) : null}
          </>
        ) : null}

        {section.type === "statistics" ? (
          <StatisticsEditor section={section} onPatch={(content) => patchContent(section.id, content)} />
        ) : null}

        {section.type === "contact" ? (
          <>
            <Field label="Title" value={String(section.content.title ?? "")} onChange={(v) => patchContent(section.id, { title: v })} />
            <Field label="Email" value={String(section.content.email ?? "")} onChange={(v) => patchContent(section.id, { email: v })} />
            <Field label="Phone" value={String(section.content.phone ?? "")} onChange={(v) => patchContent(section.id, { phone: v })} />
          </>
        ) : null}

        {section.type === "faq" ? (
          <FaqEditor section={section} onPatch={(content) => patchContent(section.id, content)} />
        ) : null}

        {section.type === "venue" ? (
          <>
            <Field label="Title" value={String(section.content.title ?? "")} onChange={(v) => patchContent(section.id, { title: v })} />
            <Field label="Address" value={String(section.content.address ?? "")} onChange={(v) => patchContent(section.id, { address: v })} />
            <TextArea label="Description" value={String(section.content.description ?? "")} onChange={(v) => patchContent(section.id, { description: v })} />
            <ImageUploadField
              label="Venue image"
              hint="Used in split, stacked, and overlay layouts."
              imageUrl={section.content.imageUrl as string | null}
              inputRef={venueInputRef}
              uploading={uploadingKey === `${section.id}:venue`}
              onUpload={(file) =>
                void runUpload(`${section.id}:venue`, file, "venue", (url) =>
                  patchContent(section.id, { imageUrl: url }),
                )
              }
              onRemove={() => patchContent(section.id, { imageUrl: null })}
            />
            <ImageDisplayControls
              content={section.content}
              onChange={(patch) => patchContent(section.id, patch)}
            />
          </>
        ) : null}

        {section.type === "gallery" ? (
          <GalleryEditor
            section={section}
            onPatch={(content) => patchContent(section.id, content)}
            galleryInputRef={galleryInputRef}
            uploadingIndex={
              uploadingKey?.startsWith(`${section.id}:gallery:`)
                ? Number(uploadingKey.split(":").pop())
                : null
            }
            onUploadFile={(file, imageIndex) => {
              void runUpload(`${section.id}:gallery:${imageIndex}`, file, "gallery", (url) => {
                const images =
                  (section.content.images as GalleryImageItem[]) ?? [];
                if (imageIndex < 0 || imageIndex >= images.length) return;
                const next = [...images];
                next[imageIndex] = { ...next[imageIndex], url };
                patchContent(section.id, { images: next });
              });
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

function ImageUploadField({
  label,
  hint,
  imageUrl,
  inputRef,
  uploading,
  onUpload,
  onRemove,
}: {
  label: string;
  hint?: string;
  imageUrl: string | null | undefined;
  inputRef: React.RefObject<HTMLInputElement | null>;
  uploading?: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
      <div className="relative mt-2">
        {imageUrl ? (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt=""
              className="h-16 w-24 border border-slate-200 object-cover"
              style={{ borderRadius: 0 }}
            />
            <Button type="button" variant="ghost" size="sm" onClick={onRemove} disabled={uploading}>
              Remove
            </Button>
          </div>
        ) : null}
        {uploading ? (
          <div
            className={cn(
              "flex items-center gap-2 text-sm text-indigo-600",
              imageUrl ? "mt-2" : "py-3",
            )}
          >
            <Loader2 className="size-4 animate-spin" aria-hidden />
            <span>Uploading image…</span>
          </div>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={uploading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="mt-1.5"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            Uploading…
          </span>
        ) : imageUrl ? (
          "Replace image"
        ) : (
          "Upload image"
        )}
      </Button>
    </div>
  );
}

function GalleryEditor({
  section,
  onPatch,
  galleryInputRef,
  uploadingIndex,
  onUploadFile,
}: {
  section: EventSiteSection;
  onPatch: (content: Record<string, unknown>) => void;
  galleryInputRef: React.RefObject<HTMLInputElement | null>;
  uploadingIndex: number | null;
  onUploadFile: (file: File, imageIndex: number) => void;
}) {
  const images = (section.content.images as GalleryImageItem[]) ?? [];
  const [uploadIndex, setUploadIndex] = useState<number | null>(null);

  function patchImages(next: GalleryImageItem[]) {
    onPatch({ ...section.content, images: next });
  }

  return (
    <div className="space-y-3">
      <Field
        label="Title"
        value={String(section.content.title ?? "")}
        onChange={(title) => onPatch({ ...section.content, title })}
      />
      <ImageDisplayControls
        content={section.content}
        onChange={(patch) => onPatch({ ...section.content, ...patch })}
      />
      <p className="text-xs text-slate-500">
        Default fit, position, and corners apply to all gallery images unless overridden per image.
      </p>
      {images.map((img, i) => (
        <div key={img.id} className="space-y-2 rounded-lg border border-slate-200 p-3">
          <div className="relative">
            {img.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={img.url}
                alt={img.caption}
                className="aspect-[4/3] w-full object-cover"
                style={{ borderRadius: 0 }}
              />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center bg-slate-100 text-xs text-slate-500">
                No image yet
              </div>
            )}
            {uploadingIndex === i ? (
              <div className="absolute inset-0 flex items-center justify-center bg-white/85">
                <Loader2 className="size-5 animate-spin text-indigo-600" aria-hidden />
                <span className="ml-2 text-xs font-medium text-slate-600">Uploading…</span>
              </div>
            ) : null}
          </div>
          <Input
            placeholder="Caption"
            value={img.caption}
            onChange={(e) => {
              const next = [...images];
              next[i] = { ...img, caption: e.target.value };
              patchImages(next);
            }}
          />
          <ImageDisplayControls
            content={{
              imageFit: img.imageFit ?? section.content.imageFit,
              imagePosition: img.imagePosition ?? section.content.imagePosition,
              imageRadius: img.imageRadius ?? section.content.imageRadius,
            }}
            onChange={(patch) => {
              const next = [...images];
              next[i] = { ...img, ...patch };
              patchImages(next);
            }}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={uploadingIndex === i}
              onClick={() => {
                setUploadIndex(i);
                galleryInputRef.current?.click();
              }}
            >
              {uploadingIndex === i ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  Uploading…
                </span>
              ) : img.url ? (
                "Replace"
              ) : (
                "Upload"
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={uploadingIndex === i}
              onClick={() => patchImages(images.filter((_, idx) => idx !== i))}
            >
              Remove
            </Button>
          </div>
        </div>
      ))}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && uploadIndex !== null) onUploadFile(file, uploadIndex);
          e.target.value = "";
          setUploadIndex(null);
        }}
      />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() =>
          patchImages([
            ...images,
            {
              id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              url: "",
              caption: "",
            },
          ])
        }
      >
        Add image
      </Button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input className="mt-1.5" value={value} onChange={(e) => onChange(e.target.value)} />
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <textarea
        rows={rows}
        className="mt-1.5 w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
      <input
        type="checkbox"
        className="size-4 rounded border-slate-300 text-indigo-600"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

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

function RangeField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <Label>{label}</Label>
        <span className="text-xs text-slate-500">{value}%</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-indigo-600"
      />
    </div>
  );
}

function StatisticsEditor({
  section,
  onPatch,
}: {
  section: EventSiteSection;
  onPatch: (content: Record<string, unknown>) => void;
}) {
  const items = (section.content.items as { value: string; label: string }[]) ?? [];
  return (
    <div className="space-y-3">
      <Field label="Title" value={String(section.content.title ?? "")} onChange={(title) => onPatch({ ...section.content, title })} />
      {items.map((item, i) => (
        <div key={i} className="grid grid-cols-2 gap-2">
          <Input
            placeholder="Value"
            value={item.value}
            onChange={(e) => {
              const next = [...items];
              next[i] = { ...item, value: e.target.value };
              onPatch({ ...section.content, items: next });
            }}
          />
          <Input
            placeholder="Label"
            value={item.label}
            onChange={(e) => {
              const next = [...items];
              next[i] = { ...item, label: e.target.value };
              onPatch({ ...section.content, items: next });
            }}
          />
        </div>
      ))}
    </div>
  );
}

function FaqEditor({
  section,
  onPatch,
}: {
  section: EventSiteSection;
  onPatch: (content: Record<string, unknown>) => void;
}) {
  const items = (section.content.items as { question: string; answer: string }[]) ?? [];
  return (
    <div className="space-y-3">
      <Field label="Title" value={String(section.content.title ?? "")} onChange={(title) => onPatch({ ...section.content, title })} />
      {items.map((item, i) => (
        <div key={i} className="space-y-2 rounded-lg border border-slate-200 p-3">
          <Input
            placeholder="Question"
            value={item.question}
            onChange={(e) => {
              const next = [...items];
              next[i] = { ...item, question: e.target.value };
              onPatch({ ...section.content, items: next });
            }}
          />
          <textarea
            placeholder="Answer"
            rows={2}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            value={item.answer}
            onChange={(e) => {
              const next = [...items];
              next[i] = { ...item, answer: e.target.value };
              onPatch({ ...section.content, items: next });
            }}
          />
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() =>
          onPatch({
            ...section.content,
            items: [...items, { question: "New question", answer: "" }],
          })
        }
      >
        Add FAQ item
      </Button>
    </div>
  );
}

function SponsorTiersEditor({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (tiers: EventSponsorTierId[]) => void;
}) {
  const selected = new Set(parseSponsorSectionTiers(value));

  function toggle(tier: EventSponsorTierId) {
    const next = new Set(selected);
    if (next.has(tier)) next.delete(tier);
    else next.add(tier);
    if (next.size === 0) return;
    onChange(
      EVENT_SPONSOR_TIERS.filter((tierId) => next.has(tierId)),
    );
  }

  return (
    <div>
      <Label>Tiers to show</Label>
      <div className="mt-2 flex flex-wrap gap-2">
        {EVENT_SPONSOR_TIERS.map((tier) => (
          <label
            key={tier}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700"
          >
            <input
              type="checkbox"
              className="size-3.5 rounded border-slate-300 text-indigo-600"
              checked={selected.has(tier)}
              onChange={() => toggle(tier)}
            />
            {EVENT_SPONSOR_TIER_LABELS[tier]}
          </label>
        ))}
      </div>
    </div>
  );
}