"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveMyPrivacy } from "@/modules/attendees/profile";
import { matchmakingPath } from "@/modules/matchmaking/questionnaire";
import {
  PROFILE_VISIBILITY_FIELDS,
  type FieldVisibility,
  type ProfileVisibilityField,
  visibilityFieldLabel,
} from "@/modules/privacy";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

const FIELD_GROUPS: {
  title: string;
  fields: ProfileVisibilityField[];
}[] = [
  {
    title: "Identity",
    fields: ["name", "jobTitle", "company", "country", "photo", "industry"],
  },
  {
    title: "Profile",
    fields: ["about", "interests", "lookingFor", "offering", "website", "linkedin"],
  },
  {
    title: "Contact",
    fields: ["email", "phone"],
  },
];

export function PrivacyForm({
  eventId,
  eventAiEnabled,
  privacy,
}: {
  eventId: string;
  eventAiEnabled: boolean;
  privacy: {
    profileVisible: boolean;
    matchmakingEnabled: boolean;
    aiInsightsOptIn: boolean;
    visibility: FieldVisibility;
  };
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const directoryHref = `/me/events/${eventId}/directory`;
  const matchingHref = matchmakingPath(eventId);

  return (
    <form
      className="max-w-2xl space-y-6"
      action={(formData) => {
        setError(null);
        start(async () => {
          try {
            await saveMyPrivacy(eventId, formData);
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Could not save privacy");
          }
        });
      }}
    >
      <section className="space-y-4 rounded-xl bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Directory & matching</h2>
        <label className="flex items-start gap-3 text-body text-slate-700">
          <Checkbox
            name="profileVisible"
            defaultChecked={privacy.profileVisible}
            className="mt-0.5"
          />
          <span>
            <span className="font-semibold">Show my profile in the directory</span>
            <span className="mt-1 block text-xs font-normal text-slate-500">
              Other registered attendees can find you and request a meeting. See
              recommendations in the{" "}
              <Link
                href={directoryHref}
                className="font-semibold text-indigo-600 underline-offset-4 hover:underline"
              >
                Directory
              </Link>
              .
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3 text-body text-slate-700">
          <Checkbox
            name="matchmakingEnabled"
            defaultChecked={privacy.matchmakingEnabled}
            className="mt-0.5"
          />
          <span>
            <span className="font-semibold">Include me in basic matching</span>
            <span className="mt-1 block text-xs font-normal text-slate-500">
              Matching uses shared objectives from your{" "}
              <Link
                href={matchingHref}
                className="font-semibold text-indigo-600 underline-offset-4 hover:underline"
              >
                matching profile
              </Link>
              . AI explanations are optional.
            </span>
          </span>
        </label>
        <label
          className={`flex items-start gap-3 text-body ${
            eventAiEnabled ? "text-slate-700" : "text-slate-500"
          }`}
        >
          <Checkbox
            name="aiInsightsOptIn"
            defaultChecked={privacy.aiInsightsOptIn}
            disabled={!eventAiEnabled}
            className="mt-0.5"
          />
          <span>
            <span className="font-semibold">Allow AI to explain my matches</span>
            <span className="mt-1 block text-xs font-normal text-slate-500">
              {eventAiEnabled
                ? "When enabled, AI may write an explanation on Directory recommendations. Matching still uses shared objectives."
                : "The organiser has not enabled AI insights for this event. Matching still uses shared objectives."}
            </span>
          </span>
        </label>
      </section>

      <section className="space-y-4 rounded-xl bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Profile visibility</h2>
          <p className="mt-1 text-xs text-slate-500">
            Choose what other attendees can see when your profile is listed.
            Email and phone stay private unless you opt in. Organisers still see
            your registration record.
          </p>
        </div>

        {FIELD_GROUPS.map((group) => (
          <div key={group.title} className="space-y-2">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-slate-400">
              {group.title}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {group.fields.map((field) => (
                <label
                  key={field}
                  className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm text-slate-700"
                >
                  <Checkbox
                    name={`visibility.${field}`}
                    defaultChecked={privacy.visibility[field]}
                  />
                  <span className="font-medium">{visibilityFieldLabel(field)}</span>
                </label>
              ))}
            </div>
          </div>
        ))}

        {/* Ensure every known field stays in the posted set even if groups drift. */}
        <div className="hidden" aria-hidden>
          {PROFILE_VISIBILITY_FIELDS.filter(
            (field) => !FIELD_GROUPS.some((group) => group.fields.includes(field)),
          ).map((field) => (
            <Checkbox
              key={field}
              name={`visibility.${field}`}
              defaultChecked={privacy.visibility[field]}
            />
          ))}
        </div>
      </section>

      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <div className="flex justify-end">
        <Button disabled={pending}>{pending ? "Saving…" : "Save privacy"}</Button>
      </div>
    </form>
  );
}
