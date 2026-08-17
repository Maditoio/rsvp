import { Badge } from "@/components/ui/badge";
import { humanizeEnum } from "@/lib/utils";

const TONE: Record<
  string,
  "success" | "warning" | "error" | "muted" | "slate"
> = {
  DRAFT: "muted",
  SCHEDULED: "muted",
  SENT: "slate",
  DELIVERED: "slate",
  OPENED: "slate",
  ACCEPTED: "success",
  DECLINED: "error",
  EXPIRED: "error",
  BOUNCED: "warning",
  CANCELLED: "error",
  NOT_STARTED: "muted",
  INCOMPLETE: "warning",
  COMPLETED: "success",
  CONFIRMED: "success",
  WAITLISTED: "warning",
  REGISTERED: "slate",
  CHECKED_IN: "success",
  NO_SHOW: "warning",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={TONE[status] ?? "muted"}>{humanizeEnum(status)}</Badge>;
}
