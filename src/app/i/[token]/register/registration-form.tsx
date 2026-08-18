"use client";

import { useCallback, useState, useTransition } from "react";
import Link from "next/link";
import { submitRegistration } from "@/modules/registrations/actions";
import { Button } from "@/components/ui/button";
import { TurnstileWidget } from "@/components/turnstile";
import { QrCodeImage } from "@/components/qr-code";
import { DynamicFields } from "@/components/dynamic-fields";
import type { FormFieldDef } from "@/modules/registrations/defaults";
import { matchmakingPath } from "@/modules/matchmaking/questionnaire";

export function RegistrationForm({
  token,
  siteKey,
  fields,
  defaults,
  existingQr,
  matchmakingHref,
}: {
  token: string;
  siteKey: string;
  fields: FormFieldDef[];
  defaults: Record<string, string>;
  existingQr?: { dataUrl: string; firstName: string } | null;
  matchmakingHref?: string | null;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(
    existingQr?.dataUrl ?? null,
  );
  const [setupHref, setSetupHref] = useState<string | null>(
    matchmakingHref ?? null,
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
        {setupHref ? (
          <div className="mx-auto mt-8 max-w-md border-t border-stone-200 pt-6">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-bronze-600">
              Next
            </p>
            <h3 className="mt-2 font-display text-2xl text-ink-800">
              Set up who you want to meet
            </h3>
            <p className="mt-2 text-sm text-stone-700">
              Your registration is complete. A short matching profile helps the
              directory introduce the right people.
            </p>
            <Link
              href={setupHref}
              className="mt-5 inline-flex h-11 items-center rounded-sm bg-ink-700 px-5 text-[0.9375rem] font-semibold text-white hover:bg-ink-800"
            >
              Set up matching profile
            </Link>
            <div className="mt-3">
              <Link
                href="/me"
                className="text-sm text-stone-700 underline-offset-4 hover:text-ink-700 hover:underline"
              >
                Skip for now
              </Link>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-stone-500">
            Save a screenshot of this code. You can sign in later under My event
            if you create an account.
          </p>
        )}
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
            if (!result.ok) {
              setError(result.error);
              return;
            }
            setQrDataUrl(result.qrDataUrl);
            if (result.signedIn) {
              setSetupHref(matchmakingPath(result.eventId));
            }
          } catch {
            setError("Could not complete registration. Please try again.");
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
