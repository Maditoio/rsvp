"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { disconnectSalesforce } from "@/modules/salesforce/actions";

function SalesforceMark() {
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
        fill="#00A1E0"
        d="M10.04 5.34c.62-.66 1.5-1.08 2.48-1.08.7 0 1.35.23 1.88.61.7-.78 1.72-1.27 2.86-1.27 2.1 0 3.8 1.7 3.8 3.8 0 .2-.02.4-.05.59 1.1.5 1.86 1.6 1.86 2.88 0 1.74-1.41 3.15-3.15 3.15H8.3c-1.98 0-3.58-1.6-3.58-3.58 0-1.55 1-2.87 2.4-3.35.1-1.05.6-1.99 1.36-2.66.18-.16.38-.3.58-.41z"
      />
      <path
        fill="#00A1E0"
        d="M5.55 11.2c.12 0 .24.01.36.02-.08-.3-.12-.62-.12-.95 0-1.98 1.6-3.58 3.58-3.58.48 0 .94.1 1.35.27.42-.55.97-.98 1.61-1.25-.55-1.45-1.94-2.48-3.56-2.48-2.1 0-3.8 1.7-3.8 3.8 0 .14.01.28.03.41C3.74 7.7 2.7 8.9 2.7 10.35c0 1.74 1.41 3.15 3.15 3.15h.2c-.22-.4-.35-.86-.35-1.35 0-.33.06-.65.17-.95-.1.01-.21.01-.32.01z"
        opacity="0.85"
      />
    </svg>
  );
}

function statusMessage(code: string | null | undefined) {
  switch (code) {
    case "connected":
      return null;
    case "access_denied":
      return "Salesforce access was denied. Try connecting again.";
    case "exchange_failed":
      return "Could not finish Salesforce connection. Try again.";
    case "invalid_state":
      return "Salesforce connection link was invalid or already used. Try again.";
    case "state_expired":
      return "Salesforce connection expired before it finished. Try again.";
    case "forbidden":
      return "You do not have permission to manage Salesforce for this organisation.";
    case "not_configured":
      return "Salesforce is not configured on this environment.";
    case "start_failed":
      return "Could not start Salesforce connection. Try again.";
    default:
      return code ? "Could not connect Salesforce. Try again." : null;
  }
}

export function SalesforcePanel({
  orgSlug,
  connected,
  salesforceOrgId,
  configured,
  canManage,
  oauthStatus,
}: {
  orgSlug: string;
  connected: boolean;
  salesforceOrgId: string | null;
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
        await disconnectSalesforce(orgSlug);
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
              <SalesforceMark />
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink-800">Connected</p>
                <p className="mt-0.5 text-xs text-stone-500">
                  Salesforce
                  {salesforceOrgId ? ` — org ${salesforceOrgId}` : ""}
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
          <p className="text-sm text-moss-700">
            Salesforce connected successfully.
          </p>
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
            <SalesforceMark />
          </span>
          Connect Salesforce
        </button>
        <p className="mt-1 text-xs text-stone-500">
          Salesforce OAuth is not configured for this environment.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <a
        href={`/api/auth/salesforce/start?orgSlug=${encodeURIComponent(orgSlug)}`}
        className="inline-flex h-10 w-full items-center justify-center gap-2.5 rounded-sm border border-stone-200 bg-stone-0 px-4 text-sm font-medium text-ink-800 hover:border-ink-400 hover:bg-stone-50"
      >
        <SalesforceMark />
        Connect Salesforce
      </a>
      {displayError ? <p className="text-sm text-danger">{displayError}</p> : null}
    </div>
  );
}
