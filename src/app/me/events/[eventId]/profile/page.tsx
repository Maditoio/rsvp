import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { AuthzError } from "@/lib/db/tenant";
import { isQuestionnaireComplete } from "@/modules/matchmaking/questionnaire";
import { ProfileForm } from "./profile-form";

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export default async function AttendeeProfilePage({
  params,
}: PageProps<"/me/events/[eventId]/profile">) {
  const { eventId } = await params;
  const user = await safe(() => requireUser());
  const attendee = await prisma.attendee.findFirst({
    where: { eventId, userId: user.id },
    include: { profile: true, matchProfile: true, event: { select: { name: true } } },
  });
  if (!attendee) {
    await safe(async () => {
      throw new AuthzError("You are not registered for this event", 403);
    });
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[0.71875rem] font-semibold uppercase tracking-[0.04em] text-indigo-600">
          {attendee.event.name}
        </p>
        <h1 className="mt-1 font-display text-3xl text-slate-900">Profile</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-700">
          Visible attendees see this in the directory, subject to your privacy
          settings. Matching answers and visibility are managed separately.
        </p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <Link
            href={`/me/events/${eventId}/privacy`}
            className="font-semibold text-slate-700 underline-offset-4 hover:underline"
          >
            Privacy &amp; matching settings
          </Link>
          <Link
            href={`/me/events/${eventId}/matchmaking`}
            className="text-slate-600 underline-offset-4 hover:text-slate-700 hover:underline"
          >
            Matching questionnaire
          </Link>
        </div>
      </div>
      <ProfileForm
        eventId={eventId}
        matchingComplete={isQuestionnaireComplete(attendee.matchProfile?.questionnaire)}
        profile={{
          about: attendee.profile?.about ?? "",
          lookingFor: attendee.profile?.lookingFor ?? "",
          offering: attendee.profile?.offering ?? "",
          interests: asStringArray(attendee.profile?.interests).join(", "),
        }}
      />
    </div>
  );
}
