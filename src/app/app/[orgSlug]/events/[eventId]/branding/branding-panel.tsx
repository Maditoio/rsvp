"use client";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ImageIcon,
  Mail,
  Monitor,
  Palette,
  Smartphone,
  Sparkles,
  Type,
  Upload,
} from "lucide-react";
import {
  removeEmailBanner,
  removeEmailHeroPhoto,
  saveEmailBranding,
  sendBrandingPreviewAction,
  setInvitationHeroEnabled,
  uploadEmailBanner,
  uploadEmailHeroPhoto,
} from "@/modules/communications/email-branding-actions";
import { type EmailBranding } from "@/modules/communications/email-branding";
import {
  BRAND_HEADING_ALIGNS,
  BRAND_HEADING_FONTS,
  BRAND_HEADING_LINE_HEIGHTS,
  BRAND_HEADING_SIZE_MAX,
  BRAND_HEADING_SIZE_MIN,
  BRAND_HEADING_SIZE_PRESETS,
  BRAND_HEADING_TRACKING,
  BRAND_HEADING_WEIGHTS,
  HERO_EYEBROW_MAX,
  HERO_TITLE_MAX,
  brandHeadingCssFamily,
  brandHeadingCssLineHeight,
  brandHeadingCssTextAlign,
  brandHeadingCssTracking,
  brandHeadingCssWeight,
  brandHeadingPublicTitlePx,
  clampBrandHeadingSize,
  formatBrandHeadingSize,
  normalizeBrandHeadingFont,
  type BrandHeadingAlign,
  type BrandHeadingFont,
  type BrandHeadingLineHeight,
  type BrandHeadingSize,
  type BrandHeadingTracking,
  type BrandHeadingWeight,
} from "@/modules/branding/brand-heading-style";
import {
  parsePhotoZoom,
  PHOTO_MIN_RECOMMENDED_WIDTH,
} from "@/modules/branding/cover-focal";
import {
  INVITE_HIGHLIGHT_MAX_LINES,
  INVITE_HIGHLIGHT_MAX_RAW,
  parseInviteHighlights,
} from "@/modules/communications/invite-highlights";
import {
  blendHex,
  headingContrastOk,
  photoOverlayBackground,
  suggestHeadingColor,
} from "@/modules/branding/heading-contrast";
import { extractLogoColors } from "@/modules/branding/logo-colors";
import {
  readRecentColours,
  rememberRecentColour,
} from "@/modules/branding/recent-colours";
import { Select } from "@/components/ui/select";
import {
  EMAIL_HERO_GRADIENTS,
  gradientPreset,
  type EmailHeroBackgroundMode,
  type EmailHeroGradientStyle,
} from "@/modules/communications/invite-hero-background";
import {
  removeEventLogoAction,
  uploadEventLogoAction,
} from "@/modules/badges/actions";
import { friendlyUploadFailure } from "@/modules/files/image-upload";
import { prepareImageForUpload } from "@/modules/files/prepare-image-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { BrandingColorField } from "./branding-color-field";
import { FocalPointEditor } from "./focal-point-editor";
import { InviteHeroLivePreview } from "./invite-hero-live-preview";
import { MoreOptions } from "./more-options";

type BannerSettings = {
  mode: EmailHeroBackgroundMode;
  gradientStyle: EmailHeroGradientStyle;
  blur: number;
  focalX: number;
  focalY: number;
  zoom: number;
};

type HeroSettings = {
  enabled: boolean;
  /** Source photo for hero IMAGE mode (not the composed PNG). */
  photoUrl: string | null;
  backgroundMode: EmailHeroBackgroundMode;
  gradientStyle: EmailHeroGradientStyle;
  blur: number;
  overlay: number;
  focalX: number;
  focalY: number;
  zoom: number;
  eyebrow: string;
  title: string;
  detail: string;
  closing: string;
  /** Cached composed invitation hero PNG. */
  imageUrl: string | null;
};

type HeadingSettings = {
  color: string | null;
  font: BrandHeadingFont;
  size: BrandHeadingSize;
  weight: BrandHeadingWeight;
  tracking: BrandHeadingTracking;
  align: BrandHeadingAlign;
  lineHeight: BrandHeadingLineHeight;
  eyebrowUppercase: boolean;
};

function CharCount({
  value,
  max,
}: {
  value: string;
  max: number;
}) {
  const len = value.length;
  const near = len >= max * 0.9;
  return (
    <span
      className={cn(
        "tabular-nums text-[11px]",
        near ? "font-medium text-amber-700" : "text-slate-400",
        len >= max && "text-danger",
      )}
      aria-live="polite"
    >
      {len}/{max}
    </span>
  );
}

type TabId = "identity" | "banner" | "hero" | "type";
type PreviewMode = "public" | "hero";
type PreviewViewport = "desktop" | "mobile";

const TABS: { id: TabId; label: string; icon: typeof Palette }[] = [
  { id: "identity", label: "Identity", icon: Palette },
  { id: "banner", label: "Page banner", icon: ImageIcon },
  { id: "hero", label: "Invite hero", icon: Sparkles },
  { id: "type", label: "Typography", icon: Type },
];

const MODE_OPTIONS: {
  id: EmailHeroBackgroundMode;
  label: string;
  description: string;
}[] = [
  {
    id: "IMAGE",
    label: "Photo",
    description: "Upload and frame a wide image",
  },
  {
    id: "COLOR",
    label: "Colour",
    description: "Solid brand colour fill",
  },
  {
    id: "GRADIENT",
    label: "Gradient",
    description: "Soft decorative backdrop",
  },
];

function AuroraToggle({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-150",
        checked ? "bg-indigo-600" : "bg-slate-200",
        disabled && "opacity-50",
      )}
    >
      <span
        className={cn(
          "inline-block size-5 translate-x-1 rounded-full bg-white shadow-sm transition-transform duration-150",
          checked && "translate-x-6",
        )}
      />
    </button>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <Label htmlFor={htmlFor} className="mb-1.5">
        {label}
      </Label>
      {children}
      {hint ? (
        <p className="mt-1 text-[11px] leading-snug text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}

function FieldsetLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-400">
      {children}
    </p>
  );
}

function SectionCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold tracking-tight text-slate-900">
            {title}
          </h2>
          {description ? (
            <p className="mt-0.5 max-w-xl text-[12.5px] leading-snug text-slate-500">
              {description}
            </p>
          ) : null}
        </div>
        {action}
      </div>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function ModePicker({
  value,
  disabled,
  onChange,
}: {
  value: EmailHeroBackgroundMode;
  disabled?: boolean;
  onChange: (mode: EmailHeroBackgroundMode) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Background style"
      className="grid grid-cols-3 gap-0.5 rounded-full bg-slate-100 p-[3px]"
    >
      {MODE_OPTIONS.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={active}
            title={opt.description}
            disabled={disabled}
            onClick={() => onChange(opt.id)}
            className={cn(
              "h-8 rounded-full px-3 text-center text-xs font-semibold transition-all duration-150",
              active
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-800",
              disabled && "opacity-50",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function GradientPicker({
  value,
  disabled,
  onChange,
}: {
  value: EmailHeroGradientStyle;
  disabled?: boolean;
  onChange: (g: EmailHeroGradientStyle) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {EMAIL_HERO_GRADIENTS.map((g) => {
        const active = value === g.id;
        return (
          <button
            key={g.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(g.id)}
            className={cn(
              "overflow-hidden rounded-lg text-left transition-all duration-150",
              active
                ? "ring-2 ring-indigo-600 ring-offset-1"
                : "ring-1 ring-slate-200/80 hover:ring-slate-300",
              disabled && "opacity-50",
            )}
          >
            <div className="h-12 w-full" style={{ background: g.css }} />
            <div className="bg-white px-2.5 py-1.5">
              <p className="text-[11px] font-semibold text-slate-700">
                {g.label}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function RangeControl({
  id,
  label,
  value,
  display,
  min,
  max,
  disabled,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  disabled?: boolean;
  onChange: (n: number) => void;
  hint: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <Label htmlFor={id} className="mb-0">
          {label}
        </Label>
        <span className="font-mono text-[11px] tabular-nums text-slate-400">
          {display}
        </span>
      </div>
      <Slider
        id={id}
        min={min}
        max={max}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <p className="mt-1.5 text-[11px] text-slate-400">{hint}</p>
    </div>
  );
}

function PhotoActions({
  canEdit,
  pending,
  hasPhoto,
  onUpload,
  onRemove,
}: {
  canEdit: boolean;
  pending: boolean;
  hasPhoto: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
}) {
  if (!canEdit) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      <label className="inline-flex cursor-pointer">
        <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-indigo-600 px-3 text-xs font-semibold text-white shadow-[0_4px_12px_rgba(79,70,229,0.28)] transition-colors duration-150 hover:bg-indigo-700">
          <Upload className="size-3.5" strokeWidth={2} aria-hidden />
          {pending ? "Uploading…" : hasPhoto ? "Replace photo" : "Upload photo"}
        </span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          disabled={pending}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) onUpload(file);
          }}
        />
      </label>
      {hasPhoto ? (
        <button
          type="button"
          disabled={pending}
          onClick={onRemove}
          className="inline-flex h-8 items-center rounded-full px-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100"
        >
          Remove
        </button>
      ) : null}
    </div>
  );
}

function pickImageFile(files: FileList | null | undefined): File | null {
  if (!files?.length) return null;
  for (const file of Array.from(files)) {
    if (
      file.type === "image/jpeg" ||
      file.type === "image/png" ||
      file.type === "image/webp"
    ) {
      return file;
    }
  }
  return null;
}

function BackgroundEditor({
  mode,
  gradientStyle,
  blur,
  overlay,
  focalX,
  focalY,
  zoom,
  canEdit,
  pending,
  hasPhoto,
  photoUrl,
  localPreview,
  aspect,
  blurId,
  blurHint,
  onModeChange,
  onGradientChange,
  onBlurChange,
  onOverlayChange,
  onFocalChange,
  onZoomChange,
  onUpload,
  onRemove,
}: {
  mode: EmailHeroBackgroundMode;
  gradientStyle: EmailHeroGradientStyle;
  blur: number;
  overlay?: number;
  focalX: number;
  focalY: number;
  zoom: number;
  canEdit: boolean;
  pending: boolean;
  hasPhoto: boolean;
  photoUrl: string | null;
  localPreview: string | null;
  aspect: "banner" | "hero";
  blurId: string;
  blurHint: string;
  onModeChange: (m: EmailHeroBackgroundMode) => void;
  onGradientChange: (g: EmailHeroGradientStyle) => void;
  onBlurChange: (n: number) => void;
  onOverlayChange?: (n: number) => void;
  onFocalChange: (x: number, y: number) => void;
  onZoomChange: (zoom: number) => void;
  onUpload: (file: File) => void;
  onRemove: () => void;
}) {
  const displayPhoto = localPreview ?? photoUrl;
  const [dropping, setDropping] = useState(false);
  const [photoWidth, setPhotoWidth] = useState<number | null>(null);
  const showOverlay =
    aspect === "hero" && overlay != null && onOverlayChange != null;
  const overlayControl = showOverlay ? (
    <RangeControl
      id={`${blurId}-overlay`}
      label="Darkness"
      value={overlay}
      display={`${overlay}%`}
      min={0}
      max={100}
      disabled={!canEdit}
      onChange={onOverlayChange}
      hint="Dark veil over the background so text stays readable."
    />
  ) : null;

  useEffect(() => {
    if (!displayPhoto) {
      setPhotoWidth(null);
      return;
    }
    let cancelled = false;
    const img = new window.Image();
    img.onload = () => {
      if (!cancelled) setPhotoWidth(img.naturalWidth);
    };
    img.onerror = () => {
      if (!cancelled) setPhotoWidth(null);
    };
    img.src = displayPhoto;
    return () => {
      cancelled = true;
    };
  }, [displayPhoto]);

  const lowRes =
    photoWidth != null && photoWidth > 0 && photoWidth < PHOTO_MIN_RECOMMENDED_WIDTH;

  function acceptDrop(files: FileList | null | undefined) {
    const file = pickImageFile(files);
    if (file && canEdit && !pending) onUpload(file);
  }

  return (
    <div className="space-y-4">
      <div>
        <FieldsetLabel>Background style</FieldsetLabel>
        <ModePicker
          value={mode}
          disabled={!canEdit || pending}
          onChange={onModeChange}
        />
      </div>

      {mode === "IMAGE" ? (
        <div
          className="space-y-3"
          onDragEnter={(e) => {
            e.preventDefault();
            if (canEdit && !pending) setDropping(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            if (canEdit && !pending) setDropping(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            if (e.currentTarget === e.target) setDropping(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDropping(false);
            acceptDrop(e.dataTransfer.files);
          }}
        >
          {displayPhoto ? (
            <>
              <div
                className={cn(
                  "rounded-xl transition-[box-shadow,ring-color] duration-150",
                  dropping &&
                    "ring-2 ring-indigo-400 ring-offset-2 ring-offset-white",
                )}
              >
                <FocalPointEditor
                  imageUrl={displayPhoto}
                  focalX={focalX}
                  focalY={focalY}
                  zoom={zoom}
                  blur={blur}
                  aspect={aspect}
                  disabled={!canEdit || pending}
                  onChange={onFocalChange}
                  onZoomChange={onZoomChange}
                >
                  <RangeControl
                    id={blurId}
                    label="Softness"
                    value={blur}
                    display={blur === 0 ? "Sharp" : `${blur}px`}
                    min={0}
                    max={24}
                    disabled={!canEdit}
                    onChange={onBlurChange}
                    hint={blurHint}
                  />
                  {overlayControl}
                </FocalPointEditor>
              </div>
              {lowRes ? (
                <div
                  role="status"
                  className="flex gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-[12.5px] text-amber-900 ring-1 ring-amber-100"
                >
                  <AlertTriangle
                    className="mt-0.5 size-3.5 shrink-0 text-amber-600"
                    strokeWidth={2}
                    aria-hidden
                  />
                  <p>
                    This photo is only {photoWidth}px wide. For sharp email and
                    page banners, use at least {PHOTO_MIN_RECOMMENDED_WIDTH}px
                    wide (about 1200×630).
                  </p>
                </div>
              ) : null}
              {dropping && canEdit && !pending ? (
                <p className="text-center text-[12px] font-medium text-indigo-600">
                  Drop to replace photo
                </p>
              ) : null}
            </>
          ) : (
            <label
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center rounded-lg bg-slate-50 px-5 py-8 text-center ring-1 ring-dashed transition-colors duration-150",
                dropping
                  ? "bg-indigo-50/70 ring-indigo-400"
                  : "ring-slate-200 hover:bg-indigo-50/40 hover:ring-indigo-300",
                (!canEdit || pending) && "pointer-events-none opacity-60",
              )}
            >
              <div className="mb-2.5 flex size-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                <ImageIcon className="size-4" strokeWidth={1.75} aria-hidden />
              </div>
              <p className="text-[13px] font-semibold text-slate-900">
                {dropping ? "Drop photo here" : "Drop a photo here"}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                JPEG, PNG, or WebP · ~1200×630
              </p>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                disabled={!canEdit || pending}
                onChange={(e) => {
                  const file = pickImageFile(e.target.files);
                  e.target.value = "";
                  if (file) onUpload(file);
                }}
              />
            </label>
          )}
          <PhotoActions
            canEdit={canEdit}
            pending={pending}
            hasPhoto={hasPhoto}
            onUpload={onUpload}
            onRemove={onRemove}
          />
          {!displayPhoto && overlayControl ? (
            <div className="rounded-lg bg-slate-50 px-3 py-2.5">
              {overlayControl}
            </div>
          ) : null}
        </div>
      ) : null}

      {mode === "COLOR" ? (
        <div className="space-y-3">
          <p className="rounded-lg bg-slate-50 px-3.5 py-2.5 text-[12.5px] text-slate-600">
            Uses your brand colour from Identity as a solid backdrop.
          </p>
          {overlayControl}
        </div>
      ) : null}

      {mode === "GRADIENT" ? (
        <div className="space-y-3">
          <div>
            <FieldsetLabel>Gradient</FieldsetLabel>
            <GradientPicker
              value={gradientStyle}
              disabled={!canEdit || pending}
              onChange={onGradientChange}
            />
            <p className="mt-1.5 text-[11px] text-slate-400">
              Decorative only — buttons and links stay brand colour.
            </p>
          </div>
          {overlayControl}
        </div>
      ) : null}
    </div>
  );
}

function PublicBannerPreview({
  mode,
  accent,
  gradientStyle,
  photoUrl,
  focalX,
  focalY,
  zoom,
  blur,
  logoUrl,
  eventName,
  headingColor,
  headingFont,
  headingSize,
  headingWeight,
  headingTracking,
  headingAlign,
  headingLineHeight,
}: {
  mode: EmailHeroBackgroundMode;
  accent: string;
  gradientStyle: EmailHeroGradientStyle;
  photoUrl: string | null;
  focalX: number;
  focalY: number;
  zoom: number;
  blur: number;
  logoUrl: string | null;
  eventName: string;
  headingColor: string;
  headingFont: BrandHeadingFont;
  headingSize: BrandHeadingSize;
  headingWeight: BrandHeadingWeight;
  headingTracking: BrandHeadingTracking;
  headingAlign: BrandHeadingAlign;
  headingLineHeight: BrandHeadingLineHeight;
}) {
  const gradient = EMAIL_HERO_GRADIENTS.find((g) => g.id === gradientStyle);
  const zoomPct = parsePhotoZoom(zoom, 100);
  const textAlign = brandHeadingCssTextAlign(headingAlign);
  let strip: ReactNode = (
    <div className="h-20 w-full" style={{ backgroundColor: accent }} />
  );
  if (mode === "GRADIENT") {
    strip = (
      <div
        className="h-24 w-full"
        style={{ background: gradient?.css ?? accent }}
      />
    );
  } else if (mode === "IMAGE" && photoUrl) {
    const scale = (zoomPct / 100) * (blur > 0 ? 1.05 : 1);
    strip = (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt=""
        className="h-28 w-full object-cover"
        style={{
          objectPosition: `${focalX}% ${focalY}%`,
          filter: blur > 0 ? `blur(${Math.min(blur, 8)}px)` : undefined,
          transform: `scale(${scale})`,
          transformOrigin: `${focalX}% ${focalY}%`,
        }}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-100">
      <div className="overflow-hidden">{strip}</div>
      <div className="space-y-2 p-4" style={{ textAlign }}>
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            className={cn(
              "max-h-8 max-w-[120px] object-contain",
              textAlign === "center" && "mx-auto",
            )}
          />
        ) : null}
        <p
          style={{
            fontSize: brandHeadingPublicTitlePx(headingSize),
            color: headingColor,
            fontFamily: brandHeadingCssFamily(headingFont),
            fontWeight: brandHeadingCssWeight(headingWeight),
            letterSpacing: brandHeadingCssTracking(headingTracking),
            lineHeight: brandHeadingCssLineHeight(headingLineHeight),
          }}
        >
          {eventName}
        </p>
        <p className="text-xs text-slate-500">Public invitation preview</p>
      </div>
    </div>
  );
}

export function BrandingPanel({
  orgSlug,
  eventId,
  canEdit,
  branding,
  emailAccentColor,
  logoUrl,
  bannerUrl,
  eventName,
  banner,
  hero,
  heading,
  inviteHighlights: inviteHighlightsProp,
}: {
  orgSlug: string;
  eventId: string;
  canEdit: boolean;
  branding: EmailBranding;
  emailAccentColor: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  eventName: string;
  banner: BannerSettings;
  hero: HeroSettings;
  heading: HeadingSettings;
  /** Invitation email body bullets (one per line). */
  inviteHighlights?: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("identity");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("public");
  const [previewViewport, setPreviewViewport] =
    useState<PreviewViewport>("desktop");
  const [accent, setAccent] = useState(
    emailAccentColor ?? branding.accentColor,
  );
  const [bannerMode, setBannerMode] = useState(banner.mode);
  const [bannerGradient, setBannerGradient] = useState(banner.gradientStyle);
  const [bannerBlur, setBannerBlur] = useState(banner.blur);
  const [bannerFocalX, setBannerFocalX] = useState(banner.focalX);
  const [bannerFocalY, setBannerFocalY] = useState(banner.focalY);
  const [bannerZoom, setBannerZoom] = useState(banner.zoom);
  const [heroEnabled, setHeroEnabled] = useState(hero.enabled);
  const [backgroundMode, setBackgroundMode] = useState(hero.backgroundMode);
  const [gradientStyle, setGradientStyle] = useState(hero.gradientStyle);
  const [heroBlur, setHeroBlur] = useState(hero.blur);
  const [heroOverlay, setHeroOverlay] = useState(hero.overlay);
  const [heroFocalX, setHeroFocalX] = useState(hero.focalX);
  const [heroFocalY, setHeroFocalY] = useState(hero.focalY);
  const [heroZoom, setHeroZoom] = useState(hero.zoom);
  const [justSaved, setJustSaved] = useState(false);
  const [headingColor, setHeadingColor] = useState(heading.color ?? "#FFFFFF");
  const [headingFont, setHeadingFont] = useState(
    normalizeBrandHeadingFont(heading.font),
  );
  const [headingSize, setHeadingSize] = useState(heading.size);
  const [sizeDraft, setSizeDraft] = useState(String(heading.size));
  const [headingWeight, setHeadingWeight] = useState(heading.weight);
  const [headingTracking, setHeadingTracking] = useState(heading.tracking);
  const [headingAlign, setHeadingAlign] = useState(heading.align);
  const [headingLineHeight, setHeadingLineHeight] = useState(
    heading.lineHeight,
  );
  const [eyebrowUppercase, setEyebrowUppercase] = useState(
    heading.eyebrowUppercase,
  );
  const [heroEyebrow, setHeroEyebrow] = useState(hero.eyebrow);
  const [heroTitle, setHeroTitle] = useState(hero.title);
  const [heroDetail, setHeroDetail] = useState(hero.detail);
  const [heroClosing, setHeroClosing] = useState(hero.closing);
  const [inviteHighlights, setInviteHighlights] = useState(
    inviteHighlightsProp ?? "",
  );
  const [localBannerPreview, setLocalBannerPreview] = useState<string | null>(
    null,
  );
  const [localHeroPhotoPreview, setLocalHeroPhotoPreview] = useState<
    string | null
  >(null);
  const [logoPalette, setLogoPalette] = useState<string[]>([]);
  const [recentColours, setRecentColours] = useState<string[]>([]);
  const toast = useToast();
  const [pending, start] = useTransition();

  useEffect(() => {
    setRecentColours(readRecentColours());
  }, []);

  useEffect(() => {
    const url = branding.logoUrl ?? logoUrl;
    if (!url) {
      setLogoPalette([]);
      return;
    }
    let cancelled = false;
    void extractLogoColors(url).then((colours) => {
      if (!cancelled) setLogoPalette(colours);
    });
    return () => {
      cancelled = true;
    };
  }, [branding.logoUrl, logoUrl]);

  useEffect(() => {
    setBannerMode(banner.mode);
    setBannerGradient(banner.gradientStyle);
    setBannerBlur(banner.blur);
    setBannerFocalX(banner.focalX);
    setBannerFocalY(banner.focalY);
    setBannerZoom(banner.zoom);
    setHeroEnabled(hero.enabled);
    setBackgroundMode(hero.backgroundMode);
    setGradientStyle(hero.gradientStyle);
    setHeroBlur(hero.blur);
    setHeroOverlay(hero.overlay);
    setHeroFocalX(hero.focalX);
    setHeroFocalY(hero.focalY);
    setHeroZoom(hero.zoom);
    setHeadingColor(heading.color ?? "#FFFFFF");
    setHeadingFont(normalizeBrandHeadingFont(heading.font));
    setHeadingSize(heading.size);
    setSizeDraft(String(heading.size));
    setHeadingWeight(heading.weight);
    setHeadingTracking(heading.tracking);
    setHeadingAlign(heading.align);
    setHeadingLineHeight(heading.lineHeight);
    setEyebrowUppercase(heading.eyebrowUppercase);
    setHeroEyebrow(hero.eyebrow);
    setHeroTitle(hero.title);
    setHeroDetail(hero.detail);
    setHeroClosing(hero.closing);
    setInviteHighlights(inviteHighlightsProp ?? "");
    setAccent(emailAccentColor ?? branding.accentColor);
  }, [
    banner.mode,
    banner.gradientStyle,
    banner.blur,
    banner.focalX,
    banner.focalY,
    banner.zoom,
    hero.enabled,
    hero.backgroundMode,
    hero.gradientStyle,
    hero.blur,
    hero.overlay,
    hero.focalX,
    hero.focalY,
    hero.zoom,
    hero.eyebrow,
    hero.title,
    hero.detail,
    hero.closing,
    inviteHighlightsProp,
    heading.color,
    heading.font,
    heading.size,
    heading.weight,
    heading.tracking,
    heading.align,
    heading.lineHeight,
    heading.eyebrowUppercase,
    emailAccentColor,
    branding.accentColor,
  ]);

  useEffect(() => {
    return () => {
      if (localBannerPreview) URL.revokeObjectURL(localBannerPreview);
    };
  }, [localBannerPreview]);

  useEffect(() => {
    return () => {
      if (localHeroPhotoPreview) URL.revokeObjectURL(localHeroPhotoPreview);
    };
  }, [localHeroPhotoPreview]);

  const savedSnapshot = useMemo(
    () =>
      JSON.stringify({
        accent: emailAccentColor ?? branding.accentColor,
        bannerMode: banner.mode,
        bannerGradient: banner.gradientStyle,
        bannerBlur: banner.blur,
        bannerFocalX: banner.focalX,
        bannerFocalY: banner.focalY,
        bannerZoom: banner.zoom,
        backgroundMode: hero.backgroundMode,
        gradientStyle: hero.gradientStyle,
        heroBlur: hero.blur,
        heroOverlay: hero.overlay,
        heroFocalX: hero.focalX,
        heroFocalY: hero.focalY,
        heroZoom: hero.zoom,
        headingColor: heading.color ?? "#FFFFFF",
        headingFont: normalizeBrandHeadingFont(heading.font),
        headingSize: heading.size,
        headingWeight: heading.weight,
        headingTracking: heading.tracking,
        headingAlign: heading.align,
        headingLineHeight: heading.lineHeight,
        eyebrowUppercase: heading.eyebrowUppercase,
        heroEyebrow: hero.eyebrow,
        heroTitle: hero.title,
        heroDetail: hero.detail,
        heroClosing: hero.closing,
        inviteHighlights: inviteHighlightsProp ?? "",
      }),
    [
      emailAccentColor,
      branding.accentColor,
      banner,
      hero,
      heading,
      inviteHighlightsProp,
    ],
  );

  const currentSnapshot = useMemo(
    () =>
      JSON.stringify({
        accent,
        bannerMode,
        bannerGradient,
        bannerBlur,
        bannerFocalX,
        bannerFocalY,
        bannerZoom,
        backgroundMode,
        gradientStyle,
        heroBlur,
        heroOverlay,
        heroFocalX,
        heroFocalY,
        heroZoom,
        headingColor,
        headingFont,
        headingSize,
        headingWeight,
        headingTracking,
        headingAlign,
        headingLineHeight,
        eyebrowUppercase,
        heroEyebrow,
        heroTitle,
        heroDetail,
        heroClosing,
        inviteHighlights,
      }),
    [
      accent,
      bannerMode,
      bannerGradient,
      bannerBlur,
      bannerFocalX,
      bannerFocalY,
      bannerZoom,
      backgroundMode,
      gradientStyle,
      heroBlur,
      heroOverlay,
      heroFocalX,
      heroFocalY,
      heroZoom,
      headingColor,
      headingFont,
      headingSize,
      headingWeight,
      headingTracking,
      headingAlign,
      headingLineHeight,
      eyebrowUppercase,
      heroEyebrow,
      heroTitle,
      heroDetail,
      heroClosing,
      inviteHighlights,
    ],
  );

  const dirty = currentSnapshot !== savedSnapshot;

  useEffect(() => {
    if (dirty) setJustSaved(false);
  }, [dirty]);

  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const displayLogoUrl = branding.logoUrl ?? logoUrl;
  const hasLogo = Boolean(displayLogoUrl);
  const hasBanner = Boolean(bannerUrl);
  const hasHeroPhoto = Boolean(hero.photoUrl);
  const savedHeroUrl = hero.imageUrl;
  const previewBannerPhoto = localBannerPreview ?? bannerUrl;

  const previewDetailLines = useMemo(() => {
    return heroDetail
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
  }, [heroDetail]);

  function rememberAccent(hex: string) {
    setAccent(hex);
    setRecentColours(rememberRecentColour(hex));
  }

  function uploadBannerFile(file: File) {
    if (localBannerPreview) URL.revokeObjectURL(localBannerPreview);
    setLocalBannerPreview(URL.createObjectURL(file));
    setBannerMode("IMAGE");
    start(async () => {
      try {
        const prepared = await prepareImageForUpload(file, "background");
        if (!prepared.ok) {
          toast.error(prepared.error);
          return;
        }
        const formData = new FormData();
        formData.set("banner", prepared.file);
        await uploadEmailBanner(orgSlug, eventId, formData);
        toast.success("Page banner photo uploaded.");
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Could not upload banner",
        );
      }
    });
  }

  function removeBanner() {
    start(async () => {
      try {
        await removeEmailBanner(orgSlug, eventId);
        setLocalBannerPreview(null);
        toast.success("Banner photo removed.");
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Could not remove banner",
        );
      }
    });
  }

  function uploadHeroPhotoFile(file: File) {
    if (localHeroPhotoPreview) URL.revokeObjectURL(localHeroPhotoPreview);
    setLocalHeroPhotoPreview(URL.createObjectURL(file));
    setBackgroundMode("IMAGE");
    start(async () => {
      try {
        const prepared = await prepareImageForUpload(file, "background");
        if (!prepared.ok) {
          toast.error(prepared.error);
          return;
        }
        const formData = new FormData();
        formData.set("heroPhoto", prepared.file);
        formData.set("enableHero", heroEnabled ? "true" : "false");
        await uploadEmailHeroPhoto(orgSlug, eventId, formData);
        toast.success(
          heroEnabled
            ? "Hero photo uploaded. Invitation hero rebuilt."
            : "Hero photo uploaded.",
        );
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Could not upload hero photo",
        );
      }
    });
  }

  function removeHeroPhoto() {
    start(async () => {
      try {
        await removeEmailHeroPhoto(orgSlug, eventId);
        setLocalHeroPhotoPreview(null);
        toast.success("Hero photo removed.");
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Could not remove hero photo",
        );
      }
    });
  }

  function onHeroToggle(next: boolean) {
    setHeroEnabled(next);
    if (!canEdit) return;
    start(async () => {
      try {
        await setInvitationHeroEnabled(orgSlug, eventId, next);
        toast.success(
          next ? "Invitation hero enabled." : "Invitation hero disabled.",
        );
        router.refresh();
      } catch (e) {
        setHeroEnabled(!next);
        toast.error(
          e instanceof Error ? e.message : "Could not update invitation hero",
        );
      }
    });
  }

  function discardBranding() {
    setAccent(emailAccentColor ?? branding.accentColor);
    setBannerMode(banner.mode);
    setBannerGradient(banner.gradientStyle);
    setBannerBlur(banner.blur);
    setBannerFocalX(banner.focalX);
    setBannerFocalY(banner.focalY);
    setBannerZoom(banner.zoom);
    setBackgroundMode(hero.backgroundMode);
    setGradientStyle(hero.gradientStyle);
    setHeroBlur(hero.blur);
    setHeroOverlay(hero.overlay);
    setHeroFocalX(hero.focalX);
    setHeroFocalY(hero.focalY);
    setHeroZoom(hero.zoom);
    setHeadingColor(heading.color ?? "#FFFFFF");
    setHeadingFont(normalizeBrandHeadingFont(heading.font));
    setHeadingSize(heading.size);
    setSizeDraft(String(heading.size));
    setHeadingWeight(heading.weight);
    setHeadingTracking(heading.tracking);
    setHeadingAlign(heading.align);
    setHeadingLineHeight(heading.lineHeight);
    setEyebrowUppercase(heading.eyebrowUppercase);
    setHeroEyebrow(hero.eyebrow);
    setHeroTitle(hero.title);
    setHeroDetail(hero.detail);
    setHeroClosing(hero.closing);
    setInviteHighlights(inviteHighlightsProp ?? "");
    setJustSaved(false);
  }

  function saveBranding() {
    if (!canEdit || pending) return;
    const formData = new FormData();
    formData.set("emailAccentColor", accent);
    formData.set("emailBannerMode", bannerMode);
    formData.set("emailBannerGradientStyle", bannerGradient);
    formData.set("emailBannerBlur", String(bannerBlur));
    formData.set("emailBannerFocalX", String(bannerFocalX));
    formData.set("emailBannerFocalY", String(bannerFocalY));
    formData.set("emailBannerZoom", String(bannerZoom));
    formData.set("emailHeroOverlayEnabled", heroEnabled ? "true" : "false");
    formData.set("emailHeroBackgroundMode", backgroundMode);
    formData.set("emailHeroGradientStyle", gradientStyle);
    formData.set("emailHeroBlur", String(heroBlur));
    formData.set("emailHeroOverlay", String(heroOverlay));
    formData.set("emailHeroFocalX", String(heroFocalX));
    formData.set("emailHeroFocalY", String(heroFocalY));
    formData.set("emailHeroZoom", String(heroZoom));
    formData.set("brandHeadingColor", headingColor);
    formData.set("brandHeadingFont", headingFont);
    formData.set("brandHeadingSize", formatBrandHeadingSize(headingSize));
    formData.set("brandHeadingWeight", headingWeight);
    formData.set("brandHeadingTracking", headingTracking);
    formData.set("brandHeadingAlign", headingAlign);
    formData.set("brandHeadingLineHeight", headingLineHeight);
    formData.set(
      "brandHeadingEyebrowUppercase",
      eyebrowUppercase ? "true" : "false",
    );
    formData.set("emailHeroEyebrow", heroEyebrow.slice(0, HERO_EYEBROW_MAX));
    formData.set("emailHeroTitle", heroTitle.slice(0, HERO_TITLE_MAX));
    formData.set("emailHeroDetail", heroDetail);
    formData.set("emailHeroClosing", heroClosing);
    formData.set(
      "emailInviteHighlights",
      inviteHighlights.slice(0, INVITE_HIGHLIGHT_MAX_RAW),
    );
    start(async () => {
      try {
        await saveEmailBranding(orgSlug, eventId, formData);
        setJustSaved(true);
        rememberAccent(accent);
        toast.success(
          heroEnabled
            ? "Branding saved. Invitation hero updated for emails."
            : "Branding saved.",
        );
        router.refresh();
      } catch (e) {
        setJustSaved(false);
        toast.error(
          e instanceof Error ? e.message : "Could not save email branding",
        );
      }
    });
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "s") return;
      e.preventDefault();
      if (canEdit && dirty && !pending) saveBranding();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // saveBranding closes over latest field values via this snapshot key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canEdit, dirty, pending, currentSnapshot]);

  const showHeroPreview =
    previewMode === "hero" || (tab === "hero" && heroEnabled);
  const publicHeadingColor =
    headingColor === "#FFFFFF" ? "#0F172A" : headingColor;

  const contrastBackground = useMemo(() => {
    if (!showHeroPreview) return "#FFFFFF";
    if (backgroundMode === "COLOR") return accent;
    if (backgroundMode === "GRADIENT") {
      const g = gradientPreset(gradientStyle);
      return blendHex(g.top, g.bottom, 0.55);
    }
    return photoOverlayBackground(heroOverlay);
  }, [
    showHeroPreview,
    backgroundMode,
    accent,
    gradientStyle,
    heroOverlay,
  ]);

  const contrastForeground = showHeroPreview
    ? headingColor
    : publicHeadingColor;
  const contrastIssue = !headingContrastOk(
    contrastForeground,
    contrastBackground,
  );
  const contrastSuggestion = suggestHeadingColor(contrastBackground);

  return (
    <div className="pb-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          title="Branding"
          description="Public pages and invitation emails. Sender stays Bizcon RSVP."
        />
        {canEdit ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {dirty ? (
              <>
                <p className="hidden text-xs font-medium text-amber-700 sm:block">
                  Unsaved changes
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={pending}
                  onClick={discardBranding}
                  className="h-9"
                >
                  Discard
                </Button>
              </>
            ) : justSaved ? (
              <p className="text-xs font-medium text-success">Saved</p>
            ) : null}
            <Button
              disabled={pending || !dirty}
              onClick={saveBranding}
              className="shrink-0"
              title="Save (⌘S)"
            >
              {pending ? "Saving…" : "Save branding"}
            </Button>
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Branding sections"
          className="inline-flex max-w-full flex-wrap gap-1 rounded-full bg-slate-100 p-1"
        >
          {TABS.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setTab(item.id);
                  if (item.id === "hero") setPreviewMode("hero");
                  if (item.id === "banner" || item.id === "identity") {
                    setPreviewMode("public");
                  }
                }}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors duration-150",
                  active
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900",
                )}
              >
                <Icon className="size-3.5" strokeWidth={2} aria-hidden />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 grid items-start gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
        <div className="min-w-0 space-y-4">
          {tab === "identity" ? (
            <SectionCard
              title="Logo & brand colour"
              description="Foundation for emails, badges, and public pages."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-slate-50 p-3.5">
                  <FieldsetLabel>Logo</FieldsetLabel>
                  <div className="flex min-h-[96px] items-center justify-center rounded-lg bg-white p-4 ring-1 ring-slate-100">
                    {hasLogo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={displayLogoUrl ?? ""}
                        alt="Event logo"
                        className="max-h-12 max-w-full object-contain"
                      />
                    ) : (
                      <div className="text-center">
                        <p className="text-[13px] font-medium text-slate-500">
                          No logo
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          PNG, JPEG, or WebP
                        </p>
                      </div>
                    )}
                  </div>
                  {canEdit ? (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      <label className="inline-flex cursor-pointer">
                        <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-indigo-600 px-3 text-xs font-semibold text-white shadow-[0_4px_12px_rgba(79,70,229,0.28)] hover:bg-indigo-700">
                          <Upload className="size-3.5" aria-hidden />
                          {pending
                            ? "Working…"
                            : hasLogo
                              ? "Replace"
                              : "Upload"}
                        </span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="sr-only"
                          disabled={pending}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = "";
                            if (!file) return;
                            start(async () => {
                              try {
                                const prepared = await prepareImageForUpload(
                                  file,
                                  "logo",
                                );
                                if (!prepared.ok) {
                                  toast.error(prepared.error);
                                  return;
                                }
                                const formData = new FormData();
                                formData.set("logo", prepared.file);
                                const result = await uploadEventLogoAction(
                                  orgSlug,
                                  eventId,
                                  formData,
                                );
                                if (!result.ok) {
                                  toast.error(result.error);
                                  return;
                                }
                                toast.success("Event logo uploaded.");
                                router.refresh();
                              } catch (err) {
                                toast.error(
                                  friendlyUploadFailure(
                                    err,
                                    "logo",
                                    "Could not upload logo",
                                  ),
                                );
                              }
                            });
                          }}
                        />
                      </label>
                      {hasLogo ? (
                        <button
                          type="button"
                          disabled={pending}
                          className="inline-flex h-8 items-center rounded-full px-3 text-xs font-semibold text-slate-600 hover:bg-white"
                          onClick={() => {
                            start(async () => {
                              try {
                                const result = await removeEventLogoAction(
                                  orgSlug,
                                  eventId,
                                );
                                if (!result.ok) {
                                  toast.error(result.error);
                                  return;
                                }
                                toast.success("Event logo removed.");
                                router.refresh();
                              } catch (err) {
                                toast.error(
                                  err instanceof Error
                                    ? err.message
                                    : "Could not remove logo",
                                );
                              }
                            });
                          }}
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="rounded-lg bg-slate-50 p-3.5">
                  <BrandingColorField
                    label="Brand colour"
                    value={accent}
                    onChange={rememberAccent}
                    disabled={!canEdit}
                    swatches={[]}
                    logoSuggestions={logoPalette.map((hex, i) => ({
                      label: `Logo colour ${i + 1}`,
                      value: hex,
                    }))}
                    recent={recentColours.map((hex) => ({
                      label: hex,
                      value: hex,
                    }))}
                    hint="Buttons, accents, and solid fills. Logo colours are suggestions from your uploaded logo."
                  />
                </div>
              </div>
            </SectionCard>
          ) : null}

          {tab === "banner" ? (
            <SectionCard
              title="Page banner"
              description="Strip at the top of public invitation, registration, and apply pages."
            >
              <BackgroundEditor
                mode={bannerMode}
                gradientStyle={bannerGradient}
                blur={bannerBlur}
                focalX={bannerFocalX}
                focalY={bannerFocalY}
                zoom={bannerZoom}
                canEdit={canEdit}
                pending={pending}
                hasPhoto={hasBanner}
                photoUrl={bannerUrl}
                localPreview={localBannerPreview}
                aspect="banner"
                blurId="page-banner-blur"
                blurHint="Softens the photo on public pages. 0 keeps it crisp."
                onModeChange={setBannerMode}
                onGradientChange={setBannerGradient}
                onBlurChange={setBannerBlur}
                onFocalChange={(x, y) => {
                  setBannerFocalX(x);
                  setBannerFocalY(y);
                }}
                onZoomChange={setBannerZoom}
                onUpload={uploadBannerFile}
                onRemove={removeBanner}
              />
            </SectionCard>
          ) : null}

          {tab === "hero" ? (
            <SectionCard
              title="Invitation hero"
              description="Composed image at the top of invitation emails — logo and copy baked in for reliable rendering."
              action={
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-600">
                    {heroEnabled ? "On" : "Off"}
                  </span>
                  <AuroraToggle
                    checked={heroEnabled}
                    disabled={!canEdit || pending}
                    label="Invitation hero"
                    onChange={onHeroToggle}
                  />
                </div>
              }
            >
              {heroEnabled ? (
                <>
                  <BackgroundEditor
                    mode={backgroundMode}
                    gradientStyle={gradientStyle}
                    blur={heroBlur}
                    overlay={heroOverlay}
                    focalX={heroFocalX}
                    focalY={heroFocalY}
                    zoom={heroZoom}
                    canEdit={canEdit}
                    pending={pending}
                    hasPhoto={hasHeroPhoto}
                    photoUrl={hero.photoUrl}
                    localPreview={localHeroPhotoPreview}
                    aspect="hero"
                    blurId="invite-hero-blur"
                    blurHint="Softens the photo behind email copy. 0 keeps it sharp."
                    onModeChange={setBackgroundMode}
                    onGradientChange={setGradientStyle}
                    onBlurChange={setHeroBlur}
                    onOverlayChange={setHeroOverlay}
                    onFocalChange={(x, y) => {
                      setHeroFocalX(x);
                      setHeroFocalY(y);
                    }}
                    onZoomChange={setHeroZoom}
                    onUpload={uploadHeroPhotoFile}
                    onRemove={removeHeroPhoto}
                  />

                  <div className="border-t border-slate-100 pt-4">
                    <FieldsetLabel>Hero copy</FieldsetLabel>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Eyebrow" htmlFor="emailHeroEyebrow">
                        <Input
                          id="emailHeroEyebrow"
                          value={heroEyebrow}
                          disabled={!canEdit}
                          maxLength={HERO_EYEBROW_MAX}
                          onChange={(e) =>
                            setHeroEyebrow(
                              e.target.value.slice(0, HERO_EYEBROW_MAX),
                            )
                          }
                          placeholder="You are invited to"
                        />
                        <div className="mt-1 flex justify-end">
                          <CharCount
                            value={heroEyebrow}
                            max={HERO_EYEBROW_MAX}
                          />
                        </div>
                      </Field>
                      <Field label="Title" htmlFor="emailHeroTitle">
                        <Input
                          id="emailHeroTitle"
                          value={heroTitle}
                          disabled={!canEdit}
                          maxLength={HERO_TITLE_MAX}
                          onChange={(e) =>
                            setHeroTitle(e.target.value.slice(0, HERO_TITLE_MAX))
                          }
                          placeholder={eventName}
                        />
                        <div className="mt-1 flex justify-end">
                          <CharCount value={heroTitle} max={HERO_TITLE_MAX} />
                        </div>
                      </Field>
                    </div>
                    <div className="mt-3">
                      <MoreOptions label="More copy" lessLabel="Less copy">
                        <Field
                          label="Detail lines"
                          htmlFor="emailHeroDetail"
                          hint="One line per row. Blank uses venue and dates."
                        >
                          <Textarea
                            id="emailHeroDetail"
                            value={heroDetail}
                            disabled={!canEdit}
                            onChange={(e) => setHeroDetail(e.target.value)}
                            placeholder={"12–14 May 2026\nLondon"}
                            rows={3}
                          />
                        </Field>
                        <Field label="Closing" htmlFor="emailHeroClosing">
                          <Input
                            id="emailHeroClosing"
                            value={heroClosing}
                            disabled={!canEdit}
                            onChange={(e) => setHeroClosing(e.target.value)}
                            placeholder="We look forward to welcoming you"
                          />
                        </Field>
                      </MoreOptions>
                    </div>
                  </div>
                </>
              ) : (
                <p className="rounded-lg bg-slate-50 px-3.5 py-2.5 text-[12.5px] text-slate-600">
                  Turn on the hero to compose logo and invitation copy into one
                  image. Plain emails still use your logo and brand colour.
                </p>
              )}

              <div className="border-t border-slate-100 pt-4">
                <FieldsetLabel>Email body highlights</FieldsetLabel>
                <p className="mb-2 text-[12px] text-slate-500">
                  Bullet insights in the invitation email (under the greeting).
                  Separate from hero image detail lines. One point per line.
                </p>
                <Field
                  label="Highlights"
                  htmlFor="emailInviteHighlights"
                  hint={`Up to ${INVITE_HIGHLIGHT_MAX_LINES} lines. Leave blank for a short invite.`}
                >
                  <Textarea
                    id="emailInviteHighlights"
                    value={inviteHighlights}
                    disabled={!canEdit}
                    rows={5}
                    maxLength={INVITE_HIGHLIGHT_MAX_RAW}
                    onChange={(e) =>
                      setInviteHighlights(
                        e.target.value.slice(0, INVITE_HIGHLIGHT_MAX_RAW),
                      )
                    }
                    placeholder={
                      "Discover the latest innovations in fire, safety and security technology.\nExperience technology in action through interactive demonstrations.\nConnect with industry specialists, technology partners and peers."
                    }
                  />
                  <div className="mt-1 flex justify-between gap-2 text-[11px] text-slate-400">
                    <span>
                      {parseInviteHighlights(inviteHighlights).length}/
                      {INVITE_HIGHLIGHT_MAX_LINES} lines
                    </span>
                    <CharCount
                      value={inviteHighlights}
                      max={INVITE_HIGHLIGHT_MAX_RAW}
                    />
                  </div>
                </Field>
              </div>
            </SectionCard>
          ) : null}

          {tab === "type" ? (
            <SectionCard
              title="Heading style"
              description="Shared for invitation hero text and public invite / registration headings."
            >
              <BrandingColorField
                label="Colour"
                value={headingColor}
                onChange={setHeadingColor}
                disabled={!canEdit}
                hint="White reads best on photo heroes; public pages use dark when white is chosen."
                swatches={[
                  { label: "White", value: "#FFFFFF" },
                  { label: "Dark", value: "#0F172A" },
                  { label: "Brand colour", value: accent },
                  { label: "Slate", value: "#475569" },
                  { label: "Indigo", value: "#4338CA" },
                ]}
              />
              {contrastIssue ? (
                <div className="flex flex-wrap items-center gap-2 rounded-lg bg-warning-bg px-3 py-2 text-[12.5px] text-warning">
                  <AlertTriangle
                    className="size-3.5 shrink-0"
                    strokeWidth={2}
                    aria-hidden
                  />
                  <p className="min-w-0 flex-1">
                    Low contrast on the{" "}
                    {showHeroPreview ? "email hero" : "public page"} preview.
                  </p>
                  {canEdit ? (
                    <button
                      type="button"
                      className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-warning shadow-xs ring-1 ring-amber-200/80 hover:bg-amber-50"
                      onClick={() => setHeadingColor(contrastSuggestion)}
                    >
                      Use {contrastSuggestion === "#FFFFFF" ? "white" : "dark"}
                    </button>
                  ) : null}
                </div>
              ) : null}

              <div className="border-t border-slate-100 pt-4">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9.5rem]">
                  <Field label="Font" htmlFor="brand-heading-font">
                    <Select
                      id="brand-heading-font"
                      value={headingFont}
                      disabled={!canEdit || pending}
                      onChange={(e) =>
                        setHeadingFont(
                          normalizeBrandHeadingFont(e.target.value),
                        )
                      }
                      style={{
                        fontFamily: brandHeadingCssFamily(headingFont),
                      }}
                    >
                      {BRAND_HEADING_FONTS.map((font) => (
                        <option
                          key={font.id}
                          value={font.id}
                          style={{
                            fontFamily: brandHeadingCssFamily(font.id),
                          }}
                        >
                          {font.label}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <Field label="Size" htmlFor="brand-heading-size">
                    <div className="space-y-2">
                      <div
                        className="flex overflow-hidden rounded-md bg-white ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-indigo-500/40"
                        title={`${BRAND_HEADING_SIZE_MIN}–${BRAND_HEADING_SIZE_MAX}px`}
                      >
                        <Input
                          id="brand-heading-size"
                          type="number"
                          inputMode="numeric"
                          min={BRAND_HEADING_SIZE_MIN}
                          max={BRAND_HEADING_SIZE_MAX}
                          step={1}
                          value={sizeDraft}
                          disabled={!canEdit || pending}
                          className="h-10 rounded-none border-0 bg-white pr-1 shadow-none [appearance:textfield] focus:ring-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          onChange={(e) => {
                            const raw = e.target.value;
                            setSizeDraft(raw);
                            const next = Number.parseInt(raw, 10);
                            if (Number.isFinite(next)) {
                              setHeadingSize(clampBrandHeadingSize(next));
                            }
                          }}
                          onBlur={() => {
                            const next = Number.parseInt(sizeDraft, 10);
                            const clamped = clampBrandHeadingSize(
                              Number.isFinite(next) ? next : headingSize,
                            );
                            setHeadingSize(clamped);
                            setSizeDraft(String(clamped));
                          }}
                        />
                        <span className="flex items-center bg-white px-2 text-[11px] font-medium text-slate-400">
                          px
                        </span>
                        <Select
                          aria-label="Size presets"
                          disabled={!canEdit || pending}
                          className="h-10 w-[3.75rem] shrink-0 rounded-none border-0 border-l border-slate-200 bg-slate-50 pl-2 pr-2.5 shadow-none focus:ring-0"
                          value={
                            (
                              BRAND_HEADING_SIZE_PRESETS as readonly number[]
                            ).includes(headingSize)
                              ? String(headingSize)
                              : ""
                          }
                          onChange={(e) => {
                            if (!e.target.value) return;
                            const clamped = clampBrandHeadingSize(
                              Number.parseInt(e.target.value, 10),
                            );
                            setHeadingSize(clamped);
                            setSizeDraft(String(clamped));
                          }}
                        >
                          <option value="" disabled>
                            ▾
                          </option>
                          {BRAND_HEADING_SIZE_PRESETS.map((px) => (
                            <option key={px} value={px}>
                              {px}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <Slider
                        aria-label="Heading size"
                        min={BRAND_HEADING_SIZE_MIN}
                        max={BRAND_HEADING_SIZE_MAX}
                        step={1}
                        value={headingSize}
                        disabled={!canEdit || pending}
                        onChange={(e) => {
                          const clamped = clampBrandHeadingSize(
                            Number.parseInt(e.target.value, 10),
                          );
                          setHeadingSize(clamped);
                          setSizeDraft(String(clamped));
                        }}
                      />
                    </div>
                  </Field>
                </div>

                <div className="mt-3">
                  <MoreOptions>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Weight" htmlFor="brand-heading-weight">
                        <Select
                          id="brand-heading-weight"
                          value={headingWeight}
                          disabled={!canEdit || pending}
                          onChange={(e) =>
                            setHeadingWeight(
                              e.target.value as BrandHeadingWeight,
                            )
                          }
                        >
                          {BRAND_HEADING_WEIGHTS.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              {opt.label}
                            </option>
                          ))}
                        </Select>
                      </Field>

                      <Field label="Tracking" htmlFor="brand-heading-tracking">
                        <Select
                          id="brand-heading-tracking"
                          value={headingTracking}
                          disabled={!canEdit || pending}
                          onChange={(e) =>
                            setHeadingTracking(
                              e.target.value as BrandHeadingTracking,
                            )
                          }
                        >
                          {BRAND_HEADING_TRACKING.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              {opt.label}
                            </option>
                          ))}
                        </Select>
                      </Field>

                      <Field label="Alignment" htmlFor="brand-heading-align">
                        <Select
                          id="brand-heading-align"
                          value={headingAlign}
                          disabled={!canEdit || pending}
                          onChange={(e) =>
                            setHeadingAlign(
                              e.target.value as BrandHeadingAlign,
                            )
                          }
                        >
                          {BRAND_HEADING_ALIGNS.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              {opt.label}
                            </option>
                          ))}
                        </Select>
                      </Field>

                      <Field
                        label="Line height"
                        htmlFor="brand-heading-line-height"
                      >
                        <Select
                          id="brand-heading-line-height"
                          value={headingLineHeight}
                          disabled={!canEdit || pending}
                          onChange={(e) =>
                            setHeadingLineHeight(
                              e.target.value as BrandHeadingLineHeight,
                            )
                          }
                        >
                          {BRAND_HEADING_LINE_HEIGHTS.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              {opt.label}
                            </option>
                          ))}
                        </Select>
                      </Field>
                    </div>

                    <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-slate-800">
                          Uppercase eyebrow
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Applies to invite hero and public page eyebrows.
                        </p>
                      </div>
                      <AuroraToggle
                        checked={eyebrowUppercase}
                        disabled={!canEdit || pending}
                        label="Uppercase eyebrow"
                        onChange={setEyebrowUppercase}
                      />
                    </div>
                  </MoreOptions>
                </div>
              </div>
            </SectionCard>
          ) : null}
        </div>

        <aside className="space-y-2 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-xl bg-white p-3.5 shadow-sm sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">Preview</p>
              <div className="flex flex-wrap items-center gap-1.5">
                <div
                  role="group"
                  aria-label="Preview surface"
                  className="inline-flex rounded-full bg-slate-100 p-[3px]"
                >
                  {(
                    [
                      { id: "public" as const, label: "Public" },
                      { id: "hero" as const, label: "Email" },
                    ] as const
                  ).map((opt) => {
                    const active = previewMode === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setPreviewMode(opt.id)}
                        className={cn(
                          "rounded-full px-3 py-1 text-[11px] font-semibold transition-colors",
                          active
                            ? "bg-white text-slate-900 shadow-xs"
                            : "text-slate-500 hover:text-slate-800",
                        )}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                <div
                  role="group"
                  aria-label="Preview viewport"
                  className="inline-flex rounded-full bg-slate-100 p-[3px]"
                >
                  {(
                    [
                      {
                        id: "desktop" as const,
                        label: "Desktop",
                        Icon: Monitor,
                      },
                      {
                        id: "mobile" as const,
                        label: "Mobile",
                        Icon: Smartphone,
                      },
                    ] as const
                  ).map((opt) => {
                    const active = previewViewport === opt.id;
                    const Icon = opt.Icon;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        title={opt.label}
                        aria-label={opt.label}
                        aria-pressed={active}
                        onClick={() => setPreviewViewport(opt.id)}
                        className={cn(
                          "inline-flex size-7 items-center justify-center rounded-full transition-colors",
                          active
                            ? "bg-white text-slate-900 shadow-xs"
                            : "text-slate-500 hover:text-slate-800",
                        )}
                      >
                        <Icon className="size-3.5" strokeWidth={2} aria-hidden />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div
              className={cn(
                "mt-3 transition-[max-width] duration-200",
                previewViewport === "mobile" && "mx-auto max-w-[320px]",
              )}
            >
              {showHeroPreview ? (
                <InviteHeroLivePreview
                  enabled={heroEnabled}
                  backgroundMode={backgroundMode}
                  gradientStyle={gradientStyle}
                  blur={heroBlur}
                  overlay={heroOverlay}
                  focalX={heroFocalX}
                  focalY={heroFocalY}
                  zoom={heroZoom}
                  accentColor={accent}
                  photoUrl={hero.photoUrl}
                  photoPreviewUrl={localHeroPhotoPreview}
                  logoUrl={displayLogoUrl}
                  eyebrow={heroEyebrow}
                  title={heroTitle}
                  eventName={eventName}
                  detailLines={previewDetailLines}
                  closing={heroClosing}
                  savedHeroUrl={savedHeroUrl}
                  headingColor={headingColor}
                  headingFont={headingFont}
                  headingSize={headingSize}
                  headingWeight={headingWeight}
                  headingTracking={headingTracking}
                  headingAlign={headingAlign}
                  headingLineHeight={headingLineHeight}
                  eyebrowUppercase={eyebrowUppercase}
                />
              ) : (
                <PublicBannerPreview
                  mode={bannerMode}
                  accent={accent}
                  gradientStyle={bannerGradient}
                  photoUrl={previewBannerPhoto}
                  focalX={bannerFocalX}
                  focalY={bannerFocalY}
                  zoom={bannerZoom}
                  blur={bannerBlur}
                  logoUrl={displayLogoUrl}
                  eventName={eventName}
                  headingColor={publicHeadingColor}
                  headingFont={headingFont}
                  headingSize={headingSize}
                  headingWeight={headingWeight}
                  headingTracking={headingTracking}
                  headingAlign={headingAlign}
                  headingLineHeight={headingLineHeight}
                />
              )}
            </div>
            {canEdit ? (
              <div className="mt-3 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  disabled={pending || dirty}
                  title={
                    dirty
                      ? "Save branding before sending a preview"
                      : "Email a sample invitation to yourself"
                  }
                  onClick={() => {
                    start(async () => {
                      try {
                        const result = await sendBrandingPreviewAction(
                          orgSlug,
                          eventId,
                        );
                        if (!result.ok) {
                          toast.error(result.error);
                          return;
                        }
                        toast.success(
                          result.simulated
                            ? `Preview logged for ${result.to} (email provider not configured).`
                            : `Preview sent to ${result.to}.`,
                        );
                        router.refresh();
                      } catch (err) {
                        toast.error(
                          err instanceof Error
                            ? err.message
                            : "Could not send preview",
                        );
                      }
                    });
                  }}
                  className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-full bg-slate-100 px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200/80 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Mail className="size-3.5" strokeWidth={2} aria-hidden />
                  {pending ? "Sending…" : "Send me a preview"}
                </button>
              </div>
            ) : null}
          </div>

          <p className="px-1 text-[11px] text-slate-400">
            Save to apply. Invitation hero images rebuild for outbound email.
          </p>
        </aside>
      </div>
    </div>
  );
}
