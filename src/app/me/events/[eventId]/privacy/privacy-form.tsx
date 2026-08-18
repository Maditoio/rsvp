"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveMyPrivacy } from "@/modules/attendees/profile";
import { Button } from "@/components/ui/button";

export function PrivacyForm({
  eventId,
  privacy,
}: {
  eventId: string;
  privacy: {
    profileVisible: boolean;
    matchmakingEnabled: boolean;
    showEmail: boolean;
    showPhone: boolean;
  };
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

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
      <label className="flex items-start gap-3 text-sm text-ink-700">
        <input
          type="checkbox"
          name="profileVisible"
          defaultChecked={privacy.profileVisible}
          className="mt-1 size-4 accent-ink-700"
        />
        <span>
          <span className="font-semibold">Show my profile in the directory</span>
          <span className="mt-1 block text-xs font-normal text-stone-500">
            Other registered attendees can find you and request a meeting.
          </span>
        </span>
      </label>
      <label className="flex items-start gap-3 text-sm text-ink-700">
        <input
          type="checkbox"
          name="matchmakingEnabled"
          defaultChecked={privacy.matchmakingEnabled}
          className="mt-1 size-4 accent-ink-700"
        />
        <span>
          <span className="font-semibold">Include me in basic matching</span>
          <span className="mt-1 block text-xs font-normal text-stone-500">
            Shared interests and country are used to rank the directory. This is
            not AI matching.
          </span>
        </span>
      </label>
      <label className="flex items-start gap-3 text-sm text-ink-700">
        <input
          type="checkbox"
          name="showEmail"
          defaultChecked={privacy.showEmail}
          className="mt-1 size-4 accent-ink-700"
        />
        <span>
          <span className="font-semibold">Show my email</span>
          <span className="mt-1 block text-xs font-normal text-stone-500">
            Visible only to other registered attendees when your profile is shown.
          </span>
        </span>
      </label>
      <label className="flex items-start gap-3 text-sm text-ink-700">
        <input
          type="checkbox"
          name="showPhone"
          defaultChecked={privacy.showPhone}
          className="mt-1 size-4 accent-ink-700"
        />
        <span>
          <span className="font-semibold">Show my phone</span>
          <span className="mt-1 block text-xs font-normal text-stone-500">
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
