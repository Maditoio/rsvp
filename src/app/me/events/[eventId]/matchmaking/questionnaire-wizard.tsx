"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { saveMatchmakingQuestionnaire } from "@/modules/matchmaking/actions";
import {
  GEOGRAPHY_OPTIONS,
  INDUSTRY_OPTIONS,
  LOOKING_FOR_OPTIONS,
  MEETING_PREFERENCE_OPTIONS,
  OFFERING_OPTIONS,
  QUESTION_STEP_COUNT,
  toggleSelection,
  type MatchmakingQuestionnaire,
} from "@/modules/matchmaking/questionnaire";

type QuestionKey =
  | "lookingFor"
  | "offering"
  | "industries"
  | "geographies"
  | "meetingPreferences";

type Step =
  | "welcome"
  | QuestionKey
  | "visibility"
  | "done";

const QUESTION_STEPS: QuestionKey[] = [
  "lookingFor",
  "offering",
  "industries",
  "geographies",
  "meetingPreferences",
];

const QUESTIONS: Record<
  QuestionKey,
  { title: string; helper: string; options: readonly string[] }
> = {
  lookingFor: {
    title: "What are you looking for?",
    helper: "Select every objective that would make a meeting worthwhile.",
    options: LOOKING_FOR_OPTIONS,
  },
  offering: {
    title: "What do you offer?",
    helper: "What can you bring to a conversation at this event?",
    options: OFFERING_OPTIONS,
  },
  industries: {
    title: "Which industries matter here?",
    helper: "Choose the sectors you work in or want to meet around.",
    options: INDUSTRY_OPTIONS,
  },
  geographies: {
    title: "Where are you focused?",
    helper: "Mark the countries and regions relevant to your work.",
    options: GEOGRAPHY_OPTIONS,
  },
  meetingPreferences: {
    title: "Who do you want to meet?",
    helper: "We will rank people who match these meeting preferences.",
    options: MEETING_PREFERENCE_OPTIONS,
  },
};

function OptionTiles({
  options,
  selected,
  onToggle,
}: {
  options: readonly string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((option) => {
        const isOn = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            aria-pressed={isOn}
            onClick={() => onToggle(option)}
            className={cn(
              "rounded-sm border px-4 py-3 text-left text-[0.9375rem] transition-colors",
              isOn
                ? "border-ink-700 bg-stone-50 text-ink-800"
                : "border-stone-200 bg-stone-0 text-ink-800 hover:border-stone-300",
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

function BinaryTiles({
  value,
  onChange,
  yes,
  no,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
  yes: { label: string; hint: string };
  no: { label: string; hint: string };
}) {
  const tiles = [
    { on: true, ...yes },
    { on: false, ...no },
  ];
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {tiles.map((tile) => {
        const selected = value === tile.on;
        return (
          <button
            key={tile.label}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(tile.on)}
            className={cn(
              "rounded-sm border px-4 py-3 text-left transition-colors",
              selected
                ? "border-ink-700 bg-ink-700 text-white"
                : "border-stone-200 bg-stone-0 text-ink-800 hover:border-stone-300",
            )}
          >
            <span className="block text-[0.9375rem] font-semibold">{tile.label}</span>
            <span
              className={cn(
                "mt-1 block text-sm",
                selected ? "text-ink-100" : "text-stone-700",
              )}
            >
              {tile.hint}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function QuestionnaireWizard({
  eventId,
  eventName,
  initialQuestionnaire,
  initialPrivacy,
  alreadyComplete,
}: {
  eventId: string;
  eventName: string;
  initialQuestionnaire: MatchmakingQuestionnaire;
  initialPrivacy: { profileVisible: boolean; matchmakingEnabled: boolean };
  alreadyComplete: boolean;
}) {
  const [step, setStep] = useState<Step>("welcome");
  const [answers, setAnswers] = useState<MatchmakingQuestionnaire>(initialQuestionnaire);
  const [profileVisible, setProfileVisible] = useState(initialPrivacy.profileVisible);
  const [matchmakingEnabled, setMatchmakingEnabled] = useState(
    alreadyComplete ? initialPrivacy.matchmakingEnabled : true,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const questionIndex = QUESTION_STEPS.indexOf(step as QuestionKey);
  const visibilityIndex = step === "visibility" ? QUESTION_STEPS.length : -1;
  const progressIndex = questionIndex >= 0 ? questionIndex : visibilityIndex;
  const eventHref = `/me/events/${eventId}`;
  const directoryHref = `/me/events/${eventId}/directory`;

  function toggle(field: QuestionKey, value: string) {
    setAnswers((current) => ({
      ...current,
      [field]: toggleSelection(current[field], value),
    }));
  }

  function goNextFrom(current: Step) {
    if (current === "welcome") {
      setStep("lookingFor");
      return;
    }
    const index = QUESTION_STEPS.indexOf(current as QuestionKey);
    if (index >= 0 && index < QUESTION_STEPS.length - 1) {
      setStep(QUESTION_STEPS[index + 1]);
      return;
    }
    if (current === "meetingPreferences") {
      setStep("visibility");
    }
  }

  function goBackFrom(current: Step) {
    if (current === "lookingFor") {
      setStep("welcome");
      return;
    }
    const index = QUESTION_STEPS.indexOf(current as QuestionKey);
    if (index > 0) {
      setStep(QUESTION_STEPS[index - 1]);
      return;
    }
    if (current === "visibility") {
      setStep("meetingPreferences");
    }
  }

  function saveAndFinish() {
    setError(null);
    start(async () => {
      try {
        await saveMatchmakingQuestionnaire(eventId, {
          lookingFor: answers.lookingFor,
          offering: answers.offering,
          industries: answers.industries,
          geographies: answers.geographies,
          meetingPreferences: answers.meetingPreferences,
          profileVisible,
          matchmakingEnabled,
        });
        setStep("done");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save your answers");
      }
    });
  }

  if (step === "welcome") {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-bronze-600">
          {eventName}
        </p>
        <h1 className="mt-3 font-display text-3xl text-ink-800 sm:text-4xl">
          {alreadyComplete
            ? "Update who you want to meet"
            : "Your registration is complete"}
        </h1>
        <p className="mt-4 text-lg text-stone-700">
          {alreadyComplete
            ? "Review your matching answers so the directory can rank the right people."
            : "Set up who you want to meet. A few structured answers are enough to start matching."}
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Button type="button" onClick={() => goNextFrom("welcome")}>
            {alreadyComplete ? "Review answers" : "Set up matching profile"}
          </Button>
          <Link
            href={eventHref}
            className="text-[0.9375rem] text-stone-700 underline-offset-4 hover:text-ink-700 hover:underline"
          >
            Skip for now
          </Link>
        </div>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-bronze-600">
          Matching
        </p>
        <h1 className="mt-3 font-display text-3xl text-ink-800 sm:text-4xl">
          Your matches are ready
        </h1>
        <p className="mt-4 text-lg text-stone-700">
          Other visible delegates are ranked from your answers. You can update
          this setup at any time.
        </p>
        <p className="mt-3 text-sm text-stone-500">
          Optional AI explanations for matches can be enabled later in{" "}
          <Link
            href={`/me/events/${eventId}/privacy`}
            className="font-semibold text-ink-700 underline-offset-4 hover:underline"
          >
            privacy settings
          </Link>
          , when the organiser turns them on.
        </p>
        <div className="mt-10">
          <Link
            href={directoryHref}
            className="inline-flex h-11 items-center rounded-sm bg-ink-700 px-5 text-[0.9375rem] font-semibold text-white hover:bg-ink-800"
          >
            Open the directory
          </Link>
        </div>
      </div>
    );
  }

  if (step === "visibility") {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-bronze-600">
          Step {QUESTION_STEP_COUNT} of {QUESTION_STEP_COUNT}
        </p>
        <h1 className="mt-3 font-display text-3xl text-ink-800 sm:text-4xl">
          How should you appear?
        </h1>
        <p className="mt-4 text-lg text-stone-700">
          Directory visibility and matching are separate. Organisers still see
          your registration record.
        </p>
        <div className="mt-8 space-y-8">
          <div>
            <p className="mb-3 text-[0.8125rem] font-semibold text-ink-700">
              Show my profile in the directory
            </p>
            <BinaryTiles
              value={profileVisible}
              onChange={setProfileVisible}
              yes={{
                label: "Visible",
                hint: "Other registered attendees can find you.",
              }}
              no={{
                label: "Hidden",
                hint: "You stay off the attendee directory.",
              }}
            />
          </div>
          <div>
            <p className="mb-3 text-[0.8125rem] font-semibold text-ink-700">
              Include me in matching
            </p>
            <BinaryTiles
              value={matchmakingEnabled}
              onChange={setMatchmakingEnabled}
              yes={{
                label: "Include me",
                hint: "Use these answers to rank who you should meet.",
              }}
              no={{
                label: "Do not match",
                hint: "Keep the answers on file without ranking you.",
              }}
            />
          </div>
        </div>
        {error ? <p className="mt-6 text-sm text-danger">{error}</p> : null}
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => goBackFrom("visibility")}
            className="text-[0.9375rem] text-stone-700 hover:text-ink-700"
          >
            Back
          </button>
          <Button type="button" disabled={pending} onClick={saveAndFinish}>
            {pending ? "Saving…" : "Continue"}
          </Button>
        </div>
      </div>
    );
  }

  const question = QUESTIONS[step];
  const selected = answers[step];

  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-bronze-600">
        Step {progressIndex + 1} of {QUESTION_STEP_COUNT}
      </p>
      <h1 className="mt-3 font-display text-3xl text-ink-800 sm:text-4xl">
        {question.title}
      </h1>
      <p className="mt-4 text-lg text-stone-700">{question.helper}</p>
      <div className="mt-8">
        <OptionTiles
          options={question.options}
          selected={selected}
          onToggle={(value) => toggle(step, value)}
        />
      </div>
      <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => goBackFrom(step)}
          className="text-[0.9375rem] text-stone-700 hover:text-ink-700"
        >
          Back
        </button>
        <Button type="button" onClick={() => goNextFrom(step)}>
          Continue
        </Button>
      </div>
    </div>
  );
}
