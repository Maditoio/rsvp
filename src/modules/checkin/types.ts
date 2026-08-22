export type CheckInOutcome = "ready" | "checked_in" | "already_checked_in";

export type CheckInActionResult = {
  outcome: CheckInOutcome;
  view: import("@/lib/authz/fields").CheckInView;
};

export type CheckInSearchRow = {
  attendeeId: string;
  name: string;
  company: string | null;
  category: string | null;
  alreadyCheckedIn: boolean;
  checkedInAt: Date | null;
};
