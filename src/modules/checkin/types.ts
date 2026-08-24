import type { CheckInView } from "@/lib/authz/fields";
import type { ActionResult } from "@/lib/action-result";
import type { BadgeQueueInfo } from "@/modules/badges/queue";

export type CheckInOutcome = "ready" | "checked_in" | "already_checked_in";

export type CheckInActionResult = ActionResult<{
  outcome: CheckInOutcome;
  view: CheckInView;
  badgeQueue?: BadgeQueueInfo;
}>;

export type CheckInLookupResult = ActionResult<CheckInView>;

export type CheckInSearchResult = ActionResult<CheckInSearchRow[]>;

export type CheckInSearchRow = {
  attendeeId: string;
  name: string;
  company: string | null;
  category: string | null;
  alreadyCheckedIn: boolean;
  checkedInAt: Date | null;
};
