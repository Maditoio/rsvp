"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  CalendarRange,
  Check,
  Network,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";
import { createEvent } from "@/modules/events/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Step = 1 | 2 | 3;
type Format = "single_day" | "multi_day" | "meeting_focused";
type Access = "invitation_only" | "open_application";

const STEPS: { id: Step; label: string; icon: LucideIcon }[] = [
  { id: 1, label: "Name", icon: Sparkles },
  { id: 2, label: "Details", icon: CalendarRange },
  { id: 3, label: "Access", icon: Shield },
];

export function EventCreateForm({ orgSlug }: { orgSlug: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState("");
  const [format, setFormat] = useState<Format | null>(null);
  const [access, setAccess] = useState<Access | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function goNext() {
    setError(null);
    if (step === 1) {
      if (name.trim().length < 2) {
        setError("Enter an event name (at least 2 characters).");
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!format) {
        setError("Choose what best describes this event.");
        return;
      }
      setStep(3);
    }
  }

  function submit() {
    setError(null);
    if (!access) {
      setError("Choose how guests will access the event.");
      return;
    }

    const fd = new FormData();
    fd.set("name", name.trim());
    // Slug is derived server-side from the event name (createEvent → toSlug).
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
    <div className="mx-auto flex w-full max-w-xl flex-col px-6 py-8 sm:py-10">
      <div className="mb-8 flex items-center justify-between gap-4">
        {step > 1 ? (
          <button
            type="button"
            className="shrink-0 text-body font-medium text-indigo-600 hover:text-indigo-700"
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
            className="shrink-0 text-body font-medium text-indigo-600 hover:text-indigo-700"
          >
            ← Back
          </Link>
        )}
        <WizardStepper step={step} />
        <span className="hidden w-12 shrink-0 sm:block" aria-hidden />
      </div>

      {step === 1 ? (
        <div key="step-1" className="wizard-step-enter space-y-6">
          <div>
            <p className="text-label text-indigo-600">Step 1 of 3</p>
            <h1 className="mt-2 text-display text-slate-900">
              What is the name of your event?
            </h1>
          </div>
          <div>
            <Label htmlFor="event-name">Event name</Label>
            <Input
              id="event-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Kolwezi Mining Copper Summit"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  goNext();
                }
              }}
            />
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <div className="flex justify-end pt-2">
            <Button type="button" onClick={goNext}>
              Continue
            </Button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div key="step-2" className="wizard-step-enter space-y-6">
          <div>
            <p className="text-label text-indigo-600">Step 2 of 3</p>
            <h1 className="mt-2 text-display text-slate-900">
              What best describes &lsquo;{name.trim()}&rsquo;?
            </h1>
            <p className="mt-1 text-body text-slate-600">
              This helps us customize your experience.
            </p>
          </div>
          <div className="space-y-2.5">
            <ChoiceCard
              selected={format === "single_day"}
              title="Single date, time and location"
              icon={CalendarDays}
              onClick={() => setFormat("single_day")}
            />
            <ChoiceCard
              selected={format === "multi_day"}
              title="Multiple dates, times or sessions"
              icon={CalendarRange}
              onClick={() => setFormat("multi_day")}
            />
            <ChoiceCard
              selected={format === "meeting_focused"}
              title="Meeting and networking focused"
              icon={Network}
              onClick={() => setFormat("meeting_focused")}
            />
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <div className="flex justify-end pt-2">
            <Button type="button" onClick={goNext}>
              Continue
            </Button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div key="step-3" className="wizard-step-enter space-y-6">
          <div>
            <p className="text-label text-indigo-600">Step 3 of 3</p>
            <h1 className="mt-2 text-display text-slate-900">
              How will guests join?
            </h1>
            <p className="mt-1 text-body text-slate-600">
              This helps us customize your experience.
            </p>
          </div>
          <div className="space-y-2.5">
            <ChoiceCard
              selected={access === "invitation_only"}
              title="Invitation only — free to attend"
              icon={Shield}
              onClick={() => setAccess("invitation_only")}
            />
            <ChoiceCard
              selected={access === "open_application"}
              title="Open applications — guests can apply"
              icon={Users}
              onClick={() => setAccess("open_application")}
            />
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <div className="flex justify-end pt-2">
            <Button type="button" disabled={pending} onClick={submit}>
              {pending ? "Creating…" : "Create event"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function WizardStepper({ step }: { step: Step }) {
  return (
    <ol className="flex items-center gap-2 text-label">
      {STEPS.map((item, index) => {
        const active = item.id === step;
        const done = item.id < step;
        const Icon = item.icon;
        return (
          <li key={item.id} className="flex items-center gap-2">
            {index > 0 ? (
              <span
                className="hidden h-px w-4 bg-slate-200 sm:block"
                aria-hidden
              />
            ) : null}
            <span
              className={cn(
                "inline-flex items-center gap-1.5",
                active && "font-semibold text-slate-900",
                done && "text-success",
                !active && !done && "text-slate-400",
              )}
            >
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-full",
                  active && "bg-indigo-600 text-white",
                  done && "bg-emerald-50 text-success",
                  !active && !done && "bg-slate-100 text-slate-500",
                )}
                aria-hidden
              >
                {done ? (
                  <Check className="size-3.5" strokeWidth={2.5} />
                ) : (
                  <Icon className="size-3.5" strokeWidth={2} />
                )}
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
  icon: Icon,
  selected,
  onClick,
}: {
  title: string;
  icon: LucideIcon;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl bg-white px-4 py-3.5 text-left shadow-sm transition-[box-shadow,ring-color] duration-150",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30",
        selected
          ? "ring-2 ring-indigo-600/20"
          : "hover:shadow-md",
      )}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg",
          selected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600",
        )}
        aria-hidden
      >
        <Icon className="size-4" strokeWidth={2} />
      </span>
      <span className="text-body font-medium text-slate-900">{title}</span>
    </button>
  );
}
