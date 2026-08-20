import Link from "next/link";
import { Card, DecisionCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getMyAttendance } from "@/modules/attendees/actions";
import { requireUser } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { displayName, formatEventWindow } from "@/lib/utils";
import { prisma } from "@/lib/db/prisma";
import { rankedDirectory } from "@/modules/matchmaking/basic";
import {
  isQuestionnaireComplete,
  matchmakingPath,
} from "@/modules/matchmaking/questionnaire";
import { matchBandLabel, type MatchBand } from "@/modules/matchmaking/score";

const TOP_MATCH_COUNT = 3;

function bandTone(band: MatchBand): "success" | "default" | "muted" {
  if (band === "strong") return "success";
  if (band === "good") return "default";
  return "muted";
}

export default async function AttendeeEventPage({
  params,
}: PageProps<"/me/events/[eventId]">) {
  const { eventId } = await params;
  const user = await safe(() => requireUser());
  const attendance = await safe(() => getMyAttendance(eventId));
  const checkedInAt = attendance.checkIns[0]?.checkedInAt ?? null;
  const matchProfile = await prisma.matchmakingProfile.findFirst({
    where: {
      eventId,
      attendeeId: attendance.id,
      attendee: { userId: user.id },
    },
    select: { questionnaire: true },
  });
  const matchingComplete = isQuestionnaireComplete(matchProfile?.questionnaire);
  const directory = matchingComplete ? await rankedDirectory(eventId) : null;
  const topMatches = directory?.forYou.slice(0, TOP_MATCH_COUNT) ?? [];
  const directoryHref = `/me/events/${eventId}/directory`;

  return (
    <div className="space-y-6">
      <DecisionCard>
        <p className="text-xs uppercase tracking-[0.18em] text-bronze-200">
          My event
        </p>
        <h1 className="mt-2 font-display text-4xl">{attendance.event.name}</h1>
        <p className="mt-2 text-ink-100">
          {attendance.event.venue || "Venue TBC"} ·{" "}
          {formatEventWindow(
            attendance.event.startsAt,
            attendance.event.endsAt,
            attendance.event.timezone,
          )}
        </p>
      </DecisionCard>
      {!matchingComplete ? (
        <Card>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-bronze-600">
            Matching
          </p>
          <h2 className="mt-2 font-display text-2xl text-ink-800">
            Set up who you want to meet
          </h2>
          <p className="mt-2 text-sm text-stone-700">
            Your registration is complete. A short questionnaire ranks the
            directory around what you are looking for and what you offer.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <Link
              href={matchmakingPath(eventId)}
              className="inline-flex h-11 items-center rounded-sm bg-ink-700 px-5 text-[0.9375rem] font-semibold text-white hover:bg-ink-800"
            >
              Set up matching profile
            </Link>
            <span className="text-sm text-stone-500">You can skip this for now.</span>
          </div>
        </Card>
      ) : topMatches.length > 0 ? (
        <Card>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-bronze-600">
            For you
          </p>
          <h2 className="mt-2 font-display text-2xl text-ink-800">
            Suggested connections
          </h2>
          <p className="mt-2 text-sm text-stone-700">
            Top matches from your looking-for, offering, and shared objectives.
          </p>
          <ul className="mt-4 divide-y divide-stone-200 border-t border-stone-200">
            {topMatches.map((person) => {
              const bandText = matchBandLabel(person.band);
              return (
                <li key={person.id} className="py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-ink-800">
                      {displayName(person)}
                    </p>
                    {person.band && bandText ? (
                      <Badge tone={bandTone(person.band)}>{bandText}</Badge>
                    ) : null}
                  </div>
                  <p className="text-sm text-stone-700">
                    {[person.jobTitle, person.company]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </p>
                </li>
              );
            })}
          </ul>
          <Link
            href={directoryHref}
            className="mt-4 inline-flex text-sm font-semibold text-ink-700 underline-offset-4 hover:underline"
          >
            View directory &amp; matching
          </Link>
        </Card>
      ) : null}
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-2xl text-ink-800">Registration</h2>
          <Badge tone={attendance.status === "CHECKED_IN" ? "success" : "default"}>
            {attendance.status.replaceAll("_", " ")}
          </Badge>
        </div>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-stone-500">Name</dt>
            <dd className="text-ink-800">
              {attendance.firstName} {attendance.lastName}
            </dd>
          </div>
          <div>
            <dt className="text-stone-500">Company</dt>
            <dd className="text-ink-800">{attendance.company || "—"}</dd>
          </div>
          <div>
            <dt className="text-stone-500">Category</dt>
            <dd className="text-ink-800">{attendance.category?.name || "—"}</dd>
          </div>
          <div>
            <dt className="text-stone-500">Form status</dt>
            <dd className="text-ink-800">
              {attendance.registration?.status ?? "COMPLETED"}
            </dd>
          </div>
        </dl>
        {checkedInAt ? (
          <p className="mt-4 text-sm text-moss-600">
            Checked in {checkedInAt.toLocaleString()}
          </p>
        ) : null}
        <Link
          href={`/me/events/${eventId}/qr`}
          className="mt-6 inline-flex rounded-sm bg-ink-700 px-4 py-2 text-sm font-medium text-white"
        >
          Show my QR code
        </Link>
      </Card>
      {attendance.event.description ? (
        <Card>
          <h2 className="font-display text-2xl text-ink-800">About</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm text-stone-700">
            {attendance.event.description}
          </p>
        </Card>
      ) : null}
    </div>
  );
}
