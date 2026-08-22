/** Canonical Phase 3 matchmaking questionnaire — product spec §20. */

export type MatchmakingQuestionnaire = {
  lookingFor: string[];
  offering: string[];
  industries: string[];
  geographies: string[];
  meetingPreferences: string[];
  completedAt?: string | null;
};

export const LOOKING_FOR_OPTIONS = [
  "Investors",
  "Customers",
  "Suppliers",
  "Technology",
  "Distribution partners",
  "Government relationships",
  "Joint ventures",
  "Acquisitions",
  "Financing",
  "Strategic partnerships",
] as const;

export const OFFERING_OPTIONS = [
  "Technology",
  "Capital",
  "Equipment",
  "Consulting",
  "Distribution",
  "Manufacturing",
  "Infrastructure",
  "Investment opportunities",
] as const;

export const INDUSTRY_OPTIONS = [
  "Mining",
  "Energy",
  "Oil & gas",
  "Renewables",
  "Telecommunications",
  "Finance",
  "Banking",
  "Insurance",
  "Government",
  "Infrastructure",
  "Technology",
  "Manufacturing",
  "Agriculture",
  "Healthcare",
  "Education",
  "Real estate",
  "Transport & logistics",
  "Retail & consumer",
  "Media & entertainment",
  "Legal & professional services",
  "Hospitality & tourism",
  "Defence & security",
  "Water & sanitation",
  "Construction",
  "Automotive",
] as const;

export const GEOGRAPHY_OPTIONS = [
  "South Africa",
  "DRC",
  "Zambia",
  "Kenya",
  "Nigeria",
  "Ghana",
  "Tanzania",
  "Botswana",
  "Namibia",
  "Uganda",
  "Egypt",
  "Morocco",
  "Southern Africa",
  "West Africa",
  "East Africa",
  "North Africa",
  "Europe",
  "Middle East",
  "Asia",
  "United States",
  "Americas",
  "Global",
] as const;

export const MEETING_PREFERENCE_OPTIONS = [
  "Investors",
  "Suppliers",
  "Customers",
  "Partners",
  "Government",
  "Media",
] as const;

const LOOKING_FOR = new Set<string>(LOOKING_FOR_OPTIONS);
const OFFERING = new Set<string>(OFFERING_OPTIONS);
const INDUSTRIES = new Set<string>(INDUSTRY_OPTIONS);
const GEOGRAPHIES = new Set<string>(GEOGRAPHY_OPTIONS);
const MEETING_PREFERENCES = new Set<string>(MEETING_PREFERENCE_OPTIONS);

export const QUESTION_STEP_COUNT = 5;

export function matchmakingPath(eventId: string) {
  return `/me/events/${eventId}/matchmaking`;
}

export function emptyQuestionnaire(): MatchmakingQuestionnaire {
  return {
    lookingFor: [],
    offering: [],
    industries: [],
    geographies: [],
    meetingPreferences: [],
    completedAt: null,
  };
}

function allowed(values: unknown, allowedSet: Set<string>): string[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of values) {
    if (typeof item !== "string") continue;
    const value = item.trim();
    if (!allowedSet.has(value) || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

function readCompletedAt(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const time = Date.parse(trimmed);
  return Number.isNaN(time) ? null : trimmed;
}

export function parseQuestionnaire(value: unknown): MatchmakingQuestionnaire {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return emptyQuestionnaire();
  }
  const row = value as Record<string, unknown>;
  return {
    lookingFor: allowed(row.lookingFor, LOOKING_FOR),
    offering: allowed(row.offering, OFFERING),
    industries: allowed(row.industries, INDUSTRIES),
    geographies: allowed(row.geographies, GEOGRAPHIES),
    meetingPreferences: allowed(row.meetingPreferences, MEETING_PREFERENCES),
    completedAt: readCompletedAt(row.completedAt),
  };
}

export function isQuestionnaireComplete(value: unknown): boolean {
  return Boolean(parseQuestionnaire(value).completedAt);
}

export function toggleSelection(current: string[], value: string): string[] {
  return current.includes(value)
    ? current.filter((item) => item !== value)
    : [...current, value];
}

export function toAttendeeProfileSummary(questionnaire: MatchmakingQuestionnaire): {
  lookingFor: string | null;
  offering: string | null;
  interests: string[];
} {
  const lookingFor = questionnaire.lookingFor.join(", ") || null;
  const offering = questionnaire.offering.join(", ") || null;
  const seen = new Set<string>();
  const interests: string[] = [];
  for (const item of [
    ...questionnaire.industries,
    ...questionnaire.lookingFor,
    ...questionnaire.offering,
  ]) {
    const key = item.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    interests.push(item);
  }
  return { lookingFor, offering, interests };
}
