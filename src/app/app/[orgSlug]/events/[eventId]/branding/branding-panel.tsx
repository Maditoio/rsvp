"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
  EMAIL_HERO_BACKGROUND_MODES,
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
import { Textarea } from "@/components/ui/textarea";
import { BrandingSegmented } from "./branding-segmented";
import { InviteHeroLivePreview } from "./invite-hero-live-preview";

type HeroSettings = {
  enabled: boolean;
  backgroundMode: EmailHeroBackgroundMode;
  gradientStyle: EmailHeroGradientStyle;
  eyebrow: string;
  title: string;
  detail: string;
  closing: string;
  imageUrl: string | null;
};

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
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-150 ${
        checked ? "bg-indigo-600" : "bg-slate-200"
      } ${disabled ? "opacity-50" : ""}`}
    >
      <span
        className={`inline-block size-5 translate-x-1 rounded-full bg-white shadow-sm transition-transform duration-150 ${
          checked ? "translate-x-6" : ""
        }`}
      />
    </button>
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
  hero,
}: {
  orgSlug: string;
  eventId: string;
  canEdit: boolean;
  branding: EmailBranding;
  emailAccentColor: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  eventName: string;
  hero: HeroSettings;
}) {
  const router = useRouter();
  const [accent, setAccent] = useState(emailAccentColor ?? branding.accentColor);
  const [heroEnabled, setHeroEnabled] = useState(hero.enabled);
  const [backgroundMode, setBackgroundMode] = useState(hero.backgroundMode);
  const [gradientStyle, setGradientStyle] = useState(hero.gradientStyle);
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
    setHeroEnabled(hero.enabled);
    setBackgroundMode(hero.backgroundMode);
    setGradientStyle(hero.gradientStyle);
    setHeroEyebrow(hero.eyebrow);
    setHeroTitle(hero.title);
    setHeroDetail(hero.detail);
    setHeroClosing(hero.closing);
    setAccent(emailAccentColor ?? branding.accentColor);
  }, [
    hero.enabled,
    hero.backgroundMode,
    hero.gradientStyle,
    hero.eyebrow,
    hero.title,
    hero.detail,
    hero.closing,
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

  const previewDetailLines = useMemo(() => {
    const custom = heroDetail
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    return custom;
  }, [heroDetail]);

  function uploadBannerFile(file: File) {
    setError(null);
    if (localBannerPreview) URL.revokeObjectURL(localBannerPreview);
    setLocalBannerPreview(URL.createObjectURL(file));
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
            ? "Background uploaded. Invitation hero rebuilt."
            : "Email banner uploaded.",
        );
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not upload banner",
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
        setNotice(next ? "Invitation hero enabled." : "Invitation hero disabled.");
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
    formData.set("emailHeroOverlayEnabled", heroEnabled ? "true" : "false");
    formData.set("emailHeroBackgroundMode", backgroundMode);
    formData.set("emailHeroGradientStyle", gradientStyle);
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
    <div className="space-y-8">
      <PageHeader
        eyebrow="Setup"
        title="Branding"
        description="Logo, brand colour, and invitation hero for outbound emails. The sender remains Bizcon RSVP."
      />

      {notice ? <p className="text-sm text-success">{notice}</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
        <div className="space-y-8">
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="text-[19px] font-bold tracking-tight text-slate-900">
              Event assets
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Logo and brand colour appear across emails, badges, and your event
              site.
            </p>

            <div className="mt-6 space-y-6">
              <div>
                <p className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-slate-400">
                  Logo
                </p>
                <div className="mt-3 rounded-xl bg-slate-50 p-4">
                  {hasLogo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={displayLogoUrl ?? ""}
                      alt="Event logo"
                      className="max-h-16 max-w-full object-contain"
                    />
                  ) : (
                    <p className="text-sm text-slate-600">No logo uploaded.</p>
                  )}
                  {canEdit ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <label className="inline-flex cursor-pointer">
                        <span className="rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-[0_4px_12px_rgba(79,70,229,0.28)] hover:bg-indigo-700">
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
                          className="rounded-full px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
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
                  <p className="mt-2 text-xs text-slate-400">
                    PNG, JPEG, or WebP.
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="emailAccentColor">Brand colour</Label>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <input
                    id="emailAccentColor"
                    type="color"
                    value={accent}
                    onChange={(e) => setAccent(e.target.value.toUpperCase())}
                    disabled={!canEdit}
                    className="h-10 w-14 cursor-pointer rounded-md border border-slate-200 bg-white p-1"
                  />
                  <Input
                    value={accent}
                    onChange={(e) => setAccent(e.target.value)}
                    disabled={!canEdit}
                    className="max-w-[8rem] font-mono uppercase"
                    placeholder="#4F46E5"
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {EMAIL_ACCENT_SWATCHES.map((swatch) => (
                    <button
                      key={swatch.value}
                      type="button"
                      title={swatch.label}
                      disabled={!canEdit}
                      onClick={() => setAccent(swatch.value)}
                      className="size-7 rounded-full border border-slate-200 shadow-sm"
                      style={{ backgroundColor: swatch.value }}
                      aria-label={swatch.label}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-[19px] font-bold tracking-tight text-slate-900">
                  Invitation hero
                </h2>
                <p className="mt-1 max-w-lg text-sm text-slate-600">
                  One composed image at the top of invitation emails — logo and
                  copy baked in for reliable rendering.
                </p>
              </div>
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
            </div>

            {heroEnabled ? (
              <div className="mt-6 space-y-6">
                <div>
                  <p className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-slate-400">
                    Background
                  </p>
                  <div className="mt-2">
                    <BrandingSegmented
                      ariaLabel="Hero background style"
                      value={backgroundMode}
                      disabled={!canEdit || pending}
                      options={EMAIL_HERO_BACKGROUND_MODES}
                      onChange={setBackgroundMode}
                    />
                  </div>

                  {backgroundMode === "IMAGE" ? (
                    <div className="mt-4 rounded-xl bg-slate-50 p-4">
                      {hasBanner || localBannerPreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={localBannerPreview ?? bannerUrl ?? ""}
                          alt="Hero background"
                          className="max-h-32 w-full rounded-lg object-cover"
                        />
                      ) : (
                        <p className="text-sm text-slate-600">
                          Upload a wide photo (~1200×630). It will be softly
                          blurred behind the copy.
                        </p>
                      )}
                      {canEdit ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <label className="inline-flex cursor-pointer">
                            <span className="rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700">
                              {pending
                                ? "Uploading…"
                                : hasBanner
                                  ? "Replace photo"
                                  : "Upload photo"}
                            </span>
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              className="sr-only"
                              disabled={pending}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                e.target.value = "";
                                if (file) uploadBannerFile(file);
                              }}
                            />
                          </label>
                          {hasBanner ? (
                            <button
                              type="button"
                              disabled={pending}
                              className="rounded-full px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
                              onClick={() => {
                                setError(null);
                                start(async () => {
                                  try {
                                    await removeEmailBanner(orgSlug, eventId);
                                    setLocalBannerPreview(null);
                                    setNotice("Background photo removed.");
                                    router.refresh();
                                  } catch (err) {
                                    setError(
                                      err instanceof Error
                                        ? err.message
                                        : "Could not remove banner",
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
                  ) : null}

                  {backgroundMode === "COLOR" ? (
                    <p className="mt-3 text-sm text-slate-600">
                      Uses your brand colour above as a solid backdrop.
                    </p>
                  ) : null}

                  {backgroundMode === "GRADIENT" ? (
                    <div className="mt-4">
                      <BrandingSegmented
                        ariaLabel="Gradient style"
                        value={gradientStyle}
                        disabled={!canEdit || pending}
                        options={EMAIL_HERO_GRADIENTS.map((g) => ({
                          id: g.id,
                          label: g.label,
                        }))}
                        onChange={setGradientStyle}
                      />
                      <p className="mt-2 text-xs text-slate-400">
                        Decorative gradients — not used for buttons or links.
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
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
                <div>
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
                    One line per row. Leave blank to use venue and dates in
                    emails.
                  </p>
                </div>
                <div>
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
            ) : (
              <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Enable the hero to compose logo and invitation copy into one
                image. Plain emails can still use your logo and brand colour.
              </p>
            )}
          </section>

          {canEdit ? (
            <div className="flex justify-end">
              <Button disabled={pending} onClick={saveBranding}>
                {pending ? "Saving…" : "Save branding"}
              </Button>
            </div>
          ) : null}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-slate-400">
              Hero preview
            </p>
            <div className="mt-4">
              <InviteHeroLivePreview
                enabled={heroEnabled}
                backgroundMode={backgroundMode}
                gradientStyle={gradientStyle}
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
              />
            </div>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-slate-400">
              Email snippet
            </p>
            <div className="mt-4 overflow-hidden rounded-xl bg-slate-50 shadow-sm">
              {!heroEnabled && hasBanner ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={bannerUrl ?? ""}
                  alt=""
                  className="h-16 w-full object-cover"
                />
              ) : null}
              <div className="bg-white p-4">
                {!heroEnabled ? (
                  hasLogo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={displayLogoUrl ?? ""}
                      alt=""
                      className="mb-3 max-h-10 max-w-[140px] object-contain"
                    />
                  ) : (
                    <p
                      className="mb-2 text-[11px] font-bold tracking-[0.02em]"
                      style={{ color: accent }}
                    >
                      Bizcon RSVP
                    </p>
                  )
                ) : null}
                <p className="text-sm font-semibold text-slate-900">
                  You&apos;re invited
                </p>
                <p className="mt-2 text-xs text-slate-600">
                  {heroEnabled
                    ? "Personal greeting and button appear below the hero image."
                    : "Standard header layout with your logo or banner."}
                </p>
                <span
                  className="mt-3 inline-flex rounded-full px-4 py-2 text-xs font-semibold text-white"
                  style={{ backgroundColor: accent }}
                >
                  View invitation
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
