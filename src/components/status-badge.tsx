import { Badge } from "@/components/ui/badge";
import { humanizeEnum } from "@/lib/utils";

const TONE: Record<
  string,
  "success" | "warning" | "danger" | "muted" | "default"
> = {
  DRAFT: "muted",
  SCHEDULED: "muted",
  SENT: "default",
  DELIVERED: "default",
  OPENED: "default",
  ACCEPTED: "success",
  DECLINED: "danger",
  EXPIRED: "danger",
  BOUNCED: "warning",
  CANCELLED: "danger",
  NOT_STARTED: "muted",
  INCOMPLETE: "warning",
  COMPLETED: "success",
  CONFIRMED: "success",
  WAITLISTED: "muted",
  REGISTERED: "default",
  CHECKED_IN: "success",
  NO_SHOW: "warning",
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={TONE[status] ?? "muted"}>{humanizeEnum(status)}</Badge>;
}
