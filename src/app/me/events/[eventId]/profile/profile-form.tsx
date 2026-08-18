"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveMyProfile } from "@/modules/attendees/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ProfileForm({
  eventId,
  profile,
}: {
  eventId: string;
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
          Comma-separated. Shared interests surface you higher in the directory.
        </p>
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <div className="flex justify-end">
        <Button disabled={pending}>{pending ? "Saving…" : "Save profile"}</Button>
      </div>
    </form>
  );
}
