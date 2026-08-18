"use client";

import { useCallback, useState, useTransition } from "react";
import Link from "next/link";
import { submitRegistration } from "@/modules/registrations/actions";
import { Button } from "@/components/ui/button";
import { TurnstileWidget } from "@/components/turnstile";
import { QrCodeImage } from "@/components/qr-code";
import { DynamicFields } from "@/components/dynamic-fields";
import type { FormFieldDef } from "@/modules/registrations/defaults";

export function RegistrationForm({
  token,
  siteKey,
  fields,
  defaults,
  existingQr,
}: {
  token: string;
  siteKey: string;
  fields: FormFieldDef[];
  defaults: Record<string, string>;
  existingQr?: { dataUrl: string; firstName: string } | null;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(
    existingQr?.dataUrl ?? null,
  );
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const onToken = useCallback((value: string | null) => {
    setTurnstileToken(value);
  }, []);

  if (qrDataUrl) {
    return (
      <div className="text-center">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-bronze-600">
          Registered
        </p>
        <h2 className="mt-2 font-display text-3xl text-ink-800">
          Your check-in code
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-stone-700">
          Accepting the invitation and registering are separate steps. This
          opaque code is for event-day check-in only — it does not contain your
          details. A confirmation email has been sent with this access link.
        </p>
        <div className="mt-6 flex justify-center">
          <QrCodeImage
            dataUrl={qrDataUrl}
            label="Opaque attendance check-in code"
          />
        </div>
        <p className="mt-4 text-sm text-stone-500">
          Save a screenshot, or sign in later under My event.
        </p>
        <Link
          href="/me"
          className="mt-5 inline-flex rounded-sm bg-ink-700 px-5 py-2.5 text-sm font-medium text-white"
        >
          Open attendee portal
        </Link>
      </div>
    );
  }

  return (
    <form
      className="space-y-6"
      action={(formData) => {
        setError(null);
        if (siteKey && !turnstileToken) {
          setError("Complete the bot check before submitting.");
          return;
        }
        start(async () => {
          try {
            const result = await submitRegistration(
              token,
              formData,
              turnstileToken ?? undefined,
            );
            setQrDataUrl(result.qrDataUrl);
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "Could not complete registration",
            );
          }
        });
      }}
    >
      <DynamicFields fields={fields} defaults={defaults} />
      <TurnstileWidget siteKey={siteKey} onToken={onToken} />
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <div className="flex justify-end">
        <Button disabled={pending}>
          {pending ? "Submitting…" : "Complete registration"}
        </Button>
      </div>
    </form>
  );
}
