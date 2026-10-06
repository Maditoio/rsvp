"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  removeEmailBanner,
  saveEmailBranding,
  uploadEmailBanner,
} from "@/modules/communications/email-branding-actions";
import {
  EMAIL_ACCENT_SWATCHES,
  type EmailBranding,
} from "@/modules/communications/email-branding";
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

type HeroSettings = {
  enabled: boolean;
  eyebrow: string;
  title: string;
  detail: string;
  closing: string;
  imageUrl: string | null;
};

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
  const [heroEyebrow, setHeroEyebrow] = useState(hero.eyebrow);
  const [heroTitle, setHeroTitle] = useState(hero.title);
  const [heroDetail, setHeroDetail] = useState(hero.detail);
  const [heroClosing, setHeroClosing] = useState(hero.closing);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const displayLogoUrl = branding.logoUrl ?? logoUrl;
  const hasLogo = Boolean(displayLogoUrl);
  const previewHeroUrl = branding.heroCard
    ? branding.bannerUrl
    : hero.imageUrl;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Setup"
        title="Branding"
        description="Logo, banner, colour, and invitation hero used on emails. The sender remains Bizcon RSVP."
      />

      {notice ? <p className="text-sm text-success">{notice}</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Email branding</h2>
        <p className="mt-1 text-sm text-slate-500">
          Use a logo, a banner, or both. Brand colour styles buttons and links.
          Enable the invitation hero to bake logo and copy into one image for
          reliable email clients.
        </p>

        <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-400">
                Logo
              </p>
              {hasLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={displayLogoUrl ?? ""}
                  alt="Event logo"
                  className="mt-3 max-h-16 max-w-full object-contain"
                />
              ) : (
                <p className="mt-3 text-sm text-slate-600">Optional — no logo set.</p>
              )}
              {canEdit ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <label className="inline-flex cursor-pointer">
                    <span className="rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700">
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
                      className="text-xs font-medium text-slate-500 hover:text-slate-800"
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
              {logoUrl && !branding.logoUrl ? (
                <p className="mt-2 text-xs text-amber-700">
                  SVG logos are skipped in email. Upload a PNG or JPEG for email
                  branding.
                </p>
              ) : null}
              <p className="mt-2 text-xs text-slate-400">
                PNG, JPEG, or WebP. Also used on badges and the event website.
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-400">
                Banner
              </p>
              {branding.bannerUrl || bannerUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={branding.bannerUrl ?? bannerUrl ?? ""}
                  alt="Email banner"
                  className="mt-3 max-h-24 w-full rounded-lg object-cover"
                />
              ) : (
                <p className="mt-3 text-sm text-slate-600">
                  Optional — used as the invitation hero background when the
                  hero is enabled (~1200×630 recommended).
                </p>
              )}
              {canEdit ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <label className="inline-flex cursor-pointer">
                    <span className="rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700">
                      {pending ? "Uploading…" : "Upload banner"}
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
                              "background",
                            );
                            if (!prepared.ok) {
                              setError(prepared.error);
                              return;
                            }
                            const formData = new FormData();
                            formData.set("banner", prepared.file);
                            await uploadEmailBanner(orgSlug, eventId, formData);
                            setNotice("Email banner uploaded.");
                            router.refresh();
                          } catch (err) {
                            setError(
                              err instanceof Error
                                ? err.message
                                : "Could not upload banner",
                            );
                          }
                        });
                      }}
                    />
                  </label>
                  {bannerUrl || branding.bannerUrl ? (
                    <button
                      type="button"
                      disabled={pending}
                      className="text-xs font-medium text-slate-500 hover:text-slate-800"
                      onClick={() => {
                        setError(null);
                        start(async () => {
                          try {
                            await removeEmailBanner(orgSlug, eventId);
                            setNotice("Email banner removed.");
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
          </div>

          <form
            className="space-y-4"
            action={(formData) => {
              setError(null);
              formData.set("emailAccentColor", accent);
              formData.set(
                "emailHeroOverlayEnabled",
                heroEnabled ? "true" : "false",
              );
              formData.set("emailHeroEyebrow", heroEyebrow);
              formData.set("emailHeroTitle", heroTitle);
              formData.set("emailHeroDetail", heroDetail);
              formData.set("emailHeroClosing", heroClosing);
              start(async () => {
                try {
                  await saveEmailBranding(orgSlug, eventId, formData);
                  setNotice(
                    heroEnabled
                      ? "Email branding saved. Invitation hero updated."
                      : "Email branding saved.",
                  );
                  router.refresh();
                } catch (e) {
                  setError(
                    e instanceof Error
                      ? e.message
                      : "Could not save email branding",
                  );
                }
              });
            }}
          >
            <div>
              <Label htmlFor="emailAccentColor">Brand colour</Label>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <input
                  id="emailAccentColor"
                  type="color"
                  value={accent}
                  onChange={(e) => setAccent(e.target.value.toUpperCase())}
                  className="h-10 w-14 cursor-pointer rounded-md border border-slate-200 bg-white p-1"
                />
                <Input
                  value={accent}
                  onChange={(e) => setAccent(e.target.value)}
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
                    onClick={() => setAccent(swatch.value)}
                    className="size-7 rounded-full border border-slate-200 shadow-sm"
                    style={{ backgroundColor: swatch.value }}
                    aria-label={swatch.label}
                  />
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <input
                  id="emailHeroOverlayEnabled"
                  type="checkbox"
                  checked={heroEnabled}
                  disabled={!canEdit}
                  onChange={(e) => setHeroEnabled(e.target.checked)}
                  className="mt-1 size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                />
                <div>
                  <Label htmlFor="emailHeroOverlayEnabled">
                    Invitation hero image
                  </Label>
                  <p className="mt-1 text-xs text-slate-500">
                    Builds one image from your banner (blurred), logo, and the
                    copy below. Invitation emails use this instead of stacking
                    separate HTML layers.
                  </p>
                </div>
              </div>

              {heroEnabled ? (
                <div className="space-y-3 border-t border-slate-200 pt-3">
                  <div>
                    <Label htmlFor="emailHeroEyebrow">Eyebrow</Label>
                    <Input
                      id="emailHeroEyebrow"
                      value={heroEyebrow}
                      disabled={!canEdit}
                      onChange={(e) => setHeroEyebrow(e.target.value)}
                      placeholder="You are invited to"
                      className="mt-1"
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
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="emailHeroDetail">Detail line</Label>
                    <Textarea
                      id="emailHeroDetail"
                      value={heroDetail}
                      disabled={!canEdit}
                      onChange={(e) => setHeroDetail(e.target.value)}
                      placeholder="Dates · Venue"
                      rows={2}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="emailHeroClosing">Closing</Label>
                    <Input
                      id="emailHeroClosing"
                      value={heroClosing}
                      disabled={!canEdit}
                      onChange={(e) => setHeroClosing(e.target.value)}
                      placeholder="We look forward to welcoming you"
                      className="mt-1"
                    />
                  </div>
                  {!bannerUrl && !branding.bannerUrl ? (
                    <p className="text-xs text-amber-700">
                      Upload a banner first — it becomes the blurred background.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-400">
                Preview
              </p>
              <div className="mt-3 overflow-hidden rounded-xl bg-white shadow-sm">
                {previewHeroUrl && heroEnabled ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewHeroUrl}
                    alt="Invitation hero"
                    className="w-full object-cover"
                  />
                ) : branding.bannerUrl || bannerUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={branding.bannerUrl ?? bannerUrl ?? ""}
                    alt=""
                    className="h-16 w-full object-cover"
                  />
                ) : null}
                <div className="p-4">
                  {!heroEnabled || !previewHeroUrl ? (
                    branding.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={branding.logoUrl}
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
                  <button
                    type="button"
                    className="mt-3 inline-flex rounded-full px-4 py-2 text-xs font-semibold text-white"
                    style={{ backgroundColor: accent }}
                  >
                    View invitation
                  </button>
                </div>
              </div>
            </div>

            {canEdit ? (
              <div className="flex justify-end">
                <Button disabled={pending}>
                  {pending ? "Saving…" : "Save branding"}
                </Button>
              </div>
            ) : null}
          </form>
        </div>
      </section>
    </div>
  );
}
