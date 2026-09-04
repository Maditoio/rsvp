"use client";

import { useCallback, useState, useTransition } from "react";
import { submitPublicApplication } from "@/modules/applications/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { TurnstileWidget } from "@/components/turnstile";
import { COUNTRIES } from "@/lib/countries";
import { isValidEmail } from "@/lib/validation";
import { useToast } from "@/components/ui/toast";
import { PUBLIC_ATTENDANCE_TYPES } from "@/modules/applications/attendance-types";

export function PublicApplyForm({
  orgSlug,
  eventSlug,
  siteKey,
}: {
  orgSlug: string;
  eventSlug: string;
  siteKey: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const toast = useToast();
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const onToken = useCallback((value: string | null) => {
    setTurnstileToken(value);
  }, []);

  if (submitted) {
    return (
      <div>
        <p className="text-[0.71875rem] font-semibold uppercase tracking-[0.04em] text-indigo-600">
          Received
        </p>
        <h2 className="mt-2 font-display text-3xl text-slate-900">
          Application submitted
        </h2>
        <p className="mt-2 text-sm text-slate-700">
          The organiser will review your application. If approved, you will
          receive an invitation. Applying is not registration.
        </p>
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      action={(formData) => {
        setError(null);
        setFieldErrors({});
        const firstName = String(formData.get("firstName") ?? "").trim();
        const lastName = String(formData.get("lastName") ?? "").trim();
        const email = String(formData.get("email") ?? "").trim();
        const attendanceType = String(formData.get("attendanceType") ?? "").trim();
        const nextFieldErrors: Record<string, string> = {};
        if (!firstName) nextFieldErrors.firstName = "First name is required.";
        if (!lastName) nextFieldErrors.lastName = "Last name is required.";
        if (!email) nextFieldErrors.email = "Email is required.";
        else if (!isValidEmail(email)) {
          nextFieldErrors.email = "Enter a valid email address.";
        }
        if (!attendanceType) {
          nextFieldErrors.attendanceType = "Select how you are attending.";
        }
        if (Object.keys(nextFieldErrors).length > 0) {
          setFieldErrors(nextFieldErrors);
          const message = Object.values(nextFieldErrors)[0] ?? "Check the form.";
          setError(message);
          toast.error(message);
          return;
        }
        if (siteKey && !turnstileToken) {
          const message = "Complete the bot check before submitting.";
          setError(message);
          toast.error(message);
          return;
        }
        start(async () => {
          const result = await submitPublicApplication(
            orgSlug,
            eventSlug,
            formData,
            turnstileToken ?? undefined,
          );
          if (!result.ok) {
            setError(result.error);
            toast.error(result.error);
            return;
          }
          toast.success("Application submitted.");
          setSubmitted(true);
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" name="firstName" required />
          {fieldErrors.firstName ? (
            <p className="mt-1 text-sm text-danger">{fieldErrors.firstName}</p>
          ) : null}
        </div>
        <div>
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" name="lastName" required />
          {fieldErrors.lastName ? (
            <p className="mt-1 text-sm text-danger">{fieldErrors.lastName}</p>
          ) : null}
        </div>
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
        {fieldErrors.email ? (
          <p className="mt-1 text-sm text-danger">{fieldErrors.email}</p>
        ) : null}
      </div>
      <div>
        <Label htmlFor="company">Organisation</Label>
        <Input id="company" name="company" />
      </div>
      <div>
        <Label htmlFor="jobTitle">Role</Label>
        <Input id="jobTitle" name="jobTitle" />
      </div>
      <div>
        <Label htmlFor="country">Country</Label>
        <Select id="country" name="country">
          <option value="">Select a country</option>
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="attendanceType">I am attending as</Label>
        <Select id="attendanceType" name="attendanceType" required>
          <option value="">Select attendance type</option>
          {PUBLIC_ATTENDANCE_TYPES.map((type) => (
            <option key={type.slug} value={type.slug}>
              {type.name}
            </option>
          ))}
        </Select>
        {fieldErrors.attendanceType ? (
          <p className="mt-1 text-sm text-danger">{fieldErrors.attendanceType}</p>
        ) : null}
      </div>
      <div>
        <Label htmlFor="message">Why you wish to attend</Label>
        <Textarea id="message" name="message" />
      </div>
      <TurnstileWidget siteKey={siteKey} onToken={onToken} />
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <div className="flex justify-end">
        <Button disabled={pending}>
          {pending ? "Submitting…" : "Submit application"}
        </Button>
      </div>
    </form>
  );
}
