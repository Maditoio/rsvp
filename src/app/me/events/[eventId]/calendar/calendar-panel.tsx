"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { disconnectCalendar } from "@/modules/calendar/actions";

type Connection = { id: string; provider: string };

export function CalendarPanel({
  eventId,
  connections,
  googleAuthUrl,
  microsoftAuthUrl,
}: {
  eventId: string;
  connections: Connection[];
  googleAuthUrl: string;
  microsoftAuthUrl: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const google = connections.find((c) => c.provider === "google") ?? null;
  const microsoft = connections.find((c) => c.provider === "microsoft") ?? null;

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

  return (
    <div className="max-w-lg space-y-4">
      <ProviderRow
        label="Google Calendar"
        connected={google}
        connectHref={googleAuthUrl}
        pending={pending && pendingId === google?.id}
        onDisconnect={google ? () => disconnect(google.id) : undefined}
      />

      <ProviderRow
        label="Microsoft Outlook"
        connected={microsoft}
        connectHref={microsoftAuthUrl}
        pending={pending && pendingId === microsoft?.id}
        onDisconnect={microsoft ? () => disconnect(microsoft.id) : undefined}
        unavailableHint={microsoftAuthUrl ? undefined : "Coming soon"}
      />

      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}

function ProviderRow({
  label,
  connected,
  connectHref,
  pending,
  onDisconnect,
  unavailableHint,
}: {
  label: string;
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
          <div>
            <p className="text-sm font-medium text-ink-800">{label} connected</p>
            <p className="mt-0.5 text-xs text-stone-500">
              Meetings will sync to this calendar automatically.
            </p>
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
        className="inline-flex h-10 w-full items-center justify-center rounded-sm border border-stone-200 bg-stone-0 px-4 text-sm font-medium text-ink-800 hover:border-ink-400 hover:bg-stone-50"
      >
        Connect {label}
      </a>
    );
  }

  return (
    <div>
      <button
        type="button"
        disabled
        className="inline-flex h-10 w-full cursor-not-allowed items-center justify-center rounded-sm border border-stone-200 bg-stone-50 px-4 text-sm font-medium text-stone-400"
      >
        Connect {label}
      </button>
      {unavailableHint ? (
        <p className="mt-1 text-xs text-stone-500">{unavailableHint}</p>
      ) : null}
    </div>
  );
}
