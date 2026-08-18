"use client";

import { useCallback, useState, useTransition } from "react";
import { submitPublicApplication } from "@/modules/applications/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TurnstileWidget } from "@/components/turnstile";

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
  const [submitted, setSubmitted] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const onToken = useCallback((value: string | null) => {
    setTurnstileToken(value);
  }, []);

  if (submitted) {
    return (
      <div>
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-bronze-600">
          Received
        </p>
        <h2 className="mt-2 font-display text-3xl text-ink-800">
          Application submitted
        </h2>
        <p className="mt-2 text-sm text-stone-700">
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
        if (siteKey && !turnstileToken) {
          setError("Complete the bot check before submitting.");
          return;
        }
        start(async () => {
          try {
            await submitPublicApplication(
              orgSlug,
              eventSlug,
              formData,
              turnstileToken ?? undefined,
            );
            setSubmitted(true);
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "Could not submit application",
            );
          }
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" name="firstName" required />
        </div>
        <div>
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" name="lastName" required />
        </div>
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
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
        <Input id="country" name="country" />
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
