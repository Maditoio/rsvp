"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { disconnectHubSpot } from "@/modules/hubspot/actions";
import { disconnectSalesforce } from "@/modules/salesforce/actions";

type LiveIntegration = {
  id: "hubspot" | "salesforce";
  name: string;
  description: string;
  connected: boolean;
  detail: string | null;
  configured: boolean;
  connectHref: string;
  oauthError: string | null;
  oauthSuccess: boolean;
  icon: ReactNode;
};

type SoonIntegration = {
  id: string;
  name: string;
  description: string;
  soon: true;
  icon: ReactNode;
};

function IconTile({ children }: { children: ReactNode }) {
  return (
    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-50">
      {children}
    </div>
  );
}

function HubSpotMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        fill="#FF7A59"
        d="M18.164 7.87V5.095a2.186 2.186 0 0 0 1.267-1.978v-.066A2.187 2.187 0 0 0 17.25.87h-.066a2.187 2.187 0 0 0-2.186 2.181v.066c0 .855.485 1.594 1.199 1.95v2.81a5.85 5.85 0 0 0-2.785 1.326l-7.38-5.746a2.552 2.552 0 0 0 .1-.688A2.525 2.525 0 1 0 3.606 5.3c0 .47.13.91.356 1.29l7.23 5.63a5.83 5.83 0 0 0-.43 2.21c0 .86.187 1.676.52 2.41l-2.28 2.28a2.13 2.13 0 0 0-.68-.115 2.17 2.17 0 1 0 2.17 2.17c0-.24-.04-.47-.115-.68l2.24-2.24c.75.4 1.61.63 2.52.63a5.86 5.86 0 0 0 5.86-5.86c0-2.19-1.2-4.1-2.98-5.13zM17.184 15.8a3.49 3.49 0 1 1 0-6.98 3.49 3.49 0 0 1 0 6.98z"
      />
    </svg>
  );
}

function SalesforceMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        fill="#00A1E0"
        d="M10.04 5.34c.62-.66 1.5-1.08 2.48-1.08.7 0 1.35.23 1.88.61.7-.78 1.72-1.27 2.86-1.27 2.1 0 3.8 1.7 3.8 3.8 0 .2-.02.4-.05.59 1.1.5 1.86 1.6 1.86 2.88 0 1.74-1.41 3.15-3.15 3.15H8.3c-1.98 0-3.58-1.6-3.58-3.58 0-1.55 1-2.87 2.4-3.35.1-1.05.6-1.99 1.36-2.66.18-.16.38-.3.58-.41z"
      />
    </svg>
  );
}

function PipedriveMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" fill="#017737" />
      <path
        fill="#fff"
        d="M8.2 7.5h3.1c2.2 0 3.6 1.2 3.6 3.05 0 1.85-1.4 3.05-3.6 3.05H10.4V16.5H8.2V7.5zm2.2 1.75v2.6h1c1.05 0 1.65-.5 1.65-1.3S13.45 9.25 12.4 9.25h-2z"
      />
    </svg>
  );
}

function DynamicsMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path fill="#002050" d="M4 4h7.5v16H4z" />
      <path fill="#0078D4" d="M12.5 8H20v12h-7.5z" />
      <path fill="#50E6FF" d="M12.5 4H20v3.5h-7.5z" />
    </svg>
  );
}

function ZapierMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        fill="#FF4A00"
        d="M12 2.5 13.8 9H20l-5 3.6L16.8 21 12 16.9 7.2 21l1.8-8.4L4 9h6.2L12 2.5z"
      />
    </svg>
  );
}

function TeamsMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
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

function oauthMessage(
  provider: "hubspot" | "salesforce",
  code: string | null | undefined,
) {
  if (!code || code === "connected") return null;
  const label = provider === "hubspot" ? "HubSpot" : "Salesforce";
  switch (code) {
    case "access_denied":
      return `${label} access was denied. Try connecting again.`;
    case "exchange_failed":
      return `Could not finish ${label} connection. Try again.`;
    case "invalid_state":
      return `${label} connection link was invalid or already used. Try again.`;
    case "state_expired":
      return `${label} connection expired before it finished. Try again.`;
    case "forbidden":
      return `You do not have permission to manage ${label} for this organisation.`;
    case "not_configured":
      return `${label} is not configured on this environment. Add the client ID and secret, then redeploy.`;
    case "start_failed":
      return `Could not start ${label} connection. Try again.`;
    default:
      return `Could not connect ${label}. Try again.`;
  }
}

function SoonCard({ item }: { item: SoonIntegration }) {
  return (
    <div className="flex min-h-[132px] flex-col rounded-md border border-dashed border-slate-200 bg-white p-5">
      <div className="flex items-start gap-3">
        <IconTile>{item.icon}</IconTile>
        <span className="ml-auto inline-flex rounded-xs bg-amber-500/15 px-2 py-0.5 text-[0.8125rem] font-semibold text-indigo-600">
          SOON
        </span>
      </div>
      <p className="mt-2.5 text-[0.9375rem] font-semibold text-slate-600">
        {item.name}
      </p>
      <p className="mt-1 text-[0.8125rem] font-medium text-slate-400">
        {item.description}
      </p>
    </div>
  );
}

function LiveCard({
  item,
  canManage,
  onDisconnect,
  pending,
}: {
  item: LiveIntegration;
  canManage: boolean;
  onDisconnect: () => void;
  pending: boolean;
}) {
  return (
    <div className="flex flex-col rounded-md border border-solid border-slate-200 bg-white p-5">
      <div className="flex items-start gap-3">
        <IconTile>{item.icon}</IconTile>
        <Badge
          tone={item.connected ? "success" : "muted"}
          className="ml-auto h-auto min-h-6 py-0.5"
        >
          {item.connected ? "Connected" : "Not connected"}
        </Badge>
      </div>

      <h3 className="mt-2.5 font-display text-base font-semibold text-slate-700">
        {item.name}
      </h3>
      <p className="mb-3.5 mt-1 text-[0.8125rem] font-medium text-slate-500">
        {item.description}
        {item.connected && item.detail ? ` ${item.detail}` : ""}
      </p>

      {item.oauthSuccess ? (
        <p className="mb-3 text-[0.8125rem] text-success">
          {item.name} connected successfully.
        </p>
      ) : null}
      {item.oauthError ? (
        <p className="mb-3 text-[0.8125rem] text-danger">{item.oauthError}</p>
      ) : null}
      {!item.connected && !item.configured && !item.oauthError ? (
        <p className="mb-3 text-[0.8125rem] text-slate-500">
          OAuth credentials are not set on this environment yet.
        </p>
      ) : null}

      {!canManage ? (
        <p className="mt-auto text-[0.8125rem] text-slate-500">
          Only organisation admins can manage CRM integrations.
        </p>
      ) : item.connected ? (
        <button
          type="button"
          disabled={pending}
          onClick={onDisconnect}
          className={cn(
            "mt-auto inline-flex h-9 w-full items-center justify-center rounded-full border border-slate-200 bg-transparent text-[0.78125rem] font-semibold text-[#8A2E26] transition-colors",
            "hover:border-slate-200 hover:bg-slate-50",
            "disabled:cursor-not-allowed disabled:opacity-60",
          )}
        >
          {pending ? "Disconnecting…" : "Disconnect"}
        </button>
      ) : (
        <a
          href={item.connectHref}
          className="mt-auto inline-flex h-9 w-full items-center justify-center rounded-full bg-indigo-600 text-[0.78125rem] font-semibold text-white transition-colors hover:bg-indigo-700"
        >
          Connect
        </a>
      )}
    </div>
  );
}

const SOON_ITEMS: SoonIntegration[] = [
  {
    id: "pipedrive",
    name: "Pipedrive",
    description: "Import contacts from Pipedrive pipelines.",
    soon: true,
    icon: <PipedriveMark />,
  },
  {
    id: "dynamics",
    name: "Dynamics 365",
    description: "Connect Microsoft Dynamics for CRM invitees.",
    soon: true,
    icon: <DynamicsMark />,
  },
  {
    id: "teams",
    name: "Microsoft Teams",
    description: "Notify organisers and share event updates in Teams.",
    soon: true,
    icon: <TeamsMark />,
  },
  {
    id: "zapier",
    name: "Zapier",
    description: "Trigger invitee sync from thousands of apps.",
    soon: true,
    icon: <ZapierMark />,
  },
];

export function IntegrationsGrid({
  orgSlug,
  canManage,
  hubspot,
  salesforce,
}: {
  orgSlug: string;
  canManage: boolean;
  hubspot: {
    connected: boolean;
    portalId: string | null;
    configured: boolean;
    oauthStatus: string | null;
  };
  salesforce: {
    connected: boolean;
    salesforceOrgId: string | null;
    configured: boolean;
    oauthStatus: string | null;
  };
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"hubspot" | "salesforce" | null>(null);
  const [pending, start] = useTransition();

  const live = useMemo<LiveIntegration[]>(
    () => [
      {
        id: "hubspot",
        name: "HubSpot",
        description:
          "Import HubSpot contacts as event invitees. Read-only — nothing is written back.",
        connected: hubspot.connected,
        detail: hubspot.portalId ? `(portal ${hubspot.portalId})` : null,
        configured: hubspot.configured,
        connectHref: `/api/auth/hubspot/start?orgSlug=${encodeURIComponent(orgSlug)}`,
        oauthError: oauthMessage("hubspot", hubspot.oauthStatus),
        oauthSuccess: hubspot.oauthStatus === "connected",
        icon: <HubSpotMark />,
      },
      {
        id: "salesforce",
        name: "Salesforce",
        description:
          "Import Salesforce contacts as event invitees. Read-only — nothing is written back.",
        connected: salesforce.connected,
        detail: salesforce.salesforceOrgId
          ? `(org ${salesforce.salesforceOrgId})`
          : null,
        configured: salesforce.configured,
        connectHref: `/api/auth/salesforce/start?orgSlug=${encodeURIComponent(orgSlug)}`,
        oauthError: oauthMessage("salesforce", salesforce.oauthStatus),
        oauthSuccess: salesforce.oauthStatus === "connected",
        icon: <SalesforceMark />,
      },
    ],
    [hubspot, orgSlug, salesforce],
  );

  const allCount = live.length + SOON_ITEMS.length;
  const showSearch = allCount > 6;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return { live, soon: SOON_ITEMS };
    }
    return {
      live: live.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q),
      ),
      soon: SOON_ITEMS.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q),
      ),
    };
  }, [live, query]);

  function runDisconnect(provider: "hubspot" | "salesforce") {
    setError(null);
    setPendingKey(provider);
    start(async () => {
      try {
        if (provider === "hubspot") await disconnectHubSpot(orgSlug);
        else await disconnectSalesforce(orgSlug);
        setConfirm(null);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not disconnect");
      } finally {
        setPendingKey(null);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[0.71875rem] font-semibold uppercase tracking-[0.04em] text-indigo-600">
            Integrations
          </p>
          <p className="mt-1 text-[0.8125rem] font-medium text-slate-500">
            CRM connections are organisation-owned and shared across every
            event.
          </p>
        </div>
        {showSearch ? (
          <label className="relative block w-[220px]">
            <span className="sr-only">Search integrations</span>
            <Search
              className="pointer-events-none absolute top-1/2 left-[11px] size-3.5 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="h-[38px] w-full rounded-full border border-slate-200 bg-white pr-3 pl-9 text-[0.9375rem] text-slate-700 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/12"
            />
          </label>
        ) : null}
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.live.map((item) => (
          <LiveCard
            key={item.id}
            item={item}
            canManage={canManage}
            pending={pending && pendingKey === item.id}
            onDisconnect={() => setConfirm(item.id)}
          />
        ))}
        {filtered.soon.map((item) => (
          <SoonCard key={item.id} item={item} />
        ))}
      </div>

      <ConfirmDialog
        open={confirm !== null}
        onClose={() => {
          if (!pending) setConfirm(null);
        }}
        title={
          confirm === "hubspot"
            ? "Disconnect HubSpot?"
            : "Disconnect Salesforce?"
        }
        description="Invitee import from this CRM will stop for every event in this organisation until you connect again."
        confirmLabel="Disconnect"
        cancelLabel="Keep connected"
        destructive
        pending={pending}
        onConfirm={() => {
          if (confirm) runDisconnect(confirm);
        }}
      />
    </div>
  );
}
