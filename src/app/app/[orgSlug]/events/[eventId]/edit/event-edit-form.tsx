"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateEvent } from "@/modules/events/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { optionalUrlSchema, parseOptionalDateRange } from "@/lib/validation";

function toDatetimeLocal(value: Date | string | null) {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EventEditForm({
  orgSlug,
  eventId,
  event,
}: {
  orgSlug: string;
  eventId: string;
  event: {
    name: string;
    description: string | null;
    venue: string | null;
    timezone: string;
    startsAt: Date | string | null;
    endsAt: Date | string | null;
    website: string | null;
  };
}) {
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="space-y-4"
        action={(formData) => {
          setError(null);
          const name = String(formData.get("name") ?? "").trim();
          if (name.length < 2) {
            const message = "Event name must be at least 2 characters.";
            setError(message);
            toast.error(message);
            return;
          }
          const website = String(formData.get("website") ?? "").trim();
          const websiteResult = optionalUrlSchema.safeParse(website);
          if (!websiteResult.success) {
            const message =
              websiteResult.error.issues[0]?.message ??
              "Enter a valid website URL.";
            setError(message);
            toast.error(message);
            return;
          }
          const range = parseOptionalDateRange(
            String(formData.get("startsAt") ?? ""),
            String(formData.get("endsAt") ?? ""),
          );
          if (!range.ok) {
            setError(range.error);
            toast.error(range.error);
            return;
          }
          start(async () => {
            const result = await updateEvent(orgSlug, eventId, formData);
            if (!result.ok) {
              setError(result.error);
              toast.error(result.error);
              return;
            }
            toast.success("Event details saved.");
            router.push(`/app/${orgSlug}/events/${eventId}`);
            router.refresh();
          });
        }}
    >
        <div>
          <Label htmlFor="name">Event name</Label>
          <Input id="name" name="name" required defaultValue={event.name} />
        </div>
        <div>
          <Label htmlFor="venue">Venue</Label>
          <Input id="venue" name="venue" defaultValue={event.venue ?? ""} />
        </div>
        <div>
          <Label htmlFor="timezone">Timezone</Label>
          <Input id="timezone" name="timezone" defaultValue={event.timezone} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="startsAt">Starts</Label>
            <Input
              id="startsAt"
              name="startsAt"
              type="datetime-local"
              defaultValue={toDatetimeLocal(event.startsAt)}
            />
          </div>
          <div>
            <Label htmlFor="endsAt">Ends</Label>
            <Input
              id="endsAt"
              name="endsAt"
              type="datetime-local"
              defaultValue={toDatetimeLocal(event.endsAt)}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            name="website"
            placeholder="https://"
            defaultValue={event.website ?? ""}
          />
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            defaultValue={event.description ?? ""}
          />
        </div>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push(`/app/${orgSlug}/events/${eventId}`)}
          >
            Cancel
          </Button>
        </div>
    </form>
  );
}
