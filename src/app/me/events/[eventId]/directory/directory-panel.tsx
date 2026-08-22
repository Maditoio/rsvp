"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { displayName } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

export type { DirectoryPerson };

const DISCOVERY_STEPS = [
  "Analysing your objectives…",
  "Finding best matches…",
  "Ranking recommendations…",
] as const;

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

function buildConnectMessage(
  person: DirectoryPerson,
  eventName: string,
): string {
  const firstName = person.firstName?.trim() || displayName(person);
  return `Hi ${firstName},

I came across your profile through the ${eventName} matchmaking directory and would welcome the opportunity to connect during the event. I believe we may have complementary interests and would value a brief conversation at the summit.

Kind regards`;
}

function AiDiscoveryLoader({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = DISCOVERY_STEPS.map((_, index) =>
      window.setTimeout(() => setStep(index + 1), (index + 1) * 700),
    );
    const done = window.setTimeout(onComplete, DISCOVERY_STEPS.length * 700 + 400);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(done);
    };
  }, [onComplete]);

  return (
    <div className="rounded-md border border-stone-200 bg-stone-0 px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-bronze-100">
          <Sparkles className="size-5 text-bronze-700" aria-hidden />
        </div>
        <p className="mt-4 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-bronze-600">
          AI recommendations
        </p>
        <p className="mt-2 font-display text-xl text-ink-800">
          Finding your best matches
        </p>
        <p className="mt-2 text-sm text-stone-500">
          Reviewing objectives, complementarity, and shared context across the
          directory.
        </p>
        <div className="mt-6 space-y-2 text-left">
          {DISCOVERY_STEPS.map((label, index) => {
            const done = step > index;
            const active = step === index;
            return (
              <div
                key={label}
                className={cn(
                  "flex items-center gap-3 rounded-sm border px-3 py-2 text-sm transition-colors",
                  done
                    ? "border-moss-200 bg-moss-50 text-moss-600"
                    : active
                      ? "border-bronze-200 bg-bronze-50 text-bronze-700"
                      : "border-stone-200 bg-stone-50 text-stone-400",
                )}
              >
                <span
                  className={cn(
                    "size-1.5 shrink-0 rounded-full",
                    done
                      ? "bg-moss-500"
                      : active
                        ? "animate-pulse bg-bronze-500"
                        : "bg-stone-300",
                  )}
                  aria-hidden
                />
                {label}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SeeWhyPanel({
  eventId,
  targetId,
  reasons,
  eventAiEnabled = false,
  attendeeOptIn = false,
  cachedInsight = null,
}: {
  eventId: string;
  targetId: string;
  reasons: MatchReasons;
  eventAiEnabled?: boolean;
  attendeeOptIn?: boolean;
  cachedInsight?: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const [insight, setInsight] = useState<string | null>(cachedInsight);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canUseAi = eventAiEnabled && attendeeOptIn;
  const factors = reasonLabels(reasons);

  async function loadAiSummary() {
    setLoading(true);
    setError(null);
    setExpanded(true);
    try {
      const result = await getAiInsight(eventId, targetId);
      setInsight(result.insight);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate summary");
    } finally {
      setLoading(false);
    }
  }

  function handleSeeWhy() {
    if (canUseAi && !insight) {
      void loadAiSummary();
      return;
    }
    setExpanded((value) => !value);
  }

  if (!eventAiEnabled) {
    return factors.length > 0 ? (
      <div className="mt-4 border-t border-stone-200 pt-4">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "Hide match factors" : "See why"}
        </Button>
        {expanded ? (
          <ul className="mt-3 space-y-1.5 text-sm text-stone-700">
            {factors.map((label) => (
              <li key={label} className="flex gap-2">
                <span className="text-stone-400" aria-hidden>
                  ·
                </span>
                <span>{label}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    ) : null;
  }

  if (!attendeeOptIn) {
    return (
      <div className="mt-4 border-t border-stone-200 pt-4">
        <AiInsightTeaser
          eventId={eventId}
          eventAiEnabled={eventAiEnabled}
          attendeeOptIn={attendeeOptIn}
        />
      </div>
    );
  }

  return (
    <div className="mt-4 border-t border-stone-200 pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={loading}
          onClick={handleSeeWhy}
        >
          <Sparkles className="size-3.5" aria-hidden />
          {loading
            ? "Generating summary…"
            : expanded && insight
              ? "Hide summary"
              : "See why"}
        </Button>
        {!expanded && !insight ? (
          <span className="text-xs text-stone-500">
            AI summary of why this connection fits your objectives
          </span>
        ) : null}
      </div>
      {error ? <p className="mt-2 text-xs text-danger">{error}</p> : null}
      {expanded ? (
        <div className="mt-3 rounded-sm border border-stone-200 bg-stone-50 px-4 py-3">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-bronze-600">
            AI summary
          </p>
          {loading ? (
            <p className="mt-2 text-sm text-stone-500">
              Preparing a concise explanation of this recommendation…
            </p>
          ) : insight ? (
            <p className="mt-2 text-sm leading-relaxed text-stone-700">
              {insight}
            </p>
          ) : (
            <ul className="mt-2 space-y-1.5 text-sm text-stone-700">
              {factors.map((label) => (
                <li key={label} className="flex gap-2">
                  <span className="text-stone-400" aria-hidden>
                    ·
                  </span>
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
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
          paused. Turn it on to appear in others&apos; recommendation lists and
          see yours here.
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
  isTopMatch = false,
  eventId,
  eventAiEnabled,
  attendeeOptIn,
  onConnect,
}: {
  person: DirectoryPerson;
  recommended?: boolean;
  isTopMatch?: boolean;
  eventId: string;
  eventAiEnabled?: boolean;
  attendeeOptIn?: boolean;
  onConnect: (person: DirectoryPerson) => void;
}) {
  const bandText = matchBandLabel(person.band);
  const connectionLabel =
    person.connectionStatus === "connected"
      ? "Meeting scheduled"
      : person.connectionStatus === "pending_sent"
        ? "Request sent"
        : person.connectionStatus === "pending_received"
          ? "Respond in Meetings"
          : null;
  const canConnect = person.connectionStatus === "none";
  const initials = [person.firstName?.[0], person.lastName?.[0]]
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <article
      className={cn(
        "rounded-md border bg-stone-0 p-4 sm:p-5",
        isTopMatch ? "border-bronze-300" : "border-stone-200",
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-1 gap-4">
          <div
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
              isTopMatch
                ? "bg-bronze-100 text-bronze-800"
                : "bg-stone-100 text-ink-700",
            )}
            aria-hidden
          >
            {initials || "?"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[1.0625rem] font-semibold text-ink-800">
                {displayName(person)}
              </h3>
              {isTopMatch ? (
                <Badge tone="accent">Top match</Badge>
              ) : null}
              {recommended && person.band && bandText ? (
                <Badge tone={bandTone(person.band)}>{bandText}</Badge>
              ) : null}
              {connectionLabel ? (
                <Badge
                  tone={
                    person.connectionStatus === "connected" ? "success" : "muted"
                  }
                >
                  {connectionLabel}
                </Badge>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-stone-700">
              {[person.jobTitle, person.company, person.country]
                .filter(Boolean)
                .join(" · ") || "—"}
            </p>
            {person.about ? (
              <p className="mt-3 text-sm leading-relaxed text-stone-700">
                {person.about}
              </p>
            ) : null}
            {(person.lookingFor || person.offering) && (
              <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                {person.lookingFor ? (
                  <div>
                    <dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-stone-500">
                      Looking for
                    </dt>
                    <dd className="mt-0.5 text-sm text-stone-700">
                      {person.lookingFor}
                    </dd>
                  </div>
                ) : null}
                {person.offering ? (
                  <div>
                    <dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-stone-500">
                      Offering
                    </dt>
                    <dd className="mt-0.5 text-sm text-stone-700">
                      {person.offering}
                    </dd>
                  </div>
                ) : null}
              </dl>
            )}
            {person.sharedInterests.length > 0 || person.interests.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {person.sharedInterests.map((interest) => (
                  <Badge key={interest} tone="success">
                    {interest}
                  </Badge>
                ))}
                {person.interests
                  .filter((interest) => !person.sharedInterests.includes(interest))
                  .slice(0, 4)
                  .map((interest) => (
                    <Badge key={interest} tone="muted">
                      {interest}
                    </Badge>
                  ))}
              </div>
            ) : null}
            {(person.email || person.phone) && (
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
                {person.email ? <span>{person.email}</span> : null}
                {person.phone ? <span>{person.phone}</span> : null}
              </div>
            )}
            {recommended ? (
              <SeeWhyPanel
                eventId={eventId}
                targetId={person.id}
                reasons={person.reasons}
                eventAiEnabled={eventAiEnabled}
                attendeeOptIn={attendeeOptIn}
                cachedInsight={person.aiInsight}
              />
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-row flex-wrap gap-2 lg:flex-col lg:items-stretch">
          {recommended && eventAiEnabled ? (
            <p className="w-full text-right text-xs text-stone-500 lg:mb-1">
              Match score{" "}
              <span className="font-mono font-medium text-ink-700">
                {person.score}
              </span>
            </p>
          ) : null}
          {canConnect ? (
            <Button
              type="button"
              size="sm"
              variant={isTopMatch ? "primary" : "secondary"}
              className="lg:min-w-[8rem]"
              onClick={() => onConnect(person)}
            >
              Connect
            </Button>
          ) : person.connectionStatus === "pending_received" ? (
            <Link
              href={`/me/events/${eventId}/meetings`}
              className="inline-flex h-9 items-center justify-center rounded-sm border border-stone-300 px-3 text-[0.8125rem] font-semibold text-ink-700 hover:bg-stone-50 lg:min-w-[8rem]"
            >
              Open Meetings
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function DirectoryPanel({
  eventId,
  eventName,
  forYou,
  people,
  eventAiEnabled = false,
  attendeeOptIn = false,
  questionnaireComplete = false,
  matchmakingEnabled = false,
}: {
  eventId: string;
  eventName: string;
  forYou: DirectoryPerson[];
  people: DirectoryPerson[];
  eventAiEnabled?: boolean;
  attendeeOptIn?: boolean;
  questionnaireComplete?: boolean;
  matchmakingEnabled?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<DirectoryPerson | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [discoveryReady, setDiscoveryReady] = useState(!eventAiEnabled);

  const empty = forYou.length === 0 && people.length === 0;
  const showAiDiscovery = eventAiEnabled && forYou.length > 0;
  const topMatch = forYou[0] ?? null;
  const otherMatches = forYou.slice(1);
  const hasStrongOrGood = forYou.some(
    (person) => person.band === "strong" || person.band === "good",
  );

  function openConnect(person: DirectoryPerson) {
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
              {showAiDiscovery ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Sparkles className="size-4 text-bronze-600" aria-hidden />
                    <h2 className="text-[1.125rem] font-semibold text-ink-700">
                      AI recommendations
                    </h2>
                  </div>
                  <p className="mt-1 text-sm text-stone-500">
                    Ranked by complementarity across objectives, industries, and
                    shared context.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-[1.125rem] font-semibold text-ink-700">
                    For you
                  </h2>
                  <p className="mt-1 text-sm text-stone-500">
                    Highest complementarity from looking-for, offering, and
                    shared objectives.
                  </p>
                </>
              )}
            </div>

            {forYou.length === 0 ? (
              <ForYouEmpty
                eventId={eventId}
                questionnaireComplete={questionnaireComplete}
                matchmakingEnabled={matchmakingEnabled}
              />
            ) : showAiDiscovery && !discoveryReady ? (
              <AiDiscoveryLoader onComplete={() => setDiscoveryReady(true)} />
            ) : (
              <>
                {!hasStrongOrGood && !showAiDiscovery ? (
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

                {topMatch ? (
                  <div className="space-y-3">
                    {showAiDiscovery ? (
                      <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-bronze-600">
                        Top match
                      </p>
                    ) : null}
                    <PersonCard
                      person={topMatch}
                      recommended
                      isTopMatch={showAiDiscovery}
                      eventId={eventId}
                      eventAiEnabled={eventAiEnabled}
                      attendeeOptIn={attendeeOptIn}
                      onConnect={openConnect}
                    />
                  </div>
                ) : null}

                {otherMatches.length > 0 ? (
                  <div className="space-y-3">
                    {showAiDiscovery ? (
                      <p className="pt-2 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-stone-500">
                        More recommendations
                      </p>
                    ) : null}
                    {otherMatches.map((person) => (
                      <PersonCard
                        key={person.id}
                        person={person}
                        recommended
                        eventId={eventId}
                        eventAiEnabled={eventAiEnabled}
                        attendeeOptIn={attendeeOptIn}
                        onConnect={openConnect}
                      />
                    ))}
                  </div>
                ) : null}
              </>
            )}
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="text-[1.125rem] font-semibold text-ink-700">
                Directory
              </h2>
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
                  onConnect={openConnect}
                />
              ))
            )}
          </section>
        </>
      )}

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Connect"
        description={
          target
            ? `Send a connection request to ${displayName(target)}. They must accept before a meeting can be arranged.`
            : undefined
        }
      >
        {target ? (
          <form
            className="space-y-4"
            action={(formData) => {
              setError(null);
              const message = String(formData.get("message") ?? "");
              if (message.length > 500) {
                const err = "Message must be 500 characters or fewer.";
                setError(err);
                toast.error(err);
                return;
              }
              start(async () => {
                const result = await requestMeeting(eventId, formData);
                if (!result.ok) {
                  setError(result.error);
                  toast.error(result.error);
                  return;
                }
                toast.success("Connection request sent.");
                setOpen(false);
                router.refresh();
              });
            }}
          >
            <input type="hidden" name="targetId" value={target.id} />
            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea
                key={target.id}
                id="message"
                name="message"
                rows={7}
                defaultValue={buildConnectMessage(target, eventName)}
              />
            </div>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button disabled={pending}>
                {pending ? "Sending…" : "Connect"}
              </Button>
            </div>
          </form>
        ) : null}
      </Drawer>
    </div>
  );
}
