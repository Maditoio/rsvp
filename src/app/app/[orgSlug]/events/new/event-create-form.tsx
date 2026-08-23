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
    <div className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-3xl flex-col px-6 py-16 sm:px-10 sm:py-20 lg:max-w-4xl lg:py-24">
      <div className="mb-16 flex items-center justify-between gap-6 sm:mb-20">
        {step > 1 ? (
          <button
            type="button"
            className="shrink-0 text-sm font-medium text-indigo-700 hover:text-indigo-800"
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
            className="shrink-0 text-sm font-medium text-indigo-700 hover:text-indigo-800"
          >
            ← Back
          </Link>
        )}
        <WizardStepper step={step} />
        <span className="hidden w-14 shrink-0 sm:block" aria-hidden />
      </div>

      {step === 1 ? (
        <div
          key="step-1"
          className="wizard-step-enter mx-auto w-full max-w-2xl space-y-10 text-center sm:space-y-12"
        >
          <div className="space-y-4">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-indigo-600">
              Step 1 of 3
            </p>
            <h1 className="font-display text-4xl leading-[1.15] text-slate-900 sm:text-5xl sm:leading-[1.1]">
              What is the name of your event?
            </h1>
          </div>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Kolwezi Mining Copper Summit"
            className="h-14 text-center text-lg sm:h-16 sm:text-xl"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                goNext();
              }
            }}
          />
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button
            type="button"
            size="lg"
            className="h-12 w-full text-base sm:h-14"
            onClick={goNext}
          >
            Continue
          </Button>
        </div>
      ) : null}

      {step === 2 ? (
        <div
          key="step-2"
          className="wizard-step-enter mx-auto w-full max-w-2xl space-y-10 text-center sm:space-y-12"
        >
          <div className="space-y-4">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-indigo-600">
              Step 2 of 3
            </p>
            <h1 className="font-display text-4xl leading-[1.15] text-slate-900 sm:text-5xl sm:leading-[1.1]">
              What best describes &lsquo;{name.trim()}&rsquo;?
            </h1>
            <p className="text-base text-slate-600">
              This helps us customize your experience.
            </p>
          </div>
          <div className="space-y-3.5 text-left">
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
          <Button
            type="button"
            size="lg"
            className="h-12 w-full text-base sm:h-14"
            onClick={goNext}
          >
            Continue
          </Button>
        </div>
      ) : null}

      {step === 3 ? (
        <div
          key="step-3"
          className="wizard-step-enter mx-auto w-full max-w-2xl space-y-10 text-center sm:space-y-12"
        >
          <div className="space-y-4">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-indigo-600">
              Step 3 of 3
            </p>
            <h1 className="font-display text-4xl leading-[1.15] text-slate-900 sm:text-5xl sm:leading-[1.1]">
              How will guests join?
            </h1>
            <p className="text-base text-slate-600">
              This helps us customize your experience.
            </p>
          </div>
          <div className="space-y-3.5 text-left">
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
          <Button
            type="button"
            size="lg"
            className="h-12 w-full text-base sm:h-14"
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
    <ol className="flex items-center gap-2.5 text-xs sm:gap-3 sm:text-sm">
      {STEPS.map((item, index) => {
        const active = item.id === step;
        const done = item.id < step;
        const Icon = item.icon;
        return (
          <li key={item.id} className="flex items-center gap-2.5 sm:gap-3">
            {index > 0 ? (
              <span
                className="hidden h-px w-6 bg-slate-200 sm:block lg:w-8"
                aria-hidden
              />
            ) : null}
            <span
              className={cn(
                "inline-flex items-center gap-2",
                active && "font-semibold text-slate-900",
                done && "text-success",
                !active && !done && "text-slate-400",
              )}
            >
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-lg sm:size-9",
                  active && "bg-indigo-600 text-white",
                  done && "bg-emerald-50 text-success",
                  !active && !done && "bg-slate-100 text-slate-500",
                )}
                aria-hidden
              >
                {done ? (
                  <Check className="size-4" strokeWidth={2.5} />
                ) : (
                  <Icon className="size-4" strokeWidth={2} />
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
        "flex w-full items-center gap-4 rounded-md border bg-white px-6 py-5 text-left text-base font-medium transition-colors",
        selected
          ? "border-indigo-600 text-slate-900 ring-1 ring-indigo-600/15"
          : "border-slate-200 text-slate-900 hover:border-slate-200",
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg",
          selected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600",
        )}
        aria-hidden
      >
        <Icon className="size-5" strokeWidth={2} />
      </span>
      <span>{title}</span>
    </button>
  );
}
