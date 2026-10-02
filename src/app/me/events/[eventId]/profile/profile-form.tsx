"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Upload } from "lucide-react";
import {
  removeMyProfilePhoto,
  saveMyProfile,
  uploadMyProfilePhoto,
  useAccountPhotoForProfile,
} from "@/modules/attendees/profile";
import { friendlyUploadFailure } from "@/modules/files/image-upload";
import { prepareImageForUpload } from "@/modules/files/prepare-image-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { matchmakingPath } from "@/modules/matchmaking/questionnaire";

export function ProfileForm({
  eventId,
  matchingComplete,
  accountPhotoUrl,
  profile,
}: {
  eventId: string;
  matchingComplete: boolean;
  accountPhotoUrl: string | null;
  profile: {
    about: string;
    lookingFor: string;
    offering: string;
    interests: string;
    industry: string;
    website: string;
    linkedinUrl: string;
    photoUrl: string | null;
  };
}) {
  const router = useRouter();
  const photoRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [photoPending, startPhoto] = useTransition();
  const matchingHref = matchmakingPath(eventId);

  return (
    <div className="max-w-xl space-y-6">
      <div className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
        <Label>Photo</Label>
        <div className="flex flex-wrap items-center gap-3">
          {profile.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.photoUrl}
              alt=""
              className="size-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex size-16 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-400">
              No photo
            </div>
          )}
          <input
            ref={photoRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={() => {
              const file = photoRef.current?.files?.[0];
              if (!file) return;
              setPhotoError(null);
              startPhoto(async () => {
                try {
                  const prepared = await prepareImageForUpload(file, "logo");
                  if (!prepared.ok) {
                    setPhotoError(prepared.error);
                    return;
                  }
                  const formData = new FormData();
                  formData.set("photo", prepared.file);
                  await uploadMyProfilePhoto(eventId, formData);
                  router.refresh();
                } catch (e) {
                  setPhotoError(
                    friendlyUploadFailure(e, "logo", "Could not upload photo"),
                  );
                } finally {
                  if (photoRef.current) photoRef.current.value = "";
                }
              });
            }}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={photoPending}
              leadingIcon={<Upload className="size-4" strokeWidth={1.75} />}
              onClick={() => photoRef.current?.click()}
            >
              {photoPending
                ? "Uploading…"
                : profile.photoUrl
                  ? "Replace photo"
                  : "Upload photo"}
            </Button>
            {accountPhotoUrl ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={photoPending}
                onClick={() => {
                  setPhotoError(null);
                  startPhoto(async () => {
                    try {
                      await useAccountPhotoForProfile(eventId);
                      router.refresh();
                    } catch (e) {
                      setPhotoError(
                        e instanceof Error
                          ? e.message
                          : "Could not use account photo",
                      );
                    }
                  });
                }}
              >
                Use account photo
              </Button>
            ) : null}
            {profile.photoUrl ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={photoPending}
                onClick={() => {
                  setPhotoError(null);
                  startPhoto(async () => {
                    try {
                      await removeMyProfilePhoto(eventId);
                      router.refresh();
                    } catch (e) {
                      setPhotoError(
                        e instanceof Error
                          ? e.message
                          : "Could not remove photo",
                      );
                    }
                  });
                }}
              >
                Remove
              </Button>
            ) : null}
          </div>
        </div>
        <p className="text-xs text-slate-500">
          Event-only photo — separate from your account. PNG, JPEG, or WebP.
        </p>
        {photoError ? <p className="text-sm text-danger">{photoError}</p> : null}
      </div>

      <form
        className="space-y-4"
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
          <Label htmlFor="industry">Industry</Label>
          <Input
            id="industry"
            name="industry"
            defaultValue={profile.industry}
            placeholder="Mining, Energy, Technology…"
          />
        </div>
        <div>
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            name="website"
            type="url"
            defaultValue={profile.website}
            placeholder="https://example.com"
          />
        </div>
        <div>
          <Label htmlFor="linkedinUrl">LinkedIn</Label>
          <Input
            id="linkedinUrl"
            name="linkedinUrl"
            type="url"
            defaultValue={profile.linkedinUrl}
            placeholder="https://www.linkedin.com/in/…"
          />
        </div>
        {matchingComplete ? (
          <div className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
            <p className="text-[0.71875rem] font-semibold uppercase tracking-[0.04em] text-indigo-600">
              Matching
            </p>
            <p className="text-sm text-slate-700">
              Looking for, offering, industries and geography come from your
              matching questionnaire.
            </p>
            {profile.lookingFor ? (
              <p className="text-sm text-slate-900">
                <span className="text-slate-500">Looking for · </span>
                {profile.lookingFor}
              </p>
            ) : null}
            {profile.offering ? (
              <p className="text-sm text-slate-900">
                <span className="text-slate-500">Offering · </span>
                {profile.offering}
              </p>
            ) : null}
            {profile.interests ? (
              <p className="text-sm text-slate-900">
                <span className="text-slate-500">Interests · </span>
                {profile.interests}
              </p>
            ) : null}
            <Link
              href={matchingHref}
              className="inline-flex text-sm font-semibold text-slate-700 underline-offset-4 hover:underline"
            >
              Update matching answers
            </Link>
          </div>
        ) : (
          <>
            <div>
              <Label htmlFor="lookingFor">Looking for</Label>
              <Input
                id="lookingFor"
                name="lookingFor"
                defaultValue={profile.lookingFor}
              />
            </div>
            <div>
              <Label htmlFor="offering">Offering</Label>
              <Input
                id="offering"
                name="offering"
                defaultValue={profile.offering}
              />
            </div>
            <div>
              <Label htmlFor="interests">Interests</Label>
              <Input
                id="interests"
                name="interests"
                defaultValue={profile.interests}
                placeholder="Trade, energy, infrastructure"
              />
              <p className="mt-1 text-xs text-slate-500">
                Comma-separated, or complete{" "}
                <Link
                  href={matchingHref}
                  className="font-semibold text-slate-700 underline-offset-4 hover:underline"
                >
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
    </div>
  );
}
