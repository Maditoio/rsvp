import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { AuthzError } from "@/lib/db/tenant";
import { AttendeeEventNav } from "@/components/attendee-event-nav";
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
    include: { profile: true, event: { select: { name: true } } },
  });
  if (!attendee) {
    await safe(async () => {
      throw new AuthzError("You are not registered for this event", 403);
    });
    return null;
  }

  return (
    <div className="space-y-6">
      <AttendeeEventNav eventId={eventId} current="Profile" />
      <div>
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-bronze-600">
          {attendee.event.name}
        </p>
        <h1 className="mt-1 font-display text-3xl text-ink-800">Profile</h1>
        <p className="mt-1 text-sm text-stone-700">
          Visible attendees see this in the directory, subject to your privacy
          settings.
        </p>
      </div>
      <ProfileForm
        eventId={eventId}
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
