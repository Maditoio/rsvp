"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { createEvent } from "@/modules/events/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, toSlug } from "@/lib/utils";

type Step = 1 | 2 | 3 | 4;
type Format = "single_day" | "multi_day" | "meeting_focused";
type Access = "invitation_only" | "open_application";

const STEPS = [
  { id: 1 as const, label: "Event name" },
  { id: 2 as const, label: "Event details" },
  { id: 3 as const, label: "Access" },
  { id: 4 as const, label: "Event URL" },
];

export function EventCreateForm({ orgSlug }: { orgSlug: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState("");
  const [format, setFormat] = useState<Format | null>(null);
  const [access, setAccess] = useState<Access | null>(null);
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const suggestedSlug = useMemo(() => toSlug(name) || "event", [name]);
  const displaySlug = slugTouched ? slug : suggestedSlug;

  function goNext() {
    setError(null);
    if (step === 1) {
      if (name.trim().length < 2) {
        setError("Enter an event name (at least 2 characters).");
        return;
      }
      if (!slugTouched) setSlug(suggestedSlug);
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!format) {
        setError("Choose what best describes this event.");
        return;
      }
      setStep(3);
      return;
    }
    if (step === 3) {
      if (!access) {
        setError("Choose how guests will access the event.");
        return;
      }
      setStep(4);
    }
  }

  function submit() {
    setError(null);
    const finalSlug = (slugTouched ? slug : suggestedSlug).trim();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(finalSlug)) {
      setError("URL slug must use lowercase letters, numbers, and hyphens.");
      return;
    }

    const fd = new FormData();
    fd.set("name", name.trim());
    fd.set("slug", finalSlug);
    fd.set("timezone", "Africa/Johannesburg");
    fd.set(
      "allowPublicApplication",
      access === "open_application" ? "true" : "false",
    );
    // Format informs defaults later; venue/dates filled on edit / checklist
    void format;

    start(async () => {
      try {
        const result = await createEvent(orgSlug, fd);
        router.push(`/app/${orgSlug}/events/${result.eventId}?setup=1`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not create event");
      }
    });
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col px-4 py-10">
      <div className="mb-10 flex items-center justify-between gap-4">
        {step > 1 ? (
          <button
            type="button"
            className="text-sm font-medium text-bronze-700 hover:text-bronze-800"
            onClick={() => {
              setError(null);
              setStep((s) => (s > 1 ? ((s - 1) as Step) : s));
            }}
          >
            ← Back
          </button>
        ) : (
          <Link
            href={`/app/${orgSlug}/events`}
            className="text-sm font-medium text-bronze-700 hover:text-bronze-800"
          >
            ← Back
          </Link>
        )}
        <WizardStepper step={step} />
        <span className="w-16" aria-hidden />
      </div>

      {step === 1 ? (
        <div className="space-y-6 text-center">
          <div>
            <h1 className="font-display text-3xl text-ink-800">
              What is the name of your event?
            </h1>
          </div>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Kolwezi Mining Copper Summit"
            className="h-12 text-center text-base"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                goNext();
              }
            }}
          />
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="button" className="w-full" onClick={goNext}>
            Continue to next step
          </Button>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-6 text-center">
          <div>
            <h1 className="font-display text-3xl text-ink-800">
              What best describes &lsquo;{name.trim()}&rsquo;?
            </h1>
            <p className="mt-2 text-sm text-stone-600">
              This helps us customize your experience.
            </p>
          </div>
          <div className="space-y-3 text-left">
            <ChoiceCard
              selected={format === "single_day"}
              title="Single date, time and location"
              onClick={() => setFormat("single_day")}
            />
            <ChoiceCard
              selected={format === "multi_day"}
              title="Multiple dates, times or sessions"
              onClick={() => setFormat("multi_day")}
            />
            <ChoiceCard
              selected={format === "meeting_focused"}
              title="Meeting and networking focused"
              onClick={() => setFormat("meeting_focused")}
            />
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="button" className="w-full" onClick={goNext}>
            Continue
          </Button>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-6 text-center">
          <div>
            <h1 className="font-display text-3xl text-ink-800">
              How will guests join?
            </h1>
            <p className="mt-2 text-sm text-stone-600">
              This helps us customize your experience.
            </p>
          </div>
          <div className="space-y-3 text-left">
            <ChoiceCard
              selected={access === "invitation_only"}
              title="Invitation only — free to attend"
              onClick={() => setAccess("invitation_only")}
            />
            <ChoiceCard
              selected={access === "open_application"}
              title="Open applications — guests can apply"
              onClick={() => setAccess("open_application")}
            />
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="button" className="w-full" onClick={goNext}>
            Continue
          </Button>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="font-display text-3xl text-ink-800">
              Customize your event URL
            </h1>
            <p className="mt-2 text-sm text-stone-600">
              Used for public application links when applications are enabled.
            </p>
          </div>
          <div>
            <Label htmlFor="slug">Event URL</Label>
            <div className="mt-1 flex overflow-hidden rounded-sm border border-stone-200 bg-stone-0 focus-within:border-ink-400">
              <Input
                id="slug"
                value={displaySlug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]+/g, "-")
                      .replace(/-+/g, "-")
                      .replace(/^-|-$/g, ""),
                  );
                }}
                className="border-0 focus-visible:ring-0"
              />
              <span className="flex items-center border-l border-stone-200 bg-stone-50 px-3 text-xs text-stone-500">
                /{orgSlug}
              </span>
            </div>
            {displaySlug && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(displaySlug) ? (
              <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-moss-600">
                <CheckCircle2 className="size-4" aria-hidden />
                Looks good
              </p>
            ) : null}
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button
            type="button"
            className="w-full"
            disabled={pending}
            onClick={submit}
          >
            {pending ? "Creating…" : "Create event"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function WizardStepper({ step }: { step: Step }) {
  return (
    <ol className="flex items-center gap-2 text-xs sm:text-sm">
      {STEPS.map((item, index) => {
        const active = item.id === step;
        const done = item.id < step;
        return (
          <li key={item.id} className="flex items-center gap-2">
            {index > 0 ? (
              <span className="hidden h-px w-4 bg-stone-200 sm:block" aria-hidden />
            ) : null}
            <span
              className={cn(
                "inline-flex items-center gap-1.5",
                active && "font-semibold text-ink-800",
                done && "text-moss-600",
                !active && !done && "text-stone-400",
              )}
            >
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full text-[0.625rem] font-semibold sm:size-6 sm:text-xs",
                  active && "bg-ink-700 text-white",
                  done && "bg-moss-100 text-moss-700",
                  !active && !done && "bg-stone-100 text-stone-500",
                )}
              >
                {done ? "✓" : item.id}
              </span>
              <span className="hidden sm:inline">{item.label}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function ChoiceCard({
  title,
  selected,
  onClick,
}: {
  title: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-md border bg-stone-0 px-5 py-4 text-left text-sm font-medium transition-colors",
        selected
          ? "border-ink-700 ring-1 ring-ink-700/15 text-ink-800"
          : "border-stone-200 text-ink-800 hover:border-stone-300",
      )}
    >
      {title}
    </button>
  );
}
