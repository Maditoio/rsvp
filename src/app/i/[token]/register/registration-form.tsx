"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { submitRegistration } from "@/modules/registrations/actions";
import type { RegistrationInput } from "@/modules/registrations/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TurnstileWidget } from "@/components/turnstile";
import { QrCodeImage } from "@/components/qr-code";

const FIELDS: {
  key: keyof RegistrationInput;
  label: string;
  required?: boolean;
  type?: string;
  area?: boolean;
}[] = [
  { key: "firstName", label: "First name", required: true },
  { key: "lastName", label: "Last name", required: true },
  { key: "email", label: "Email", required: true, type: "email" },
  { key: "phone", label: "Phone" },
  { key: "company", label: "Company" },
  { key: "jobTitle", label: "Job title" },
  { key: "industry", label: "Industry" },
  { key: "country", label: "Country" },
  { key: "website", label: "Website" },
  { key: "attendanceDates", label: "Attendance dates" },
  { key: "dietary", label: "Dietary requirements", area: true },
  { key: "accessibility", label: "Accessibility requirements", area: true },
  { key: "accommodation", label: "Accommodation" },
  { key: "airportTransfer", label: "Airport transfer" },
  { key: "notes", label: "Notes for the organiser", area: true },
];

export function RegistrationForm({
  token,
  siteKey,
  defaults,
  existingQr,
}: {
  token: string;
  siteKey: string;
  defaults: Partial<RegistrationInput>;
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
  const initial = useMemo(() => defaults, [defaults]);

  if (qrDataUrl) {
    return (
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.18em] text-accent-700">
          Registered
        </p>
        <h2 className="mt-2 font-serif text-3xl text-slate-900">
          Your check-in code
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
          Accepting the invitation and registering are separate steps. This
          opaque code is for event-day check-in only — it does not contain your
          details.
        </p>
        <div className="mt-6 flex justify-center">
          <QrCodeImage
            dataUrl={qrDataUrl}
            label="Opaque attendance check-in code"
          />
        </div>
        <p className="mt-4 text-sm text-slate-500">
          Save a screenshot, or sign in to find it later under My event.
        </p>
        <Link
          href="/me"
          className="mt-5 inline-flex rounded-full bg-primary-600 px-5 py-2.5 text-sm font-medium text-white"
        >
          Open attendee portal
        </Link>
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      action={(formData) => {
        setError(null);
        if (siteKey && !turnstileToken) {
          setError("Complete the bot check before submitting.");
          return;
        }
        start(async () => {
          try {
            const data = Object.fromEntries(
              FIELDS.map(({ key }) => [key, String(formData.get(key) ?? "")]),
            ) as RegistrationInput;
            const result = await submitRegistration(
              token,
              data,
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
      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <div
            key={field.key}
            className={field.area || field.key === "notes" ? "sm:col-span-2" : undefined}
          >
            <Label htmlFor={field.key}>
              {field.label}
              {field.required ? " *" : ""}
            </Label>
            {field.area ? (
              <Textarea
                id={field.key}
                name={field.key}
                defaultValue={initial[field.key] ?? ""}
                required={field.required}
              />
            ) : (
              <Input
                id={field.key}
                name={field.key}
                type={field.type ?? "text"}
                defaultValue={initial[field.key] ?? ""}
                required={field.required}
              />
            )}
          </div>
        ))}
      </div>
      <TurnstileWidget siteKey={siteKey} onToken={onToken} />
      {error ? <p className="text-sm text-error-500">{error}</p> : null}
      <Button disabled={pending}>
        {pending ? "Submitting…" : "Complete registration"}
      </Button>
    </form>
  );
}
