"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, ExternalLink, Lock } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  createSessionTeamsMeeting,
  getTeamsMicrosoftConnectUrl,
  removeSessionTeamsMeeting,
} from "@/modules/meetings/session-teams-actions";
import { ONLINE_MEETING_PROVIDERS } from "@/modules/meetings/providers";

export type SessionOnlineMeeting = {
  provider: "TEAMS" | "ZOOM";
  joinUrl: string | null;
  providerMeetingId: string | null;
};

function TeamsMark() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        fill="#5059C9"
        d="M16.5 7.2c1.2 0 2.2-1 2.2-2.2S17.7 2.8 16.5 2.8 14.3 3.8 14.3 5s1 2.2 2.2 2.2z"
      />
      <path
        fill="#7B83EB"
        d="M19.8 8.5h-3.2c-.7 0-1.3.4-1.6 1v5.3c0 1.3 1.1 2.4 2.4 2.4h.1c1.5 0 2.7-1.2 2.7-2.7v-4.6c0-.8-.6-1.4-1.4-1.4z"
      />
      <path
        fill="#4B53BC"
        d="M8.8 7.8c1.5 0 2.7-1.2 2.7-2.7S10.3 2.4 8.8 2.4 6.1 3.6 6.1 5.1s1.2 2.7 2.7 2.7z"
      />
      <path
        fill="#7B83EB"
        d="M13.2 9H4.5C3.7 9 3 9.7 3 10.5v5.8C3 18.2 4.8 20 7 20h3.5c2.2 0 4-1.8 4-4v-5.5c0-.8-.7-1.5-1.5-1.5h.2z"
      />
    </svg>
  );
}

function ZoomMark() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect width="24" height="24" rx="4" fill="#2D8CFF" />
      <path
        fill="#fff"
        d="M5.5 8.5h7.2c.7 0 1.3.6 1.3 1.3v4.4c0 .7-.6 1.3-1.3 1.3H5.5c-.7 0-1.3-.6-1.3-1.3V9.8c0-.7.6-1.3 1.3-1.3zm9.2 1.2 3.6-2.1c.5-.3 1.2 0 1.2.6v6.6c0 .6-.7.9-1.2.6l-3.6-2.1v-3.6z"
      />
    </svg>
  );
}

export function SessionOnlineControls({
  orgSlug,
  eventId,
  sessionId,
  sessionTitle,
  whenLabel,
  format,
  meeting,
  microsoftConnected,
  microsoftNeedsReconnect,
  teamsStatus,
}: {
  orgSlug: string;
  eventId: string;
  sessionId: string | null;
  sessionTitle: string;
  whenLabel: string;
  format: "PHYSICAL" | "ONLINE" | "HYBRID";
  meeting: SessionOnlineMeeting | null;
  microsoftConnected: boolean;
  microsoftNeedsReconnect: boolean;
  teamsStatus?: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!teamsStatus || teamsStatus === "connected") return;
    if (teamsStatus === "access_denied") {
      setError("Microsoft access was denied. Try connecting again.");
    } else if (teamsStatus === "exchange_failed") {
      setError("Could not finish Microsoft connection. Try again.");
    } else if (teamsStatus === "invalid_session") {
      setError("Session not found after Microsoft connect.");
    }
  }, [teamsStatus]);

  if (format === "PHYSICAL") return null;

  if (!sessionId) {
    return (
      <p className="text-[0.8125rem] text-stone-500">
        Save the session first, then connect Microsoft Teams.
      </p>
    );
  }

  const teamsMeeting =
    meeting?.provider === "TEAMS" && meeting.joinUrl ? meeting : null;

  function copyLink() {
    if (!teamsMeeting?.joinUrl) return;
    void navigator.clipboard.writeText(teamsMeeting.joinUrl).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="space-y-2 border-t border-stone-100 pt-3">
      <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-bronze-500">
        Online platform
      </p>

      {teamsMeeting ? (
        <div className="rounded-sm border border-stone-200 bg-stone-0 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <TeamsMark />
            <p className="text-sm font-semibold text-ink-700">Microsoft Teams</p>
            <Badge tone="success">Created</Badge>
          </div>
          <p className="mt-1 truncate text-[0.8125rem] text-ink-800">
            {sessionTitle}
            {whenLabel ? (
              <span className="text-stone-500"> · {whenLabel}</span>
            ) : null}
          </p>
          <a
            href={teamsMeeting.joinUrl!}
            target="_blank"
            rel="noreferrer"
            className="mt-1 block truncate text-[0.75rem] font-medium text-ink-700 underline decoration-stone-300 underline-offset-2"
          >
            {teamsMeeting.joinUrl}
          </a>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <a
              href={teamsMeeting.joinUrl!}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-7 items-center justify-center rounded-sm bg-ink-700 px-2.5 text-[0.75rem] font-semibold text-white hover:bg-ink-800"
            >
              Join
            </a>
            <button
              type="button"
              onClick={copyLink}
              className="inline-flex h-7 items-center gap-1 rounded-sm border border-stone-300 px-2.5 text-[0.75rem] font-semibold text-ink-700 hover:bg-stone-50"
            >
              {copied ? (
                <Check className="size-3" aria-hidden />
              ) : (
                <Copy className="size-3" aria-hidden />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
            <a
              href={teamsMeeting.joinUrl!}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-7 items-center gap-1 rounded-sm border border-stone-300 px-2.5 text-[0.75rem] font-semibold text-ink-700 hover:bg-stone-50"
            >
              <ExternalLink className="size-3" aria-hidden />
              Open
            </a>
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirmRemove(true)}
              className="inline-flex h-7 items-center justify-center rounded-sm border border-stone-200 px-2.5 text-[0.75rem] font-semibold text-[#8A2E26] hover:bg-stone-50"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          {ONLINE_MEETING_PROVIDERS.map((provider) => {
            const active = provider.status === "active";
            const isTeams = provider.id === "TEAMS";
            return (
              <div
                key={provider.id}
                className={cn(
                  "flex items-center gap-2 rounded-sm border px-2.5 py-2",
                  active
                    ? "border-stone-200 bg-stone-0"
                    : "border-dashed border-stone-200 bg-stone-0 opacity-80",
                )}
              >
                {isTeams ? <TeamsMark /> : <ZoomMark />}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        active ? "text-ink-700" : "text-stone-600",
                      )}
                    >
                      {provider.label}
                    </p>
                    {active ? (
                      <Check className="size-3.5 text-moss-600" aria-hidden />
                    ) : (
                      <span className="inline-flex items-center gap-0.5 rounded-xs bg-bronze-100 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-bronze-600">
                        <Lock className="size-2.5" aria-hidden />
                        Coming soon
                      </span>
                    )}
                  </div>
                  <p className="text-[0.75rem] leading-tight text-stone-500">
                    {provider.description}
                  </p>
                </div>
                {active ? (
                  !microsoftConnected || microsoftNeedsReconnect ? (
                    <button
                      type="button"
                      disabled={pending}
                      className="shrink-0 inline-flex h-7 items-center justify-center rounded-sm bg-ink-700 px-2.5 text-[0.75rem] font-semibold text-white hover:bg-ink-800 disabled:opacity-60"
                      onClick={() => {
                        setError(null);
                        start(async () => {
                          try {
                            const href = await getTeamsMicrosoftConnectUrl(
                              orgSlug,
                              eventId,
                              sessionId,
                            );
                            window.location.href = href;
                          } catch (e) {
                            setError(
                              e instanceof Error
                                ? e.message
                                : "Could not start Microsoft connect",
                            );
                          }
                        });
                      }}
                    >
                      {microsoftNeedsReconnect ? "Reconnect" : "Connect"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={pending}
                      className="shrink-0 inline-flex h-7 items-center justify-center rounded-sm bg-ink-700 px-2.5 text-[0.75rem] font-semibold text-white hover:bg-ink-800 disabled:opacity-60"
                      onClick={() => {
                        setError(null);
                        start(async () => {
                          try {
                            await createSessionTeamsMeeting(
                              orgSlug,
                              eventId,
                              sessionId,
                            );
                            router.refresh();
                          } catch (e) {
                            setError(
                              e instanceof Error
                                ? e.message
                                : "Could not create Teams meeting",
                            );
                          }
                        });
                      }}
                    >
                      {pending ? "Creating…" : "Create meeting"}
                    </button>
                  )
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {teamsStatus === "connected" && !teamsMeeting ? (
        <p className="text-[0.75rem] text-moss-700">
          Microsoft connected. You can create a Teams meeting.
        </p>
      ) : null}

      <ConfirmDialog
        open={confirmRemove}
        onClose={() => !pending && setConfirmRemove(false)}
        title="Remove Teams meeting?"
        description="This will remove the Teams meeting from this session. The organisation Microsoft connection stays connected."
        confirmLabel="Remove meeting"
        cancelLabel="Cancel"
        destructive
        pending={pending}
        onConfirm={() => {
          setError(null);
          start(async () => {
            try {
              await removeSessionTeamsMeeting(orgSlug, eventId, sessionId);
              setConfirmRemove(false);
              router.refresh();
            } catch (e) {
              setError(
                e instanceof Error
                  ? e.message
                  : "Could not remove Teams meeting",
              );
              setConfirmRemove(false);
            }
          });
        }}
      />
    </div>
  );
}
