"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import {
  createEventSpeakerAction,
  updateEventSpeakerAction,
  uploadEventSpeakerPhotoAction,
} from "@/modules/speakers/actions";
import type { EventSpeakerRecord } from "@/modules/speakers/config";
import { speakerDisplayName } from "@/modules/speakers/config";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { COUNTRIES, isCountryName } from "@/lib/countries";
import { useToast } from "@/components/ui/toast";
import { prepareImageForUpload } from "@/modules/files/prepare-image-upload";
import { friendlyUploadFailure } from "@/modules/files/image-upload";

type Props = {
  orgSlug: string;
  eventId: string;
  speaker?: EventSpeakerRecord;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function SpeakerForm({
  orgSlug,
  eventId,
  speaker,
  open: controlledOpen,
  onOpenChange,
}: Props) {
  const isEdit = Boolean(speaker);
  const router = useRouter();
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [featured, setFeatured] = useState(speaker?.featured ?? false);
  const [hidden, setHidden] = useState(speaker?.hidden ?? false);
  const legacyCountry =
    speaker?.country && !isCountryName(speaker.country)
      ? speaker.country
      : null;

  return (
    <Drawer
      open={open}
      onClose={() => setOpen(false)}
      title={isEdit ? "Edit speaker" : "Add speaker"}
      description="Speaker details appear on the event website Speakers section."
      size="md"
    >
      <form
        ref={formRef}
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          const formData = new FormData(formRef.current!);
          if (speaker) formData.set("id", speaker.id);
          if (featured) formData.set("featured", "on");
          if (hidden) formData.set("hidden", "on");

          start(async () => {
            try {
              const result = isEdit
                ? await updateEventSpeakerAction(orgSlug, eventId, formData)
                : await createEventSpeakerAction(orgSlug, eventId, formData);

              if (!result.ok) {
                setError(result.error);
                toast.error(result.error);
                return;
              }

              const speakerId = isEdit
                ? speaker!.id
                : result.data?.speaker?.id;

              if (photoFile && speakerId) {
                const prepared = await prepareImageForUpload(photoFile, "logo");
                if (!prepared.ok) {
                  setError(prepared.error);
                  toast.error(prepared.error);
                  return;
                }
                const photoFd = new FormData();
                photoFd.set("speakerId", speakerId);
                photoFd.set("photo", prepared.file);
                const upload = await uploadEventSpeakerPhotoAction(
                  orgSlug,
                  eventId,
                  photoFd,
                );
                if (!upload.ok) {
                  setError(upload.error);
                  toast.error(upload.error);
                  return;
                }
              }

              formRef.current?.reset();
              setPhotoFile(null);
              setOpen(false);
              toast.success(isEdit ? "Speaker updated." : "Speaker added.");
              router.refresh();
            } catch (err) {
              const message = friendlyUploadFailure(
                err,
                "logo",
                isEdit ? "Could not update speaker." : "Could not add speaker.",
              );
              setError(message);
              toast.error(message);
            }
          });
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="speaker-first-name">First name</Label>
            <Input
              id="speaker-first-name"
              name="firstName"
              required
              defaultValue={speaker?.firstName ?? ""}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="speaker-last-name">Last name</Label>
            <Input
              id="speaker-last-name"
              name="lastName"
              defaultValue={speaker?.lastName ?? ""}
              className="mt-1.5"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="speaker-job-title">Job title</Label>
          <Input
            id="speaker-job-title"
            name="jobTitle"
            defaultValue={speaker?.jobTitle ?? ""}
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="speaker-organization">Organization</Label>
          <Input
            id="speaker-organization"
            name="organization"
            defaultValue={speaker?.organization ?? ""}
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="speaker-country">Country</Label>
          <Select
            id="speaker-country"
            name="country"
            defaultValue={speaker?.country ?? ""}
            autoComplete="country-name"
            className="mt-1.5"
          >
            <option value="">Select a country</option>
            {legacyCountry ? (
              <option value={legacyCountry}>{legacyCountry}</option>
            ) : null}
            {COUNTRIES.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="speaker-bio">Bio</Label>
          <Textarea
            id="speaker-bio"
            name="bio"
            rows={4}
            defaultValue={speaker?.bio ?? ""}
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="speaker-linkedin">LinkedIn URL</Label>
          <Input
            id="speaker-linkedin"
            name="linkedInUrl"
            type="url"
            defaultValue={speaker?.linkedInUrl ?? ""}
            placeholder="https://linkedin.com/in/…"
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="speaker-website">Website URL</Label>
          <Input
            id="speaker-website"
            name="websiteUrl"
            type="url"
            defaultValue={speaker?.websiteUrl ?? ""}
            placeholder="https://example.com"
            className="mt-1.5"
          />
        </div>

        <div className="space-y-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="size-4 rounded border-slate-300 text-indigo-600"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
            />
            Featured speaker (Spotlight layout)
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="size-4 rounded border-slate-300 text-indigo-600"
              checked={hidden}
              onChange={(e) => setHidden(e.target.checked)}
            />
            Hide from published website
          </label>
        </div>

        <div>
          <Label>Photo</Label>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {speaker?.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={speaker.photoUrl}
                alt={speakerDisplayName(speaker)}
                className="size-14 rounded-full object-cover"
              />
            ) : (
              <div className="flex size-14 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-400">
                No photo
              </div>
            )}
            <input
              ref={photoRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={() => {
                const file = photoRef.current?.files?.[0] ?? null;
                setPhotoFile(file);
              }}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leadingIcon={<Upload className="size-4" strokeWidth={1.75} />}
              onClick={() => photoRef.current?.click()}
            >
              {photoFile ? photoFile.name : speaker?.photoUrl ? "Replace photo" : "Upload photo"}
            </Button>
          </div>
        </div>

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : isEdit ? "Save changes" : "Add speaker"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
