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

export function BrandingPanel({
  orgSlug,
  eventId,
  canEdit,
  branding,
  emailAccentColor,
  logoUrl,
  bannerUrl,
}: {
  orgSlug: string;
  eventId: string;
  canEdit: boolean;
  branding: EmailBranding;
  emailAccentColor: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
}) {
  const router = useRouter();
  const [accent, setAccent] = useState(emailAccentColor ?? branding.accentColor);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const displayLogoUrl = branding.logoUrl ?? logoUrl;
  const hasLogo = Boolean(displayLogoUrl);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Setup"
        title="Branding"
        description="Logo, banner, and colour used on invitation and reminder emails. The sender remains Bizcon RSVP."
      />

      {notice ? <p className="text-sm text-success">{notice}</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Email branding</h2>
        <p className="mt-1 text-sm text-slate-500">
          Use a logo, a banner, or both. Brand colour styles buttons and links.
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
                  Optional — wide header image (~560×160).
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
              start(async () => {
                try {
                  await saveEmailBranding(orgSlug, eventId, formData);
                  setNotice("Email branding saved.");
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

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-400">
                Preview
              </p>
              <div className="mt-3 overflow-hidden rounded-xl bg-white shadow-sm">
                {branding.bannerUrl || bannerUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={branding.bannerUrl ?? bannerUrl ?? ""}
                    alt=""
                    className="h-16 w-full object-cover"
                  />
                ) : null}
                <div className="p-4">
                  {branding.logoUrl ? (
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
                  )}
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
