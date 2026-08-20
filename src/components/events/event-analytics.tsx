import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  Handshake,
  Hourglass,
  MailOpen,
  QrCode,
  Users,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type AnalyticsTone = "neutral" | "info" | "bronze" | "moss" | "danger";

type AnalyticsTile = {
  label: string;
  value: number;
  icon: LucideIcon;
  tone: AnalyticsTone;
};

const toneStyles: Record<
  AnalyticsTone,
  { tile: string; icon: string }
> = {
  neutral: { tile: "bg-stone-100", icon: "text-ink-600" },
  info: { tile: "bg-info-bg", icon: "text-info" },
  bronze: { tile: "bg-bronze-100", icon: "text-bronze-600" },
  moss: { tile: "bg-moss-100", icon: "text-moss-600" },
  danger: { tile: "bg-danger-bg", icon: "text-danger" },
};

export function EventAnalytics({
  counts,
}: {
  counts: {
    invited: number;
    accepted: number;
    registered: number;
    confirmed: number;
    declined: number;
    pending: number;
    checkedIn: number;
    matchmakingEnabled: number;
    meetingsScheduled: number;
    meetingRequestsPending: number;
  };
}) {
  const tiles: AnalyticsTile[] = [
    { label: "Invited", value: counts.invited, icon: Users, tone: "neutral" },
    { label: "Accepted", value: counts.accepted, icon: MailOpen, tone: "info" },
    {
      label: "Registered",
      value: counts.registered,
      icon: ClipboardList,
      tone: "bronze",
    },
    {
      label: "Confirmed",
      value: counts.confirmed,
      icon: CheckCircle2,
      tone: "moss",
    },
    { label: "Declined", value: counts.declined, icon: XCircle, tone: "danger" },
    { label: "Pending", value: counts.pending, icon: Hourglass, tone: "bronze" },
    {
      label: "Checked in",
      value: counts.checkedIn,
      icon: QrCode,
      tone: "moss",
    },
    {
      label: "Matchmaking profiles",
      value: counts.matchmakingEnabled,
      icon: Handshake,
      tone: "neutral",
    },
    {
      label: "Meetings scheduled",
      value: counts.meetingsScheduled,
      icon: CalendarDays,
      tone: "info",
    },
    {
      label: "Meeting requests",
      value: counts.meetingRequestsPending,
      icon: Clock,
      tone: "bronze",
    },
  ];

  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {tiles.map((tile) => {
        const Icon = tile.icon;
        const styles = toneStyles[tile.tone];
        return (
          <div
            key={tile.label}
            className="flex items-center gap-3 rounded-md border border-stone-200 bg-stone-0 px-3.5 py-3"
          >
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-sm",
                styles.tile,
              )}
            >
              <Icon className={cn("size-4", styles.icon)} strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <p className="text-xl font-semibold tabular-nums leading-none text-ink-800">
                {tile.value}
              </p>
              <p className="mt-1 truncate text-xs text-stone-500">{tile.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
