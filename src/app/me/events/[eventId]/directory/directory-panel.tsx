"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { requestMeeting } from "@/modules/meetings/actions";
import { getAiInsight } from "@/modules/matchmaking/ai-actions";
import type { DirectoryPerson } from "@/modules/matchmaking/basic";
import { matchmakingPath } from "@/modules/matchmaking/questionnaire";
import { matchBandLabel, type MatchBand, type MatchReasons } from "@/modules/matchmaking/score";
import { AiInsightTeaser } from "@/components/matchmaking/ai-insight-teaser";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { displayName } from "@/lib/utils";

export type { DirectoryPerson };

function bandTone(band: MatchBand): "success" | "default" | "muted" {
  if (band === "strong") return "success";
  if (band === "good") return "default";
  return "muted";
}

function reasonLabels(reasons: MatchReasons): string[] {
  if (reasons.labels.length > 0) return reasons.labels;
  const fallback: string[] = [];
  if (reasons.lookingOfferingOverlap.length > 0) {
    fallback.push(
      `They offer what you are looking for: ${reasons.lookingOfferingOverlap.join(", ")}`,
    );
  }
  if (reasons.offeringLookingOverlap.length > 0) {
    fallback.push(
      `You offer what they are looking for: ${reasons.offeringLookingOverlap.join(", ")}`,
    );
  }
  if (reasons.sharedIndustries.length > 0) {
    fallback.push(`Shared industries: ${reasons.sharedIndustries.join(", ")}`);
  }
  if (reasons.sharedGeographies.length > 0) {
    fallback.push(`Shared geographies: ${reasons.sharedGeographies.join(", ")}`);
  }
  if (reasons.sharedMeetingPreferences.length > 0) {
    fallback.push(
      `Shared meeting preferences: ${reasons.sharedMeetingPreferences.join(", ")}`,
    );
  }
  if (reasons.sharedInterests.length > 0) {
    fallback.push(`Shared interests: ${reasons.sharedInterests.join(", ")}`);
  }
  if (reasons.sameCountry) {
    fallback.push("You are based in the same country");
  }
  return fallback;
}

function AiInsightCard({
  eventId,
  targetId,
  eventAiEnabled = false,
  attendeeOptIn = false,
  cachedInsight = null,
}: {
  eventId: string;
  targetId: string;
  eventAiEnabled?: boolean;
  attendeeOptIn?: boolean;
  cachedInsight?: string | null;
}) {
  const [insight, setInsight] = useState<string | null>(cachedInsight);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!eventAiEnabled || !attendeeOptIn) {
    return (
      <AiInsightTeaser
        eventId={eventId}
        eventAiEnabled={eventAiEnabled}
        attendeeOptIn={attendeeOptIn}
      />
    );
  }

  if (insight) {
    return (
      <div className="rounded-md border border-stone-200 bg-stone-0 px-3 py-2">
        <Badge tone="accent">AI insight</Badge>
        <p className="mt-2 text-sm text-stone-700">{insight}</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-stone-200 bg-stone-0 px-3 py-2">
      <Badge tone="accent">AI insight</Badge>
      <p className="mt-2 text-sm text-stone-700">
        Generate a short explanation of why this connection fits your objectives.
      </p>
      {error ? <p className="mt-2 text-xs text-danger">{error}</p> : null}
      <div className="mt-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            setError(null);
            try {
              const result = await getAiInsight(eventId, targetId);
              setInsight(result.insight);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Could not generate insight");
            } finally {
              setLoading(false);
            }
          }}
        >
          {loading ? "Generating…" : "Get AI insight"}
        </Button>
      </div>
    </div>
  );
}

function ForYouEmpty({
  eventId,
  questionnaireComplete,
  matchmakingEnabled,
}: {
  eventId: string;
  questionnaireComplete: boolean;
  matchmakingEnabled: boolean;
}) {
  if (!questionnaireComplete) {
    return (
      <div className="rounded-md border border-stone-200 bg-stone-0 px-4 py-4">
        <p className="text-sm text-stone-700">
          Complete your matching questionnaire to see ranked recommendations
          based on looking-for, offering, and shared objectives.
        </p>
        <Link
          href={matchmakingPath(eventId)}
          className="mt-3 inline-flex text-sm font-semibold text-ink-700 underline-offset-4 hover:underline"
        >
          Set up matching profile
        </Link>
      </div>
    );
  }

  if (!matchmakingEnabled) {
    return (
      <div className="rounded-md border border-stone-200 bg-stone-0 px-4 py-4">
        <p className="text-sm text-stone-700">
          Matching is off in your privacy settings, so recommendations are
          paused. Turn it on to appear in others&apos; For you lists and see
          yours here.
        </p>
        <Link
          href={`/me/events/${eventId}/privacy`}
          className="mt-3 inline-flex text-sm font-semibold text-ink-700 underline-offset-4 hover:underline"
        >
          Open privacy settings
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-stone-200 bg-stone-0 px-4 py-4">
      <p className="text-sm text-stone-700">
        No strong complementary matches yet. Browse the directory below, or
        refine what you are looking for and offering.
      </p>
      <div className="mt-3 flex flex-wrap gap-4">
        <Link
          href={matchmakingPath(eventId)}
          className="inline-flex text-sm font-semibold text-ink-700 underline-offset-4 hover:underline"
        >
          Update matching profile
        </Link>
        <Link
          href={`/me/events/${eventId}/privacy`}
          className="inline-flex text-sm text-stone-500 underline-offset-4 hover:underline"
        >
          Privacy &amp; matching
        </Link>
      </div>
    </div>
  );
}

function PersonCard({
  person,
  recommended,
  eventId,
  eventAiEnabled,
  attendeeOptIn,
  onRequest,
}: {
  person: DirectoryPerson;
  recommended?: boolean;
  eventId: string;
  eventAiEnabled?: boolean;
  attendeeOptIn?: boolean;
  onRequest: (person: DirectoryPerson) => void;
}) {
  const bandText = matchBandLabel(person.band);
  const why = recommended ? reasonLabels(person.reasons) : [];

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-ink-800">{displayName(person)}</p>
            {recommended && person.band && bandText ? (
              <Badge tone={bandTone(person.band)}>{bandText}</Badge>
            ) : null}
          </div>
          <p className="text-sm text-stone-700">
            {[person.jobTitle, person.company, person.country]
              .filter(Boolean)
              .join(" · ") || "—"}
          </p>
          {person.about ? (
            <p className="mt-2 text-sm text-stone-700">{person.about}</p>
          ) : null}
          {person.lookingFor ? (
            <p className="mt-2 text-xs text-stone-500">Looking for {person.lookingFor}</p>
          ) : null}
          {person.offering ? (
            <p className="text-xs text-stone-500">Offering {person.offering}</p>
          ) : null}
          {person.email ? (
            <p className="mt-2 text-xs text-stone-500">{person.email}</p>
          ) : null}
          {person.phone ? (
            <p className="text-xs text-stone-500">{person.phone}</p>
          ) : null}
          {recommended && why.length > 0 ? (
            <div className="mt-4 border-t border-stone-200 pt-3">
              <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-stone-500">
                Why we recommend this connection
              </p>
              <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm text-stone-700">
                {why.map((label) => (
                  <li key={label}>{label}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {person.sharedInterests.length > 0 || person.interests.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {person.sharedInterests.map((interest) => (
                <Badge key={interest} tone="accent">
                  {interest}
                </Badge>
              ))}
              {person.interests
                .filter((interest) => !person.sharedInterests.includes(interest))
                .map((interest) => (
                  <Badge key={interest} tone="muted">
                    {interest}
                  </Badge>
                ))}
            </div>
          ) : null}
          {recommended ? (
            <div className="mt-3">
              <AiInsightCard
                eventId={eventId}
                targetId={person.id}
                eventAiEnabled={eventAiEnabled}
                attendeeOptIn={attendeeOptIn}
                cachedInsight={person.aiInsight}
              />
            </div>
          ) : null}
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => onRequest(person)}
        >
          Request meeting
        </Button>
      </div>
    </Card>
  );
}

export function DirectoryPanel({
  eventId,
  forYou,
  people,
  eventAiEnabled = false,
  attendeeOptIn = false,
  questionnaireComplete = false,
  matchmakingEnabled = false,
}: {
  eventId: string;
  forYou: DirectoryPerson[];
  people: DirectoryPerson[];
  eventAiEnabled?: boolean;
  attendeeOptIn?: boolean;
  questionnaireComplete?: boolean;
  matchmakingEnabled?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<DirectoryPerson | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const empty = forYou.length === 0 && people.length === 0;
  const hasStrongOrGood = forYou.some(
    (person) => person.band === "strong" || person.band === "good",
  );

  function openRequest(person: DirectoryPerson) {
    setTarget(person);
    setError(null);
    setOpen(true);
  }

  return (
    <div className="space-y-8">
      {empty ? (
        <div className="rounded-md border border-stone-200 bg-stone-0 px-4 py-4">
          <p className="text-sm text-stone-700">
            No other visible profiles yet. Ask attendees to complete their
            profile and leave directory visibility on.
          </p>
          {!questionnaireComplete ? (
            <Link
              href={matchmakingPath(eventId)}
              className="mt-3 inline-flex text-sm font-semibold text-ink-700 underline-offset-4 hover:underline"
            >
              Set up matching profile
            </Link>
          ) : null}
        </div>
      ) : (
        <>
          <section className="space-y-4">
            <div>
              <h2 className="text-[1.125rem] font-semibold text-ink-700">For you</h2>
              <p className="mt-1 text-sm text-stone-500">
                Highest complementarity from looking-for, offering, and shared
                objectives.
              </p>
            </div>
            {forYou.length === 0 ? (
              <ForYouEmpty
                eventId={eventId}
                questionnaireComplete={questionnaireComplete}
                matchmakingEnabled={matchmakingEnabled}
              />
            ) : (
              <>
                {!hasStrongOrGood ? (
                  <p className="text-sm text-stone-500">
                    No strong or good matches yet — these are possible
                    connections. Refine your{" "}
                    <Link
                      href={matchmakingPath(eventId)}
                      className="font-semibold text-ink-700 underline-offset-4 hover:underline"
                    >
                      matching profile
                    </Link>{" "}
                    for better ranking.
                  </p>
                ) : null}
                {forYou.map((person) => (
                  <PersonCard
                    key={person.id}
                    person={person}
                    recommended
                    eventId={eventId}
                    eventAiEnabled={eventAiEnabled}
                    attendeeOptIn={attendeeOptIn}
                    onRequest={openRequest}
                  />
                ))}
              </>
            )}
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="text-[1.125rem] font-semibold text-ink-700">Directory</h2>
              <p className="mt-1 text-sm text-stone-500">
                Other visible attendees at this event.
              </p>
            </div>
            {people.length === 0 ? (
              <p className="text-sm text-stone-700">
                Everyone visible is already listed above.
              </p>
            ) : (
              people.map((person) => (
                <PersonCard
                  key={person.id}
                  person={person}
                  eventId={eventId}
                  onRequest={openRequest}
                />
              ))
            )}
          </section>
        </>
      )}

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Request a meeting"
        description={
          target
            ? `Send a request to ${displayName(target)}. They must accept before a meeting is created.`
            : undefined
        }
      >
        {target ? (
          <form
            className="space-y-4"
            action={(formData) => {
              setError(null);
              start(async () => {
                try {
                  await requestMeeting(eventId, formData);
                  setOpen(false);
                  router.refresh();
                } catch (e) {
                  setError(
                    e instanceof Error ? e.message : "Could not send request",
                  );
                }
              });
            }}
          >
            <input type="hidden" name="targetId" value={target.id} />
            <div>
              <Label htmlFor="message">Note (optional)</Label>
              <Textarea id="message" name="message" />
            </div>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <div className="flex justify-end">
              <Button disabled={pending}>
                {pending ? "Sending…" : "Send request"}
              </Button>
            </div>
          </form>
        ) : null}
      </Drawer>
    </div>
  );
}
