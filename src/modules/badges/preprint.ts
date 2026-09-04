export type PreprintCandidateAction =
  | "enqueue"
  | "already_queued"
  | "printed"
  | "no_qr";

/** Pure classifier used by pre-print enqueue (and unit tests). */
export function classifyPreprintCandidate(
  hasQr: boolean,
  badgeStatus: "QUEUED" | "PRINTED" | null | undefined,
): PreprintCandidateAction {
  if (!hasQr) return "no_qr";
  if (badgeStatus === "PRINTED") return "printed";
  if (badgeStatus === "QUEUED") return "already_queued";
  return "enqueue";
}
