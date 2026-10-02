import { speakerDisplayName } from "@/modules/speakers/config";

export type SessionSpeakerPreview = {
  id: string;
  name: string;
  jobTitle: string | null;
  organization: string | null;
  photoUrl: string | null;
};

export function toSessionSpeakerPreview(speaker: {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle: string | null;
  organization: string | null;
  photoUrl: string | null;
}): SessionSpeakerPreview {
  return {
    id: speaker.id,
    name: speakerDisplayName(speaker),
    jobTitle: speaker.jobTitle,
    organization: speaker.organization,
    photoUrl: speaker.photoUrl,
  };
}

export function mapSessionSpeakers(
  links: {
    sortOrder: number;
    speaker: {
      id: string;
      firstName: string;
      lastName: string;
      jobTitle: string | null;
      organization: string | null;
      photoUrl: string | null;
    };
  }[],
): SessionSpeakerPreview[] {
  return [...links]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((link) => toSessionSpeakerPreview(link.speaker));
}
