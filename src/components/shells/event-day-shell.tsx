"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";
import {
  DoorOpen,
  Download,
  IdCard,
  QrCode,
  RefreshCw,
  Search,
  Wifi,
  WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useOfflineCheckIn } from "@/modules/checkin/use-offline-check-in";
import { useToast } from "@/components/ui/toast";

const tabs = (orgSlug: string, eventId: string) =>
  [
    {
      href: `/app/${orgSlug}/events/${eventId}/day`,
      label: "Desk check-in",
      icon: QrCode,
      exact: true,
    },
    {
      href: `/app/${orgSlug}/events/${eventId}/day/badges`,
      label: "Badge queue",
      icon: IdCard,
    },
    {
      href: `/app/${orgSlug}/events/${eventId}/day/entrance`,
      label: "Entrance",
      icon: DoorOpen,
    },
    {
      href: `/app/${orgSlug}/events/${eventId}/day/lookup`,
      label: "Lookup",
      icon: Search,
    },
  ] as const;

function NavIconTooltip({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2",
          "whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[0.6875rem] font-medium text-white shadow-md",
          "opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100",
        )}
      >
        {label}
      </span>
    </span>
  );
}

function OfflineDeskControls({
  orgSlug,
  eventId,
}: {
  orgSlug: string;
  eventId: string;
}) {
  const toast = useToast();
  const offline = useOfflineCheckIn(orgSlug, eventId);
  const [pending, start] = useTransition();
  const busy = offline.busy || pending;

  const networkLabel = offline.online
    ? offline.canScanOffline
      ? "Online · offline pack ready"
      : "Online · download a pack for offline desk"
    : offline.canScanOffline
      ? "Offline · scanning from local pack"
      : "Offline · no pack on this device";

  const packLabel = offline.pack
    ? offline.pack.expired
      ? "Pack expired — refresh pack"
      : !offline.pack.unlockable
        ? "Pack locked — refresh pack"
        : `Refresh pack (${offline.pack.attendeeCount} attendees)`
    : "Download offline pack";

  const syncLabel =
    offline.pendingCount > 0
      ? `Sync now (${offline.pendingCount} pending)`
      : "Sync now — nothing pending";

  return (
    <div
      className="ml-auto flex items-center gap-0.5 border-l border-slate-100 pl-2 sm:pl-3"
      aria-label="Offline desk"
    >
      <NavIconTooltip label={networkLabel}>
        <span
          className={cn(
            "inline-flex size-10 items-center justify-center rounded-full",
            offline.online ? "text-emerald-600" : "text-amber-600",
          )}
          aria-label={networkLabel}
        >
          {offline.online ? (
            <Wifi className="size-4" strokeWidth={1.75} aria-hidden />
          ) : (
            <WifiOff className="size-4" strokeWidth={1.75} aria-hidden />
          )}
        </span>
      </NavIconTooltip>

      <NavIconTooltip label={packLabel}>
        <button
          type="button"
          disabled={busy || !offline.online}
          aria-label={packLabel}
          onClick={() => {
            start(async () => {
              try {
                const result = await offline.downloadPack();
                toast.success(
                  `Offline pack ready (${result.count} attendee${result.count === 1 ? "" : "s"}).`,
                );
              } catch (e) {
                toast.error(
                  e instanceof Error
                    ? e.message
                    : "Could not download offline pack.",
                );
              }
            });
          }}
          className={cn(
            "inline-flex size-10 items-center justify-center rounded-full text-slate-600 transition-colors duration-150",
            "hover:bg-slate-100 hover:text-slate-900",
            "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/12",
            "disabled:cursor-not-allowed disabled:opacity-40",
          )}
        >
          <Download
            className={cn("size-4", busy && "animate-pulse")}
            strokeWidth={1.75}
            aria-hidden
          />
        </button>
      </NavIconTooltip>

      <NavIconTooltip label={syncLabel}>
        <button
          type="button"
          disabled={
            busy || !offline.online || offline.pendingCount === 0
          }
          aria-label={syncLabel}
          onClick={() => {
            start(async () => {
              try {
                const result = await offline.syncPending();
                if (result.synced === 0) {
                  toast.success("Nothing left to sync.");
                } else {
                  toast.success(
                    `Synced ${result.synced} check-in${result.synced === 1 ? "" : "s"}.`,
                  );
                }
              } catch (e) {
                toast.error(
                  e instanceof Error ? e.message : "Could not sync.",
                );
              }
            });
          }}
          className={cn(
            "relative inline-flex size-10 items-center justify-center rounded-full text-slate-600 transition-colors duration-150",
            "hover:bg-slate-100 hover:text-slate-900",
            "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/12",
            "disabled:cursor-not-allowed disabled:opacity-40",
          )}
        >
          <RefreshCw
            className={cn("size-4", busy && "animate-spin")}
            strokeWidth={1.75}
            aria-hidden
          />
          {offline.pendingCount > 0 ? (
            <span className="absolute right-1.5 top-1.5 inline-flex min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[0.625rem] font-semibold leading-4 text-white">
              {offline.pendingCount > 9 ? "9+" : offline.pendingCount}
            </span>
          ) : null}
        </button>
      </NavIconTooltip>
    </div>
  );
}

export function EventDayShell({
  orgSlug,
  eventId,
  eventName,
  children,
}: {
  orgSlug: string;
  eventId: string;
  eventName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const items = tabs(orgSlug, eventId);

  return (
    <div className="flex min-h-full flex-col bg-slate-50">
      <header className="bg-white shadow-[0_1px_0_rgba(15,23,42,0.04),0_4px_12px_rgba(15,23,42,0.03)]">
        <div className="px-4 py-5 sm:px-6">
          <p className="text-[0.71875rem] font-semibold uppercase tracking-[0.04em] text-indigo-600">
            Event day
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-[-0.02em] text-slate-900 sm:text-[1.75rem]">
            {eventName}
          </h1>
        </div>
        <nav
          className="flex items-center gap-1 border-t border-slate-100 px-3 sm:px-5"
          aria-label="Event day"
        >
          <div className="flex items-center gap-0.5">
            {items.map((item) => {
              const Icon = item.icon;
              const active =
                "exact" in item && item.exact
                  ? pathname === item.href
                  : pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);
              return (
                <NavIconTooltip key={item.href} label={item.label}>
                  <Link
                    href={item.href}
                    aria-label={item.label}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative inline-flex size-11 items-center justify-center rounded-full transition-colors duration-150",
                      active
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                      "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/12",
                    )}
                  >
                    <Icon className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                    {active ? (
                      <span
                        className="absolute inset-x-3 bottom-1 h-0.5 rounded-full bg-indigo-600"
                        aria-hidden
                      />
                    ) : null}
                  </Link>
                </NavIconTooltip>
              );
            })}
          </div>

          <OfflineDeskControls orgSlug={orgSlug} eventId={eventId} />
        </nav>
      </header>
      <div className="flex-1 px-4 py-6 sm:px-6">{children}</div>
    </div>
  );
}
