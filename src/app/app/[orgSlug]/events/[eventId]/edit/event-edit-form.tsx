"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import {
  generateEventDescriptionAction,
  improveEventDescriptionAction,
  updateEvent,
} from "@/modules/events/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { optionalUrlSchema, parseOptionalDateRange } from "@/lib/validation";
import { toDatetimeLocalValue } from "@/lib/timezone";
import { TimezoneSelect } from "@/components/timezone-select";
import { cn } from "@/lib/utils";

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
  const [description, setDescription] = useState(event.description ?? "");
  const [pending, start] = useTransition();
  const [generating, startGenerate] = useTransition();
  const [improving, startImprove] = useTransition();
  const aiBusy = generating || improving;
  const notesReady = description.trim().length >= 8;

  function collectContextFormData(form: HTMLFormElement) {
    const formData = new FormData(form);
    formData.set("notes", description);
    return formData;
  }

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
        const timezone =
          String(formData.get("timezone") ?? "UTC").trim() || "UTC";
        const range = parseOptionalDateRange(
          String(formData.get("startsAt") ?? ""),
          String(formData.get("endsAt") ?? ""),
          timezone,
        );
        if (!range.ok) {
          setError(range.error);
          toast.error(range.error);
          return;
        }
        formData.set("description", description);
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
      <TimezoneSelect defaultValue={event.timezone} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="startsAt">Starts</Label>
          <Input
            id="startsAt"
            name="startsAt"
            type="datetime-local"
            defaultValue={
              event.startsAt
                ? toDatetimeLocalValue(new Date(event.startsAt), event.timezone)
                : ""
            }
          />
        </div>
        <div>
          <Label htmlFor="endsAt">Ends</Label>
          <Input
            id="endsAt"
            name="endsAt"
            type="datetime-local"
            defaultValue={
              event.endsAt
                ? toDatetimeLocalValue(new Date(event.endsAt), event.timezone)
                : ""
            }
          />
        </div>
      </div>
      <p className="text-xs text-slate-500">
        Start and end times use the event timezone above.
      </p>
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
        <div className="flex flex-wrap items-end justify-between gap-2">
          <Label htmlFor="description">Description</Label>
          <p className="text-xs text-slate-400">
            <span className="font-medium text-indigo-600">Con·cierge AI</span>{" "}
            can draft from your notes
          </p>
        </div>
        <Textarea
          id="description"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="A few bullets or a short blurb about the event…"
          rows={6}
          className="mt-1.5"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={aiBusy || pending || !notesReady}
            onClick={(e) => {
              const form = e.currentTarget.form;
              if (!form) return;
              setError(null);
              startImprove(async () => {
                const result = await improveEventDescriptionAction(
                  orgSlug,
                  eventId,
                  collectContextFormData(form),
                );
                if (!result.ok) {
                  setError(result.error);
                  toast.error(result.error);
                  return;
                }
                setDescription(result.data.description);
                toast.success(
                  result.data.usedAi
                    ? "Con·cierge improved your description."
                    : (result.data.note ?? "Description polished."),
                );
              });
            }}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors",
              "text-slate-600 hover:bg-slate-100 hover:text-indigo-700",
              "disabled:cursor-not-allowed disabled:opacity-40",
            )}
          >
            <Sparkles className="size-3.5" strokeWidth={1.75} aria-hidden />
            {improving ? "Improving…" : "Improve"}
          </button>
          <button
            type="button"
            disabled={aiBusy || pending || !notesReady}
            onClick={(e) => {
              const form = e.currentTarget.form;
              if (!form) return;
              setError(null);
              startGenerate(async () => {
                const result = await generateEventDescriptionAction(
                  orgSlug,
                  eventId,
                  collectContextFormData(form),
                );
                if (!result.ok) {
                  setError(result.error);
                  toast.error(result.error);
                  return;
                }
                setDescription(result.data.description);
                toast.success(
                  result.data.usedAi
                    ? "Con·cierge drafted your description."
                    : (result.data.note ?? "Description drafted."),
                );
              });
            }}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors",
              "bg-indigo-600 text-white shadow-accent hover:bg-indigo-700",
              "disabled:cursor-not-allowed disabled:opacity-40",
            )}
          >
            <Sparkles className="size-3.5" strokeWidth={1.75} aria-hidden />
            {generating ? "Generating…" : "Generate"}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Add at least a short note, then Generate a full description or Improve
          what you have. Edit freely before saving.
        </p>
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <Button disabled={pending || aiBusy}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
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
