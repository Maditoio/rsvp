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
  ImageIcon,
  Palette,
  Sparkles,
  Type,
  Upload,
} from "lucide-react";
import {
  removeEmailBanner,
  saveEmailBranding,
  setInvitationHeroEnabled,
  uploadEmailBanner,
} from "@/modules/communications/email-branding-actions";
import {
  EMAIL_ACCENT_SWATCHES,
  type EmailBranding,
} from "@/modules/communications/email-branding";
import {
  BRAND_HEADING_FONTS,
  brandHeadingCssFamily,
  type BrandHeadingFont,
  type BrandHeadingSize,
} from "@/modules/branding/brand-heading-style";
import {
  EMAIL_HERO_GRADIENTS,
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
import { cn } from "@/lib/utils";
import { BrandingColorField } from "./branding-color-field";
import { FocalPointEditor } from "./focal-point-editor";
import { InviteHeroLivePreview } from "./invite-hero-live-preview";

type BannerSettings = {
  mode: EmailHeroBackgroundMode;
  gradientStyle: EmailHeroGradientStyle;
  blur: number;
  focalX: number;
  focalY: number;
};

type HeroSettings = {
  enabled: boolean;
  backgroundMode: EmailHeroBackgroundMode;
  gradientStyle: EmailHeroGradientStyle;
  blur: number;
  focalX: number;
  focalY: number;
  eyebrow: string;
  title: string;
  detail: string;
  closing: string;
  imageUrl: string | null;
};

type HeadingSettings = {
  color: string | null;
  font: BrandHeadingFont;
  size: BrandHeadingSize;
};

type TabId = "identity" | "banner" | "hero" | "type";

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
    <section className="rounded-xl bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-[19px] font-bold tracking-tight text-slate-900">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 max-w-xl text-[13.5px] text-slate-600">
              {description}
            </p>
          ) : null}
        </div>
        {action}
      </div>
      <div className="mt-6 space-y-6">{children}</div>
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
    <div className="grid gap-2 sm:grid-cols-3">
      {MODE_OPTIONS.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.id)}
            className={cn(
              "rounded-xl px-3.5 py-3 text-left transition-all duration-150",
              active
                ? "bg-indigo-50 shadow-sm ring-2 ring-indigo-600"
                : "bg-slate-50 ring-1 ring-slate-200/80 hover:bg-slate-100",
              disabled && "opacity-50",
            )}
          >
            <p
              className={cn(
                "text-[13.5px] font-semibold",
                active ? "text-indigo-700" : "text-slate-900",
              )}
            >
              {opt.label}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">{opt.description}</p>
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
    <div className="grid gap-2 sm:grid-cols-3">
      {EMAIL_HERO_GRADIENTS.map((g) => {
        const active = value === g.id;
        return (
          <button
            key={g.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(g.id)}
            className={cn(
              "overflow-hidden rounded-xl text-left transition-all duration-150",
              active
                ? "ring-2 ring-indigo-600 ring-offset-2"
                : "ring-1 ring-slate-200/80 hover:-translate-y-0.5 hover:shadow-md",
              disabled && "opacity-50",
            )}
          >
            <div className="h-16 w-full" style={{ background: g.css }} />
            <div className="bg-white px-3 py-2">
              <p className="text-xs font-semibold text-slate-900">{g.label}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function BlurControl({
  id,
  value,
  disabled,
  onChange,
  hint,
}: {
  id: string;
  value: number;
  disabled?: boolean;
  onChange: (n: number) => void;
  hint: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="mb-2 flex items-center justify-between">
        <Label htmlFor={id}>Softness</Label>
        <span className="rounded-full bg-white px-2 py-0.5 font-mono text-[11px] font-medium text-slate-500 shadow-xs">
          {value === 0 ? "Sharp" : `${value}px`}
        </span>
      </div>
      <Slider
        id={id}
        min={0}
        max={24}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <p className="mt-2 text-xs text-slate-400">{hint}</p>
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
    <div className="flex flex-wrap gap-2">
      <label className="inline-flex cursor-pointer">
        <span className="inline-flex h-10 items-center gap-1.5 rounded-full bg-indigo-600 px-4 text-xs font-semibold text-white shadow-[0_4px_12px_rgba(79,70,229,0.28)] transition-transform duration-150 hover:-translate-y-px hover:bg-indigo-700">
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
          className="inline-flex h-10 items-center rounded-full px-4 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100"
        >
          Remove
        </button>
      ) : null}
    </div>
  );
}

function BackgroundEditor({
  mode,
  gradientStyle,
  blur,
  focalX,
  focalY,
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
  onFocalChange,
  onUpload,
  onRemove,
}: {
  mode: EmailHeroBackgroundMode;
  gradientStyle: EmailHeroGradientStyle;
  blur: number;
  focalX: number;
  focalY: number;
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
  onFocalChange: (x: number, y: number) => void;
  onUpload: (file: File) => void;
  onRemove: () => void;
}) {
  const displayPhoto = localPreview ?? photoUrl;
  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-[0.04em] text-slate-400">
          Background style
        </p>
        <ModePicker
          value={mode}
          disabled={!canEdit || pending}
          onChange={onModeChange}
        />
      </div>

      {mode === "IMAGE" ? (
        <div className="space-y-4">
          {displayPhoto ? (
            <FocalPointEditor
              imageUrl={displayPhoto}
              focalX={focalX}
              focalY={focalY}
              blur={blur}
              aspect={aspect}
              disabled={!canEdit || pending}
              onChange={onFocalChange}
            />
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl bg-slate-50 px-6 py-10 text-center ring-1 ring-dashed ring-slate-200">
              <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                <ImageIcon className="size-5" strokeWidth={1.75} aria-hidden />
              </div>
              <p className="text-[13.5px] font-semibold text-slate-900">
                No photo yet
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Upload a wide JPEG, PNG, or WebP (~1200×630).
              </p>
            </div>
          )}
          <PhotoActions
            canEdit={canEdit}
            pending={pending}
            hasPhoto={hasPhoto}
            onUpload={onUpload}
            onRemove={onRemove}
          />
          <BlurControl
            id={blurId}
            value={blur}
            disabled={!canEdit}
            onChange={onBlurChange}
            hint={blurHint}
          />
        </div>
      ) : null}

      {mode === "COLOR" ? (
        <p className="rounded-xl bg-slate-50 px-4 py-3 text-[13.5px] text-slate-600">
          Uses your brand colour from Identity as a solid backdrop.
        </p>
      ) : null}

      {mode === "GRADIENT" ? (
        <div>
          <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-[0.04em] text-slate-400">
            Gradient
          </p>
          <GradientPicker
            value={gradientStyle}
            disabled={!canEdit || pending}
            onChange={onGradientChange}
          />
          <p className="mt-2 text-xs text-slate-400">
            Decorative only — buttons and links stay indigo/brand.
          </p>
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
  blur,
  logoUrl,
  eventName,
  headingColor,
  headingFont,
  headingSize,
}: {
  mode: EmailHeroBackgroundMode;
  accent: string;
  gradientStyle: EmailHeroGradientStyle;
  photoUrl: string | null;
  focalX: number;
  focalY: number;
  blur: number;
  logoUrl: string | null;
  eventName: string;
  headingColor: string;
  headingFont: BrandHeadingFont;
  headingSize: BrandHeadingSize;
}) {
  const gradient = EMAIL_HERO_GRADIENTS.find((g) => g.id === gradientStyle);
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
    strip = (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt=""
        className="h-28 w-full object-cover"
        style={{
          objectPosition: `${focalX}% ${focalY}%`,
          filter: blur > 0 ? `blur(${Math.min(blur, 8)}px)` : undefined,
          transform: blur > 0 ? "scale(1.05)" : undefined,
        }}
      />
    );
  }

  const titleClass =
    headingSize === "sm"
      ? "text-xl"
      : headingSize === "lg"
        ? "text-3xl"
        : "text-2xl";

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-100">
      <div className="overflow-hidden">{strip}</div>
      <div className="space-y-2 p-4">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            className="max-h-8 max-w-[120px] object-contain"
          />
        ) : null}
        <p
          className={cn("font-semibold tracking-tight", titleClass)}
          style={{
            color: headingColor,
            fontFamily: brandHeadingCssFamily(headingFont),
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
}) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("identity");
  const [accent, setAccent] = useState(emailAccentColor ?? branding.accentColor);
  const [bannerMode, setBannerMode] = useState(banner.mode);
  const [bannerGradient, setBannerGradient] = useState(banner.gradientStyle);
  const [bannerBlur, setBannerBlur] = useState(banner.blur);
  const [bannerFocalX, setBannerFocalX] = useState(banner.focalX);
  const [bannerFocalY, setBannerFocalY] = useState(banner.focalY);
  const [heroEnabled, setHeroEnabled] = useState(hero.enabled);
  const [backgroundMode, setBackgroundMode] = useState(hero.backgroundMode);
  const [gradientStyle, setGradientStyle] = useState(hero.gradientStyle);
  const [heroBlur, setHeroBlur] = useState(hero.blur);
  const [heroFocalX, setHeroFocalX] = useState(hero.focalX);
  const [heroFocalY, setHeroFocalY] = useState(hero.focalY);
  const [headingColor, setHeadingColor] = useState(heading.color ?? "#FFFFFF");
  const [headingFont, setHeadingFont] = useState(heading.font);
  const [headingSize, setHeadingSize] = useState(heading.size);
  const [heroEyebrow, setHeroEyebrow] = useState(hero.eyebrow);
  const [heroTitle, setHeroTitle] = useState(hero.title);
  const [heroDetail, setHeroDetail] = useState(hero.detail);
  const [heroClosing, setHeroClosing] = useState(hero.closing);
  const [localBannerPreview, setLocalBannerPreview] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    setBannerMode(banner.mode);
    setBannerGradient(banner.gradientStyle);
    setBannerBlur(banner.blur);
    setBannerFocalX(banner.focalX);
    setBannerFocalY(banner.focalY);
    setHeroEnabled(hero.enabled);
    setBackgroundMode(hero.backgroundMode);
    setGradientStyle(hero.gradientStyle);
    setHeroBlur(hero.blur);
    setHeroFocalX(hero.focalX);
    setHeroFocalY(hero.focalY);
    setHeadingColor(heading.color ?? "#FFFFFF");
    setHeadingFont(heading.font);
    setHeadingSize(heading.size);
    setHeroEyebrow(hero.eyebrow);
    setHeroTitle(hero.title);
    setHeroDetail(hero.detail);
    setHeroClosing(hero.closing);
    setAccent(emailAccentColor ?? branding.accentColor);
  }, [
    banner.mode,
    banner.gradientStyle,
    banner.blur,
    banner.focalX,
    banner.focalY,
    hero.enabled,
    hero.backgroundMode,
    hero.gradientStyle,
    hero.blur,
    hero.focalX,
    hero.focalY,
    hero.eyebrow,
    hero.title,
    hero.detail,
    hero.closing,
    heading.color,
    heading.font,
    heading.size,
    emailAccentColor,
    branding.accentColor,
  ]);

  useEffect(() => {
    return () => {
      if (localBannerPreview) URL.revokeObjectURL(localBannerPreview);
    };
  }, [localBannerPreview]);

  const displayLogoUrl = branding.logoUrl ?? logoUrl;
  const hasLogo = Boolean(displayLogoUrl);
  const hasBanner = Boolean(bannerUrl);
  const savedHeroUrl = hero.imageUrl;
  const previewPhoto = localBannerPreview ?? bannerUrl;

  const previewDetailLines = useMemo(() => {
    return heroDetail
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
  }, [heroDetail]);

  function uploadBannerFile(file: File) {
    setError(null);
    if (localBannerPreview) URL.revokeObjectURL(localBannerPreview);
    setLocalBannerPreview(URL.createObjectURL(file));
    setBannerMode("IMAGE");
    start(async () => {
      try {
        const prepared = await prepareImageForUpload(file, "background");
        if (!prepared.ok) {
          setError(prepared.error);
          return;
        }
        const formData = new FormData();
        formData.set("banner", prepared.file);
        formData.set("enableHero", heroEnabled ? "true" : "false");
        await uploadEmailBanner(orgSlug, eventId, formData);
        setNotice(
          heroEnabled
            ? "Photo uploaded. Invitation hero rebuilt."
            : "Page banner photo uploaded.",
        );
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not upload banner",
        );
      }
    });
  }

  function removeBanner() {
    setError(null);
    start(async () => {
      try {
        await removeEmailBanner(orgSlug, eventId);
        setLocalBannerPreview(null);
        setNotice("Banner photo removed.");
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not remove banner",
        );
      }
    });
  }

  function onHeroToggle(next: boolean) {
    setError(null);
    setHeroEnabled(next);
    if (!canEdit) return;
    start(async () => {
      try {
        await setInvitationHeroEnabled(orgSlug, eventId, next);
        setNotice(
          next ? "Invitation hero enabled." : "Invitation hero disabled.",
        );
        router.refresh();
      } catch (e) {
        setHeroEnabled(!next);
        setError(
          e instanceof Error ? e.message : "Could not update invitation hero",
        );
      }
    });
  }

  function saveBranding() {
    setError(null);
    const formData = new FormData();
    formData.set("emailAccentColor", accent);
    formData.set("emailBannerMode", bannerMode);
    formData.set("emailBannerGradientStyle", bannerGradient);
    formData.set("emailBannerBlur", String(bannerBlur));
    formData.set("emailBannerFocalX", String(bannerFocalX));
    formData.set("emailBannerFocalY", String(bannerFocalY));
    formData.set("emailHeroOverlayEnabled", heroEnabled ? "true" : "false");
    formData.set("emailHeroBackgroundMode", backgroundMode);
    formData.set("emailHeroGradientStyle", gradientStyle);
    formData.set("emailHeroBlur", String(heroBlur));
    formData.set("emailHeroFocalX", String(heroFocalX));
    formData.set("emailHeroFocalY", String(heroFocalY));
    formData.set("brandHeadingColor", headingColor);
    formData.set("brandHeadingFont", headingFont);
    formData.set("brandHeadingSize", headingSize);
    formData.set("emailHeroEyebrow", heroEyebrow);
    formData.set("emailHeroTitle", heroTitle);
    formData.set("emailHeroDetail", heroDetail);
    formData.set("emailHeroClosing", heroClosing);
    start(async () => {
      try {
        await saveEmailBranding(orgSlug, eventId, formData);
        setNotice(
          heroEnabled
            ? "Branding saved. Invitation hero updated for emails."
            : "Branding saved.",
        );
        router.refresh();
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Could not save email branding",
        );
      }
    });
  }

  return (
    <div className="pb-24">
      <PageHeader
        eyebrow="Setup"
        title="Branding"
        description="Craft how your event looks on public pages and invitation emails. The sender remains Bizcon RSVP."
      />

      {(notice || error) && (
        <div className="mt-4 space-y-2">
          {notice ? (
            <p className="rounded-full bg-success-bg px-3 py-1.5 text-sm font-medium text-success">
              {notice}
            </p>
          ) : null}
          {error ? (
            <p className="rounded-full bg-danger-bg px-3 py-1.5 text-sm font-medium text-danger">
              {error}
            </p>
          ) : null}
        </div>
      )}

      <div
        role="tablist"
        aria-label="Branding sections"
        className="mt-6 inline-flex max-w-full flex-wrap gap-1 rounded-full bg-slate-100 p-1"
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
              onClick={() => setTab(item.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors duration-150",
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

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
        <div className="space-y-6">
          {tab === "identity" ? (
            <SectionCard
              title="Logo & brand colour"
              description="Foundation for emails, badges, and public pages."
            >
              <div className="rounded-xl bg-slate-50 p-5">
                <p className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-slate-400">
                  Logo
                </p>
                <div className="mt-3 flex min-h-[72px] items-center justify-center rounded-xl bg-white p-4 shadow-xs ring-1 ring-slate-100">
                  {hasLogo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={displayLogoUrl ?? ""}
                      alt="Event logo"
                      className="max-h-14 max-w-full object-contain"
                    />
                  ) : (
                    <p className="text-sm text-slate-500">No logo uploaded</p>
                  )}
                </div>
                {canEdit ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <label className="inline-flex cursor-pointer">
                      <span className="inline-flex h-10 items-center gap-1.5 rounded-full bg-indigo-600 px-4 text-xs font-semibold text-white shadow-[0_4px_12px_rgba(79,70,229,0.28)] hover:bg-indigo-700">
                        <Upload className="size-3.5" aria-hidden />
                        {pending
                          ? "Working…"
                          : hasLogo
                            ? "Replace logo"
                            : "Upload logo"}
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
                          setError(null);
                          start(async () => {
                            try {
                              const prepared = await prepareImageForUpload(
                                file,
                                "logo",
                              );
                              if (!prepared.ok) {
                                setError(prepared.error);
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
                                setError(result.error);
                                return;
                              }
                              setNotice("Event logo uploaded.");
                              router.refresh();
                            } catch (err) {
                              setError(
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
                        className="inline-flex h-10 items-center rounded-full px-4 text-xs font-semibold text-slate-600 hover:bg-white"
                        onClick={() => {
                          setError(null);
                          start(async () => {
                            try {
                              const result = await removeEventLogoAction(
                                orgSlug,
                                eventId,
                              );
                              if (!result.ok) {
                                setError(result.error);
                                return;
                              }
                              setNotice("Event logo removed.");
                              router.refresh();
                            } catch (err) {
                              setError(
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
                <p className="mt-2 text-xs text-slate-400">PNG, JPEG, or WebP.</p>
              </div>

              <BrandingColorField
                label="Brand colour"
                value={accent}
                onChange={setAccent}
                disabled={!canEdit}
                swatches={[...EMAIL_ACCENT_SWATCHES]}
                hint="Used for buttons, accents, and solid colour backgrounds."
              />
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
                    focalX={heroFocalX}
                    focalY={heroFocalY}
                    canEdit={canEdit}
                    pending={pending}
                    hasPhoto={hasBanner}
                    photoUrl={bannerUrl}
                    localPreview={localBannerPreview}
                    aspect="hero"
                    blurId="invite-hero-blur"
                    blurHint="Softens the photo behind email copy. 0 keeps it sharp."
                    onModeChange={setBackgroundMode}
                    onGradientChange={setGradientStyle}
                    onBlurChange={setHeroBlur}
                    onFocalChange={(x, y) => {
                      setHeroFocalX(x);
                      setHeroFocalY(y);
                    }}
                    onUpload={uploadBannerFile}
                    onRemove={removeBanner}
                  />

                  <div className="border-t border-slate-100 pt-6">
                    <p className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-slate-400">
                      Hero copy
                    </p>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="emailHeroEyebrow">Eyebrow</Label>
                        <Input
                          id="emailHeroEyebrow"
                          value={heroEyebrow}
                          disabled={!canEdit}
                          onChange={(e) => setHeroEyebrow(e.target.value)}
                          placeholder="You are invited to"
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label htmlFor="emailHeroTitle">Title</Label>
                        <Input
                          id="emailHeroTitle"
                          value={heroTitle}
                          disabled={!canEdit}
                          onChange={(e) => setHeroTitle(e.target.value)}
                          placeholder={eventName}
                          className="mt-1.5"
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <Label htmlFor="emailHeroDetail">Detail lines</Label>
                      <Textarea
                        id="emailHeroDetail"
                        value={heroDetail}
                        disabled={!canEdit}
                        onChange={(e) => setHeroDetail(e.target.value)}
                        placeholder={"12–14 May 2026\nLondon"}
                        rows={3}
                        className="mt-1.5"
                      />
                      <p className="mt-1 text-xs text-slate-400">
                        One line per row. Leave blank to use venue and dates.
                      </p>
                    </div>
                    <div className="mt-4">
                      <Label htmlFor="emailHeroClosing">Closing</Label>
                      <Input
                        id="emailHeroClosing"
                        value={heroClosing}
                        disabled={!canEdit}
                        onChange={(e) => setHeroClosing(e.target.value)}
                        placeholder="We look forward to welcoming you"
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <p className="rounded-xl bg-slate-50 px-4 py-3 text-[13.5px] text-slate-600">
                  Turn on the hero to compose logo and invitation copy into one
                  image. Plain emails still use your logo and brand colour.
                </p>
              )}
            </SectionCard>
          ) : null}

          {tab === "type" ? (
            <SectionCard
              title="Heading style"
              description="Shared look for invitation hero text and public invite / registration headings."
            >
              <BrandingColorField
                label="Heading colour"
                value={headingColor}
                onChange={setHeadingColor}
                disabled={!canEdit}
                hint="On photo heroes, white usually reads best."
                shortcuts={[
                  { label: "White", value: "#FFFFFF" },
                  { label: "Dark", value: "#0F172A" },
                  { label: "Brand", value: accent },
                ]}
              />

              <div>
                <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-[0.04em] text-slate-400">
                  Font
                </p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {BRAND_HEADING_FONTS.map((font) => {
                    const active = headingFont === font.id;
                    return (
                      <button
                        key={font.id}
                        type="button"
                        disabled={!canEdit || pending}
                        onClick={() => setHeadingFont(font.id)}
                        className={cn(
                          "rounded-xl px-3 py-4 text-left transition-all duration-150",
                          active
                            ? "bg-indigo-50 ring-2 ring-indigo-600"
                            : "bg-slate-50 ring-1 ring-slate-200/80 hover:bg-slate-100",
                          pending && "opacity-50",
                        )}
                      >
                        <p
                          className="text-lg font-semibold tracking-tight text-slate-900"
                          style={{ fontFamily: brandHeadingCssFamily(font.id) }}
                        >
                          Ag
                        </p>
                        <p
                          className={cn(
                            "mt-1 text-xs font-semibold",
                            active ? "text-indigo-700" : "text-slate-600",
                          )}
                        >
                          {font.label}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-[0.04em] text-slate-400">
                  Size
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: "sm" as const, label: "Small", sample: "text-xl" },
                      {
                        id: "md" as const,
                        label: "Medium",
                        sample: "text-2xl",
                      },
                      { id: "lg" as const, label: "Large", sample: "text-3xl" },
                    ] as const
                  ).map((opt) => {
                    const active = headingSize === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={!canEdit || pending}
                        onClick={() => setHeadingSize(opt.id)}
                        className={cn(
                          "rounded-xl px-3 py-4 text-center transition-all duration-150",
                          active
                            ? "bg-indigo-50 ring-2 ring-indigo-600"
                            : "bg-slate-50 ring-1 ring-slate-200/80 hover:bg-slate-100",
                        )}
                      >
                        <p
                          className={cn(
                            "font-bold tracking-tight text-slate-900",
                            opt.sample,
                          )}
                          style={{
                            fontFamily: brandHeadingCssFamily(headingFont),
                          }}
                        >
                          Aa
                        </p>
                        <p
                          className={cn(
                            "mt-1 text-xs font-semibold",
                            active ? "text-indigo-700" : "text-slate-600",
                          )}
                        >
                          {opt.label}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </SectionCard>
          ) : null}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-slate-400">
              {tab === "hero" ? "Email hero preview" : "Live preview"}
            </p>
            <div className="mt-4">
              {tab === "hero" || (tab === "type" && heroEnabled) ? (
                <InviteHeroLivePreview
                  enabled={heroEnabled}
                  backgroundMode={backgroundMode}
                  gradientStyle={gradientStyle}
                  blur={heroBlur}
                  focalX={heroFocalX}
                  focalY={heroFocalY}
                  accentColor={accent}
                  bannerUrl={bannerUrl}
                  bannerPreviewUrl={localBannerPreview}
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
                />
              ) : (
                <PublicBannerPreview
                  mode={bannerMode}
                  accent={accent}
                  gradientStyle={bannerGradient}
                  photoUrl={previewPhoto}
                  focalX={bannerFocalX}
                  focalY={bannerFocalY}
                  blur={bannerBlur}
                  logoUrl={displayLogoUrl}
                  eventName={eventName}
                  headingColor={
                    headingColor === "#FFFFFF" ? "#0F172A" : headingColor
                  }
                  headingFont={headingFont}
                  headingSize={headingSize}
                />
              )}
            </div>
          </div>

          <div className="rounded-xl bg-indigo-50/80 px-4 py-3 text-xs text-indigo-800">
            Changes apply when you save. Invitation hero images are rebuilt for
            outbound email.
          </div>
        </aside>
      </div>

      {canEdit ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-100 bg-white/90 px-4 py-3 shadow-[0_-4px_12px_rgba(15,23,42,0.06)] backdrop-blur-sm">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <p className="hidden text-xs text-slate-500 sm:block">
              Logo, banner, hero, and typography save together.
            </p>
            <Button
              disabled={pending}
              onClick={saveBranding}
              className="ml-auto"
            >
              {pending ? "Saving…" : "Save branding"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
