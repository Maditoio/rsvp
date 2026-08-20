"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import {
  GoogleCalendarIcon,
  OutlookCalendarIcon,
} from "@/components/calendar-provider-icons";
import { Button } from "@/components/ui/button";
import { disconnectCalendar } from "@/modules/calendar/actions";

type Connection = { id: string; provider: string };
type ProviderKey = "google" | "microsoft";

const PROVIDERS: {
  key: ProviderKey;
  label: string;
  connectLabel: string;
  icon: ReactNode;
  match: (provider: string) => boolean;
}[] = [
  {
    key: "google",
    label: "Google",
    connectLabel: "Connect Google",
    icon: <GoogleCalendarIcon />,
    match: (p) => p === "google",
  },
  {
    key: "microsoft",
    label: "Outlook",
    connectLabel: "Connect Outlook",
    icon: <OutlookCalendarIcon />,
    match: (p) => p === "microsoft" || p === "outlook",
  },
];

export function CalendarPanel({
  eventId,
  connections,
  googleAuthUrl,
  microsoftAuthUrl,
  oauthError,
}: {
  eventId: string;
  connections: Connection[];
  googleAuthUrl: string;
  microsoftAuthUrl: string | null;
  oauthError?: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const connectHref: Record<ProviderKey, string | null> = {
    google: googleAuthUrl,
    microsoft: microsoftAuthUrl,
  };

  function disconnect(connectionId: string) {
    setError(null);
    setPendingId(connectionId);
    start(async () => {
      try {
        await disconnectCalendar(eventId, connectionId);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not disconnect");
      } finally {
        setPendingId(null);
      }
    });
  }

  const displayError =
    error ??
    (oauthError
      ? oauthErrorMessage(oauthError)
      : null);

  return (
    <div className="max-w-lg space-y-4">
      {PROVIDERS.map((provider) => {
        const connected =
          connections.find((c) => provider.match(c.provider)) ?? null;
        return (
          <ProviderRow
            key={provider.key}
            label={provider.label}
            connectLabel={provider.connectLabel}
            icon={provider.icon}
            connected={connected}
            connectHref={connectHref[provider.key]}
            pending={pending && pendingId === connected?.id}
            onDisconnect={
              connected ? () => disconnect(connected.id) : undefined
            }
            unavailableHint={
              provider.key === "microsoft" && !microsoftAuthUrl
                ? "Coming soon"
                : undefined
            }
          />
        );
      })}

      {displayError ? <p className="text-sm text-danger">{displayError}</p> : null}
    </div>
  );
}

function oauthErrorMessage(code: string) {
  switch (code) {
    case "access_denied":
      return "Calendar access was denied. Try connecting again.";
    case "exchange_failed":
      return "Could not finish calendar connection. Try again.";
    case "not_registered":
      return "You must be registered for this event to connect a calendar.";
    case "invalid_state":
      return "Calendar connection link was invalid. Open Calendar from the event and try again.";
    default:
      return "Could not connect calendar. Try again.";
  }
}

function ProviderRow({
  label,
  connectLabel,
  icon,
  connected,
  connectHref,
  pending,
  onDisconnect,
  unavailableHint,
}: {
  label: string;
  connectLabel: string;
  icon: ReactNode;
  connected: Connection | null;
  connectHref: string | null;
  pending: boolean;
  onDisconnect?: () => void;
  unavailableHint?: string;
}) {
  if (connected) {
    return (
      <div className="rounded-md border border-stone-200 bg-stone-0 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 shrink-0">{icon}</span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink-800">Connected</p>
              <p className="mt-0.5 text-xs text-stone-500">
                {label} — meetings will sync to this calendar automatically.
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={onDisconnect}
          >
            {pending ? "Disconnecting…" : "Disconnect"}
          </Button>
        </div>
      </div>
    );
  }

  if (connectHref) {
    return (
      <a
        href={connectHref}
        className="inline-flex h-10 w-full items-center justify-center gap-2.5 rounded-sm border border-stone-200 bg-stone-0 px-4 text-sm font-medium text-ink-800 hover:border-ink-400 hover:bg-stone-50"
      >
        <span className="shrink-0">{icon}</span>
        {connectLabel}
      </a>
    );
  }

  return (
    <div>
      <button
        type="button"
        disabled
        className="inline-flex h-10 w-full cursor-not-allowed items-center justify-center gap-2.5 rounded-sm border border-stone-200 bg-stone-50 px-4 text-sm font-medium text-stone-400"
      >
        <span className="shrink-0 opacity-60">{icon}</span>
        {connectLabel}
      </button>
      {unavailableHint ? (
        <p className="mt-1 text-xs text-stone-500">{unavailableHint}</p>
      ) : null}
    </div>
  );
}
