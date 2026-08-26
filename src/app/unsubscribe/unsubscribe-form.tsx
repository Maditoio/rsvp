"use client";

import { useState, useTransition } from "react";
import { unsubscribePlatformEmails } from "@/modules/communications/unsubscribe";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function UnsubscribeForm({ initialEmail }: { initialEmail: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (done) {
    return (
      <div className="rounded-xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
          You&apos;re unsubscribed
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          We won&apos;t send marketing or optional product emails to{" "}
          <strong className="text-slate-900">{email}</strong>. You may still
          receive critical transactional messages (for example invitation or
          security notices) when required to run an event you are part of.
        </p>
      </div>
    );
  }

  return (
    <form
      className="space-y-4 rounded-xl bg-white p-8 shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const fd = new FormData();
        fd.set("email", email);
        start(async () => {
          const result = await unsubscribePlatformEmails(fd);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setDone(true);
        });
      }}
    >
      <h1 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
        Unsubscribe
      </h1>
      <p className="text-sm text-slate-600">
        Stop receiving Bizcon RSVP marketing and optional product emails. Event
        organisers may still need to send essential invitation or registration
        messages for events you are involved in.
      </p>
      <div>
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          type="email"
          required
          className="mt-1.5"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <Button type="submit" disabled={pending || !email.trim()}>
        {pending ? "Working…" : "Unsubscribe"}
      </Button>
    </form>
  );
}
