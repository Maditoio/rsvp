"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveMyPrivacy } from "@/modules/attendees/profile";
import { matchmakingPath } from "@/modules/matchmaking/questionnaire";
import { Button } from "@/components/ui/button";

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
    showEmail: boolean;
    showPhone: boolean;
    aiInsightsOptIn: boolean;
  };
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const directoryHref = `/me/events/${eventId}/directory`;
  const matchingHref = matchmakingPath(eventId);

  return (
    <form
      className="max-w-xl space-y-4"
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
      <label className="flex items-start gap-3 text-sm text-slate-700">
        <input
          type="checkbox"
          name="profileVisible"
          defaultChecked={privacy.profileVisible}
          className="mt-1 size-4 accent-indigo-600"
        />
        <span>
          <span className="font-semibold">Show my profile in the directory</span>
          <span className="mt-1 block text-xs font-normal text-slate-500">
            Other registered attendees can find you and request a meeting. See
            recommendations in the{" "}
            <Link
              href={directoryHref}
              className="font-semibold text-slate-700 underline-offset-4 hover:underline"
            >
              Directory
            </Link>
            .
          </span>
        </span>
      </label>
      <label className="flex items-start gap-3 text-sm text-slate-700">
        <input
          type="checkbox"
          name="matchmakingEnabled"
          defaultChecked={privacy.matchmakingEnabled}
          className="mt-1 size-4 accent-indigo-600"
        />
        <span>
          <span className="font-semibold">Include me in basic matching</span>
          <span className="mt-1 block text-xs font-normal text-slate-500">
            Matching uses shared objectives from your{" "}
            <Link
              href={matchingHref}
              className="font-semibold text-slate-700 underline-offset-4 hover:underline"
            >
              matching profile
            </Link>
            . AI explanations are optional.
          </span>
        </span>
      </label>
      <label
        className={`flex items-start gap-3 text-sm ${
          eventAiEnabled ? "text-slate-700" : "text-slate-500"
        }`}
      >
        <input
          type="checkbox"
          name="aiInsightsOptIn"
          defaultChecked={privacy.aiInsightsOptIn}
          disabled={!eventAiEnabled}
          className="mt-1 size-4 accent-indigo-600 disabled:cursor-not-allowed"
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
      <label className="flex items-start gap-3 text-sm text-slate-700">
        <input
          type="checkbox"
          name="showEmail"
          defaultChecked={privacy.showEmail}
          className="mt-1 size-4 accent-indigo-600"
        />
        <span>
          <span className="font-semibold">Show my email</span>
          <span className="mt-1 block text-xs font-normal text-slate-500">
            Visible only to other registered attendees when your profile is shown.
          </span>
        </span>
      </label>
      <label className="flex items-start gap-3 text-sm text-slate-700">
        <input
          type="checkbox"
          name="showPhone"
          defaultChecked={privacy.showPhone}
          className="mt-1 size-4 accent-indigo-600"
        />
        <span>
          <span className="font-semibold">Show my phone</span>
          <span className="mt-1 block text-xs font-normal text-slate-500">
            Visible only to other registered attendees when your profile is shown.
          </span>
        </span>
      </label>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <div className="flex justify-end">
        <Button disabled={pending}>{pending ? "Saving…" : "Save privacy"}</Button>
      </div>
    </form>
  );
}
