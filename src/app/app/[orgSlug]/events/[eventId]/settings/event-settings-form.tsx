"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Copy, Check } from "lucide-react";
import { updateEventSettings } from "@/modules/events/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QrCodeImage } from "@/components/qr-code";

export function EventSettingsForm({
  orgSlug,
  eventId,
  applyUrl,
  applyQrDataUrl,
  settings,
}: {
  orgSlug: string;
  eventId: string;
  applyUrl: string;
  applyQrDataUrl: string | null;
  settings: {
    invitationExpiryDays: number;
    capacity: number | null;
    waitlistEnabled: boolean;
    allowPublicApplication: boolean;
    aiInsightsEnabled: boolean;
  };
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);

  function copyUrl() {
    navigator.clipboard.writeText(applyUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-bronze-600">
          Event
        </p>
        <h1 className="mt-1 font-display text-3xl text-ink-800">Settings</h1>
        <p className="mt-1 text-sm text-stone-700">
          Invitation windows, capacity, public applications, and optional AI
          insights.
        </p>
      </div>
      <form
        className="space-y-4"
        action={(formData) => {
          setError(null);
          start(async () => {
            try {
              await updateEventSettings(orgSlug, eventId, formData);
              router.refresh();
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Could not save event settings",
              );
            }
          });
        }}
      >
        <div>
          <Label htmlFor="invitationExpiryDays">Invitation expiry (days)</Label>
          <Input
            id="invitationExpiryDays"
            name="invitationExpiryDays"
            type="number"
            min={1}
            max={365}
            required
            defaultValue={settings.invitationExpiryDays}
          />
          <p className="mt-1 text-xs text-stone-500">
            New invitations expire this many days after they are created.
          </p>
        </div>
        <div>
          <Label htmlFor="capacity">Capacity</Label>
          <Input
            id="capacity"
            name="capacity"
            type="number"
            min={1}
            placeholder="Unlimited"
            defaultValue={settings.capacity ?? ""}
          />
          <p className="mt-1 text-xs text-stone-500">
            Leave blank for no overall cap.
          </p>
        </div>
        <label className="flex items-start gap-3 text-sm text-ink-700">
          <input
            type="checkbox"
            name="waitlistEnabled"
            value="on"
            defaultChecked={settings.waitlistEnabled}
            className="mt-1 size-4 accent-ink-700"
          />
          <span>
            <span className="font-semibold">Enable waitlist</span>
            <span className="mt-1 block text-xs font-normal text-stone-500">
              Allow registrations to be waitlisted when capacity is reached.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm text-ink-700">
          <input
            type="checkbox"
            name="allowPublicApplication"
            value="on"
            defaultChecked={settings.allowPublicApplication}
            className="mt-1 size-4 accent-ink-700"
          />
          <span>
            <span className="font-semibold">Allow public applications</span>
            <span className="mt-1 block text-xs font-normal text-stone-500">
              Publishes an Apply to attend page. Approving creates an invitation,
              not a registration.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm text-ink-700">
          <input
            type="checkbox"
            name="aiInsightsEnabled"
            value="on"
            defaultChecked={settings.aiInsightsEnabled}
            className="mt-1 size-4 accent-ink-700"
          />
          <span>
            <span className="font-semibold">Enable AI insights</span>
            <span className="mt-1 block text-xs font-normal text-stone-500">
              Structured matching always runs. AI only writes explanations later,
              and only for attendees who opt in.
            </span>
          </span>
        </label>

        <div>
          <Label htmlFor="applyUrl">Public apply URL</Label>
          <div className="flex items-center gap-2">
            <Input id="applyUrl" readOnly value={applyUrl} className="flex-1" />
            <button
              type="button"
              onClick={copyUrl}
              className="inline-flex h-[42px] items-center justify-center rounded-sm border border-stone-300 bg-stone-0 px-3 text-stone-700 hover:border-ink-400 hover:bg-stone-50"
              title="Copy URL"
            >
              {copied ? (
                <Check className="size-4 text-moss-600" />
              ) : (
                <Copy className="size-4" />
              )}
            </button>
          </div>
          <p className="mt-1 text-xs text-stone-500">
            Share this link on your website, emails, or printed materials.
          </p>
        </div>

        {applyQrDataUrl ? (
          <div>
            <Label>QR code for printed materials</Label>
            <div className="mt-2">
              <QrCodeImage
                dataUrl={applyQrDataUrl}
                label="Public apply page QR code"
              />
            </div>
            <p className="mt-2 text-xs text-stone-500">
              Right-click the QR code to save it for posters or print collateral.
            </p>
          </div>
        ) : null}

        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <div className="flex justify-end">
          <Button disabled={pending}>{pending ? "Saving…" : "Save settings"}</Button>
        </div>
      </form>
    </div>
  );
}
