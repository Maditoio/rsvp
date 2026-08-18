"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createEvent } from "@/modules/events/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function EventCreateForm({ orgSlug }: { orgSlug: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="space-y-4"
        action={(formData) => {
          setError(null);
          start(async () => {
            try {
              const result = await createEvent(orgSlug, formData);
              router.push(`/app/${orgSlug}/events/${result.eventId}`);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Could not create event");
            }
          });
        }}
    >
        <div>
          <Label htmlFor="name">Event name</Label>
          <Input
            id="name"
            name="name"
            required
            placeholder="Africa Mining Summit 2026"
          />
        </div>
        <div>
          <Label htmlFor="venue">Venue</Label>
          <Input
            id="venue"
            name="venue"
            placeholder="Cape Town International Convention Centre"
          />
        </div>
        <div>
          <Label htmlFor="timezone">Timezone</Label>
          <Input
            id="timezone"
            name="timezone"
            defaultValue="Africa/Johannesburg"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="startsAt">Starts</Label>
            <Input id="startsAt" name="startsAt" type="datetime-local" />
          </div>
          <div>
            <Label htmlFor="endsAt">Ends</Label>
            <Input id="endsAt" name="endsAt" type="datetime-local" />
          </div>
        </div>
        <div>
          <Label htmlFor="website">Website</Label>
          <Input id="website" name="website" placeholder="https://" />
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" name="description" />
        </div>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
      <div className="flex justify-end">
        <Button disabled={pending}>{pending ? "Saving…" : "Create event"}</Button>
      </div>
    </form>
  );
}
