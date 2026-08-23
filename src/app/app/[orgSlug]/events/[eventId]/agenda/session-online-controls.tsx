"use client";

import { forwardRef, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, ExternalLink } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  createSessionTeamsMeeting,
  getTeamsMicrosoftConnectUrl,
  removeSessionTeamsMeeting,
} from "@/modules/meetings/session-teams-actions";
import { ONLINE_MEETING_PROVIDERS } from "@/modules/meetings/providers";
import { TeamsMark, ZoomMark } from "./session-provider-icons";

export type SessionOnlineMeeting = {
  provider: "TEAMS" | "ZOOM";
  joinUrl: string | null;
  providerMeetingId: string | null;
};

export const SessionOnlineControls = forwardRef<
  HTMLDivElement,
  {
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
  }
>(function SessionOnlineControls(
  {
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
  },
  ref,
) {
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
      <p ref={ref} className="text-[0.8125rem] text-slate-500">
        Save the session first, then connect Microsoft Teams.
      </p>
    );
  }

  const teamsMeeting =
    meeting?.provider === "TEAMS" && meeting.joinUrl ? meeting : null;
  const teamsConnected = microsoftConnected && !microsoftNeedsReconnect;

  function copyLink() {
    if (!teamsMeeting?.joinUrl) return;
    void navigator.clipboard.writeText(teamsMeeting.joinUrl).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div ref={ref} className="space-y-2 border-t border-slate-100 pt-3">
      <p className="text-[0.71875rem] font-semibold uppercase tracking-[0.04em] text-indigo-600">
        Online platform
      </p>

      {teamsMeeting ? (
        <div className="rounded-md border border-slate-200 bg-white px-3 py-2.5 shadow-xs">
          <div className="flex items-center gap-2">
            <TeamsMark />
            <p className="text-sm font-semibold text-slate-700">Microsoft Teams</p>
            <Badge tone="success">Created</Badge>
          </div>
          <p className="mt-1 truncate text-[0.8125rem] text-slate-900">
            {sessionTitle}
            {whenLabel ? (
              <span className="text-slate-500"> · {whenLabel}</span>
            ) : null}
          </p>
          <a
            href={teamsMeeting.joinUrl!}
            target="_blank"
            rel="noreferrer"
            className="mt-1 block truncate text-[0.75rem] font-medium text-slate-700 underline decoration-slate-300 underline-offset-2"
          >
            {teamsMeeting.joinUrl}
          </a>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <a
              href={teamsMeeting.joinUrl!}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-7 items-center justify-center rounded-full bg-indigo-600 px-2.5 text-[0.75rem] font-semibold text-white hover:bg-indigo-700"
            >
              Join
            </a>
            <button
              type="button"
              onClick={copyLink}
              className="inline-flex h-7 items-center gap-1 rounded-full border border-slate-200 px-2.5 text-[0.75rem] font-semibold text-slate-700 hover:bg-slate-50"
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
              className="inline-flex h-7 items-center gap-1 rounded-full border border-slate-200 px-2.5 text-[0.75rem] font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ExternalLink className="size-3" aria-hidden />
              Open
            </a>
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirmRemove(true)}
              className="inline-flex h-7 items-center justify-center rounded-full border border-slate-200 px-2.5 text-[0.75rem] font-semibold text-[#8A2E26] hover:bg-slate-50"
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
            const connected = isTeams && teamsConnected;
            const logoColored = isTeams && Boolean(teamsMeeting);

            return (
              <div
                key={provider.id}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg border px-2.5 py-2",
                  active
                    ? "border-slate-200 bg-white"
                    : "border-dashed border-slate-200 bg-white",
                )}
              >
                {isTeams ? (
                  <TeamsMark muted={!logoColored} />
                ) : (
                  <ZoomMark muted />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        active ? "text-slate-700" : "text-slate-500",
                      )}
                    >
                      {provider.label}
                    </p>
                    {isTeams && connected ? (
                      <span className="inline-flex items-center gap-0.5 text-[0.6875rem] font-semibold text-success">
                        <Check className="size-3" aria-hidden />
                        Connected
                      </span>
                    ) : null}
                    {!active ? (
                      <span className="text-[0.6875rem] font-semibold text-slate-500">
                        Coming soon
                      </span>
                    ) : null}
                    {isTeams && microsoftNeedsReconnect ? (
                      <span className="text-[0.6875rem] font-semibold text-indigo-600">
                        Reconnect required
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[0.75rem] leading-tight text-slate-500">
                    {isTeams && !connected
                      ? "Connect your Microsoft account to create Teams meetings."
                      : provider.description}
                  </p>
                </div>
                {active && isTeams ? (
                  !teamsConnected ? (
                    <button
                      type="button"
                      disabled={pending}
                      className="shrink-0 inline-flex h-7 items-center justify-center rounded-full bg-indigo-600 px-2.5 text-[0.75rem] font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
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
                      className="shrink-0 inline-flex h-7 items-center justify-center rounded-full bg-indigo-600 px-2.5 text-[0.75rem] font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
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
        <p className="text-[0.75rem] text-success">
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
});
