import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Handshake,
  ListChecks,
  Mail,
  MailOpen,
  Users,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import type { EventAnalyticsSnapshot } from "@/modules/events/analytics";
import { cn } from "@/lib/utils";

type SectionProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

function AnalyticsSection({ title, description, children }: SectionProps) {
  return (
    <section className="rounded-xl bg-white shadow-sm p-5">
      <h2 className="font-display text-xl text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

type MetricTile = {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone?: "neutral" | "info" | "success" | "danger";
};

const toneStyles = {
  neutral: "bg-slate-100 text-slate-600",
  info: "bg-info-bg text-info",
  success: "bg-emerald-50 text-success",
  danger: "bg-danger-bg text-danger",
};

function MetricGrid({ tiles }: { tiles: MetricTile[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {tiles.map((tile) => {
        const Icon = tile.icon;
        const tone = tile.tone ?? "neutral";
        return (
          <div
            key={tile.label}
            className="flex items-center gap-3 rounded-lg border border-slate-100 px-3.5 py-3"
          >
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-lg",
                toneStyles[tone],
              )}
            >
              <Icon className="size-4" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <p className="text-xl font-semibold tabular-nums leading-none text-slate-900">
                {tile.value}
              </p>
              <p className="mt-1 truncate text-xs text-slate-500">{tile.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FunnelBar({
  label,
  value,
  max,
  tone,
}: {
  label: string;
  value: number;
  max: number;
  tone: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-slate-700">{label}</span>
        <span className="tabular-nums text-slate-500">
          {value.toLocaleString()} ({pct}%)
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn("h-full rounded-full transition-all", tone)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function EventAnalyticsDashboard({
  analytics,
  orgSlug,
  eventId,
  filtersActive = false,
}: {
  analytics: EventAnalyticsSnapshot;
  orgSlug: string;
  eventId: string;
  filtersActive?: boolean;
}) {
  const { invitations, matchmaking, meetings, polls } = analytics;
  const funnelMax = Math.max(invitations.sent, 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.02em] text-slate-900">
            Analytics
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {filtersActive
              ? "Filtered segment analytics. Individual attendee behaviour is not exposed here."
              : "Aggregate event intelligence. Individual attendee behaviour is not exposed here."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/app/${orgSlug}/events/${eventId}/reports`}
            className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-indigo-400"
          >
            CSV exports
          </Link>
        </div>
      </div>

      <AnalyticsSection
        title="Invitation funnel"
        description="Sent through to registration conversion."
      >
        <div className="space-y-3">
          <FunnelBar label="Sent" value={invitations.sent} max={funnelMax} tone="bg-slate-400" />
          <FunnelBar label="Delivered" value={invitations.delivered} max={funnelMax} tone="bg-slate-500" />
          <FunnelBar label="Opened" value={invitations.opened} max={funnelMax} tone="bg-indigo-400" />
          <FunnelBar label="Accepted" value={invitations.accepted} max={funnelMax} tone="bg-indigo-600" />
          <FunnelBar label="Registered" value={invitations.registered} max={funnelMax} tone="bg-emerald-500" />
        </div>
        <MetricGrid
          tiles={[
            { label: "Declined", value: invitations.declined, icon: XCircle, tone: "danger" },
            { label: "Expired", value: invitations.expired, icon: Mail, tone: "neutral" },
            { label: "Bounced", value: invitations.bounced, icon: MailOpen, tone: "danger" },
            {
              label: "Registration conversion",
              value:
                invitations.conversionRate != null
                  ? `${invitations.conversionRate}%`
                  : "—",
              icon: CheckCircle2,
              tone: "success",
            },
          ]}
        />
      </AnalyticsSection>

      <AnalyticsSection
        title="Matchmaking"
        description="Profiles, scored pairs, and connection activity."
      >
        <MetricGrid
          tiles={[
            {
              label: "Profiles completed",
              value: matchmaking.profilesCompleted,
              icon: Users,
            },
            {
              label: "Match scores computed",
              value: matchmaking.matchScoresComputed,
              icon: BarChart3,
            },
            {
              label: "Meeting requests",
              value: matchmaking.meetingRequests,
              icon: Handshake,
            },
            {
              label: "Requests accepted",
              value: matchmaking.meetingRequestsAccepted,
              icon: CheckCircle2,
              tone: "success",
            },
            {
              label: "Requests declined",
              value: matchmaking.meetingRequestsDeclined,
              icon: XCircle,
              tone: "danger",
            },
            {
              label: "AI insights generated",
              value: matchmaking.aiInsightsGenerated,
              icon: BarChart3,
              tone: "info",
            },
          ]}
        />
      </AnalyticsSection>

      <AnalyticsSection
        title="Meetings"
        description="Requests, scheduling, and room usage."
      >
        <MetricGrid
          tiles={[
            { label: "Requested", value: meetings.requested, icon: Handshake },
            { label: "Accepted", value: meetings.accepted, icon: CheckCircle2, tone: "success" },
            { label: "Scheduled", value: meetings.scheduled, icon: CalendarDays, tone: "info" },
            { label: "Cancelled", value: meetings.cancelled, icon: XCircle, tone: "danger" },
            { label: "Completed", value: meetings.completed, icon: CheckCircle2, tone: "success" },
            {
              label: "Rooms in use",
              value: `${meetings.roomsUsed} / ${meetings.roomsTotal}`,
              icon: CalendarDays,
            },
            {
              label: "Room utilization",
              value:
                meetings.roomUtilizationRate != null
                  ? `${meetings.roomUtilizationRate}%`
                  : "—",
              icon: BarChart3,
            },
          ]}
        />
      </AnalyticsSection>

      {(polls.published > 0 || polls.responses > 0) && (
        <AnalyticsSection
          title="Polls"
          description="Published polls and attendee responses."
        >
          <MetricGrid
            tiles={[
              { label: "Published polls", value: polls.published, icon: ListChecks },
              { label: "Responses", value: polls.responses, icon: CheckCircle2, tone: "success" },
            ]}
          />
        </AnalyticsSection>
      )}
    </div>
  );
}
