"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveMyProfile } from "@/modules/attendees/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { matchmakingPath } from "@/modules/matchmaking/questionnaire";

export function ProfileForm({
  eventId,
  matchingComplete,
  profile,
}: {
  eventId: string;
  matchingComplete: boolean;
  profile: {
    about: string;
    lookingFor: string;
    offering: string;
    interests: string;
  };
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const matchingHref = matchmakingPath(eventId);

  return (
    <form
      className="max-w-xl space-y-4"
      action={(formData) => {
        setError(null);
        start(async () => {
          try {
            await saveMyProfile(eventId, formData);
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Could not save profile");
          }
        });
      }}
    >
      <div>
        <Label htmlFor="about">About</Label>
        <Textarea id="about" name="about" defaultValue={profile.about} />
      </div>
      {matchingComplete ? (
        <div className="space-y-3 rounded-md border border-stone-200 bg-stone-0 p-4">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-bronze-600">
            Matching
          </p>
          <p className="text-sm text-stone-700">
            Looking for, offering, industries and geography come from your
            matching questionnaire.
          </p>
          {profile.lookingFor ? (
            <p className="text-sm text-ink-800">
              <span className="text-stone-500">Looking for · </span>
              {profile.lookingFor}
            </p>
          ) : null}
          {profile.offering ? (
            <p className="text-sm text-ink-800">
              <span className="text-stone-500">Offering · </span>
              {profile.offering}
            </p>
          ) : null}
          {profile.interests ? (
            <p className="text-sm text-ink-800">
              <span className="text-stone-500">Interests · </span>
              {profile.interests}
            </p>
          ) : null}
          <Link
            href={matchingHref}
            className="inline-flex text-sm font-semibold text-ink-700 underline-offset-4 hover:underline"
          >
            Update matching answers
          </Link>
        </div>
      ) : (
        <>
          <div>
            <Label htmlFor="lookingFor">Looking for</Label>
            <Input id="lookingFor" name="lookingFor" defaultValue={profile.lookingFor} />
          </div>
          <div>
            <Label htmlFor="offering">Offering</Label>
            <Input id="offering" name="offering" defaultValue={profile.offering} />
          </div>
          <div>
            <Label htmlFor="interests">Interests</Label>
            <Input
              id="interests"
              name="interests"
              defaultValue={profile.interests}
              placeholder="Trade, energy, infrastructure"
            />
            <p className="mt-1 text-xs text-stone-500">
              Comma-separated, or complete{" "}
              <Link href={matchingHref} className="font-semibold text-ink-700 underline-offset-4 hover:underline">
                Matching
              </Link>{" "}
              for structured answers.
            </p>
          </div>
        </>
      )}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <div className="flex justify-end">
        <Button disabled={pending}>{pending ? "Saving…" : "Save profile"}</Button>
      </div>
    </form>
  );
}
