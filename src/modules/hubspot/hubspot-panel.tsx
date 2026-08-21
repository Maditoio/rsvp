"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { disconnectHubSpot } from "@/modules/hubspot/actions";

function HubSpotMark() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        fill="#FF7A59"
        d="M18.164 7.87V5.095a2.186 2.186 0 0 0 1.267-1.978v-.066A2.187 2.187 0 0 0 17.25.87h-.066a2.187 2.187 0 0 0-2.186 2.181v.066c0 .855.485 1.594 1.199 1.95v2.81a5.85 5.85 0 0 0-2.785 1.326l-7.38-5.746a2.552 2.552 0 0 0 .1-.688A2.525 2.525 0 1 0 3.606 5.3c0 .47.13.91.356 1.29l7.23 5.63a5.83 5.83 0 0 0-.43 2.21c0 .86.187 1.676.52 2.41l-2.28 2.28a2.13 2.13 0 0 0-.68-.115 2.17 2.17 0 1 0 2.17 2.17c0-.24-.04-.47-.115-.68l2.24-2.24c.75.4 1.61.63 2.52.63a5.86 5.86 0 0 0 5.86-5.86c0-2.19-1.2-4.1-2.98-5.13zM17.184 15.8a3.49 3.49 0 1 1 0-6.98 3.49 3.49 0 0 1 0 6.98z"
      />
    </svg>
  );
}

function statusMessage(code: string | null | undefined) {
  switch (code) {
    case "connected":
      return null;
    case "access_denied":
      return "HubSpot access was denied. Try connecting again.";
    case "exchange_failed":
      return "Could not finish HubSpot connection. Try again.";
    case "invalid_state":
      return "HubSpot connection link was invalid or already used. Try again.";
    case "state_expired":
      return "HubSpot connection expired before it finished. Try again.";
    case "forbidden":
      return "You do not have permission to manage HubSpot for this organisation.";
    case "not_configured":
      return "HubSpot is not configured on this environment.";
    case "start_failed":
      return "Could not start HubSpot connection. Try again.";
    default:
      return code ? "Could not connect HubSpot. Try again." : null;
  }
}

export function HubSpotPanel({
  orgSlug,
  connected,
  portalId,
  configured,
  canManage,
  oauthStatus,
}: {
  orgSlug: string;
  connected: boolean;
  portalId: string | null;
  configured: boolean;
  canManage: boolean;
  oauthStatus?: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const displayError = error ?? statusMessage(oauthStatus);
  const success = oauthStatus === "connected" && !error;

  function disconnect() {
    setError(null);
    start(async () => {
      try {
        await disconnectHubSpot(orgSlug);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not disconnect");
      }
    });
  }

  if (!canManage) {
    return (
      <p className="text-sm text-stone-500">
        Only organisation admins can manage CRM integrations.
      </p>
    );
  }

  if (connected) {
    return (
      <div className="space-y-3">
        <div className="rounded-md border border-stone-200 bg-stone-0 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <HubSpotMark />
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink-800">Connected</p>
                <p className="mt-0.5 text-xs text-stone-500">
                  HubSpot
                  {portalId ? ` — portal ${portalId}` : ""}
                  . Invitee import uses this connection.
                </p>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={pending}
              onClick={disconnect}
            >
              {pending ? "Disconnecting…" : "Disconnect"}
            </Button>
          </div>
        </div>
        {success ? (
          <p className="text-sm text-moss-700">HubSpot connected successfully.</p>
        ) : null}
        {displayError ? <p className="text-sm text-danger">{displayError}</p> : null}
      </div>
    );
  }

  if (!configured) {
    return (
      <div>
        <button
          type="button"
          disabled
          className="inline-flex h-10 w-full cursor-not-allowed items-center justify-center gap-2.5 rounded-sm border border-stone-200 bg-stone-50 px-4 text-sm font-medium text-stone-400"
        >
          <span className="opacity-60">
            <HubSpotMark />
          </span>
          Connect HubSpot
        </button>
        <p className="mt-1 text-xs text-stone-500">
          HubSpot OAuth is not configured for this environment.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <a
        href={`/api/auth/hubspot/start?orgSlug=${encodeURIComponent(orgSlug)}`}
        className="inline-flex h-10 w-full items-center justify-center gap-2.5 rounded-sm border border-stone-200 bg-stone-0 px-4 text-sm font-medium text-ink-800 hover:border-ink-400 hover:bg-stone-50"
      >
        <HubSpotMark />
        Connect HubSpot
      </a>
      {displayError ? <p className="text-sm text-danger">{displayError}</p> : null}
    </div>
  );
}
