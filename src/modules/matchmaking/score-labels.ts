/** Client-safe match band labels and reason types (no DB imports). */

export type MatchReasons = {
  lookingOfferingOverlap: string[];
  offeringLookingOverlap: string[];
  sharedIndustries: string[];
  sharedGeographies: string[];
  sharedMeetingPreferences: string[];
  sharedInterests: string[];
  sameCountry: boolean;
  labels: string[];
};

export type MatchBand = "strong" | "good" | "possible";

export function matchBandLabel(band: MatchBand | null): string | null {
  if (band === "strong") return "Strong match";
  if (band === "good") return "Good match";
  if (band === "possible") return "Possible match";
  return null;
}
