"use client";

import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  CircleDashed,
  MailOpen,
  Minus,
  Send,
  XCircle,
} from "lucide-react";
import { cn, humanizeEnum } from "@/lib/utils";

const ICON: Record<
  string,
  { icon: typeof Send; className: string; label: string }
> = {
  DRAFT: {
    icon: CircleDashed,
    className: "text-slate-500",
    label: "Draft",
  },
  SCHEDULED: {
    icon: CircleDashed,
    className: "text-slate-500",
    label: "Scheduled",
  },
  SENT: { icon: Send, className: "text-slate-600", label: "Sent" },
  DELIVERED: { icon: Send, className: "text-slate-600", label: "Delivered" },
  OPENED: { icon: MailOpen, className: "text-info", label: "Opened" },
  ACCEPTED: {
    icon: CheckCircle2,
    className: "text-success",
    label: "Accepted",
  },
  DECLINED: { icon: XCircle, className: "text-danger", label: "Declined" },
  EXPIRED: { icon: Ban, className: "text-danger", label: "Expired" },
  BOUNCED: {
    icon: AlertTriangle,
    className: "text-indigo-600",
    label: "Bounced",
  },
  CANCELLED: { icon: Ban, className: "text-danger", label: "Cancelled" },
};

export function InvitationStatusIcon({
  status,
}: {
  status: string | null;
}) {
  if (!status) {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-slate-500"
        title="Not invited"
      >
        <Minus className="size-4" strokeWidth={1.75} aria-hidden />
        <span className="sr-only">Not invited</span>
      </span>
    );
  }

  const config = ICON[status] ?? {
    icon: CircleDashed,
    className: "text-slate-500",
    label: humanizeEnum(status),
  };
  const Icon = config.icon;

  return (
    <span
      className={cn("inline-flex items-center", config.className)}
      title={config.label}
    >
      <Icon className="size-4" strokeWidth={1.75} aria-hidden />
      <span className="sr-only">{config.label}</span>
    </span>
  );
}
