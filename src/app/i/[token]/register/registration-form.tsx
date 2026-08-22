"use client";

import { useCallback, useState, useTransition } from "react";
import Link from "next/link";
import { submitRegistration } from "@/modules/registrations/actions";
import { Button } from "@/components/ui/button";
import { TurnstileWidget } from "@/components/turnstile";
import { DynamicFields } from "@/components/dynamic-fields";
import { AccessibilityIconPicker } from "@/components/accessibility-icon-picker";
import { AttendanceDatesPicker } from "@/components/attendance-dates-picker";
import type { FormFieldDef } from "@/modules/registrations/defaults";
import { matchmakingPath } from "@/modules/matchmaking/questionnaire";
import type { EventDayOption } from "@/lib/event-dates";
import { isValidEmail, normalizeEmail } from "@/lib/validation";
import { useToast } from "@/components/ui/toast";

const SPECIAL_FIELD_KEYS = new Set(["attendanceDates", "accessibility"]);

export function RegistrationForm({
  token,
  siteKey,
  fields,
  defaults,
  eventDays,
  alreadyRegistered = false,
  invitationEmail,
  signUpHref,
  matchmakingHref,
}: {
  token: string;
  siteKey: string;
  fields: FormFieldDef[];
  defaults: Record<string, string | string[]>;
  eventDays: EventDayOption[];
  alreadyRegistered?: boolean;
  invitationEmail: string;
  signUpHref: string;
  matchmakingHref?: string | null;
}) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(alreadyRegistered);
  const [setupHref, setSetupHref] = useState<string | null>(matchmakingHref ?? null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const onToken = useCallback((value: string | null) => {
    setTurnstileToken(value);
  }, []);

  const standardFields = fields.filter((field) => !SPECIAL_FIELD_KEYS.has(field.key));
  const attendanceField = fields.find((field) => field.key === "attendanceDates");
  const accessibilityField = fields.find((field) => field.key === "accessibility");
  const attendanceSelected = Array.isArray(defaults.attendanceDates)
    ? defaults.attendanceDates
    : defaults.attendanceDates
      ? [defaults.attendanceDates]
      : [];
  const accessibilitySelected = Array.isArray(defaults.accessibility)
    ? defaults.accessibility
    : defaults.accessibility
      ? [defaults.accessibility]
      : [];

  if (completed) {
    return (
      <div className="text-center">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-bronze-600">
          Registered
        </p>
        <h2 className="mt-2 font-display text-3xl text-ink-800">
          Registration complete
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-stone-700">
          A confirmation email is on its way to{" "}
          <span className="font-medium text-ink-800">{invitationEmail}</span>. Use
          that message to sign in, open the event app, and access meetings, agenda,
          matchmaking, and your check-in QR code.
        </p>
        <div className="mx-auto mt-8 flex max-w-md flex-col gap-3">
          <Link
            href={signUpHref}
            className="inline-flex h-11 items-center justify-center rounded-sm bg-ink-700 px-5 text-[0.9375rem] font-semibold text-white hover:bg-ink-800"
          >
            Create your account
          </Link>
          <Link
            href="/me"
            className="inline-flex h-11 items-center justify-center rounded-sm border border-stone-200 bg-stone-0 px-5 text-[0.9375rem] font-semibold text-ink-700 hover:bg-stone-50"
          >
            Open My events
          </Link>
          {setupHref ? (
            <Link
              href={setupHref}
              className="text-sm text-stone-700 underline-offset-4 hover:text-ink-700 hover:underline"
            >
              Set up your matching profile
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <form
      className="space-y-6"
      action={(formData) => {
        setError(null);
        if (siteKey && !turnstileToken) {
          const message = "Complete the bot check before submitting.";
          setError(message);
          toast.error(message);
          return;
        }
        const email = normalizeEmail(String(formData.get("email") ?? ""));
        if (!isValidEmail(email)) {
          const message = "Enter a valid email address.";
          setError(message);
          toast.error(message);
          return;
        }
        if (email !== normalizeEmail(invitationEmail)) {
          const message =
            "Use the email address on your invitation. The registration email must match your invited address.";
          setError(message);
          toast.error(message);
          return;
        }
        start(async () => {
          const result = await submitRegistration(
            token,
            formData,
            turnstileToken ?? undefined,
          );
          if (!result.ok) {
            setError(result.error);
            toast.error(result.error);
            return;
          }
          toast.success(
            "Registration complete. Check your email for next steps.",
            "Registered",
          );
          setCompleted(true);
          if (result.signedIn) {
            setSetupHref(matchmakingPath(result.eventId));
          }
        });
      }}
    >
      <DynamicFields fields={standardFields} defaults={defaults} />
      {attendanceField ? (
        <AttendanceDatesPicker
          name="attendanceDates"
          options={eventDays}
          required={attendanceField.required}
          defaultSelected={attendanceSelected}
        />
      ) : null}
      {accessibilityField ? (
        <AccessibilityIconPicker
          name="accessibility"
          defaultSelected={accessibilitySelected}
        />
      ) : null}
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
