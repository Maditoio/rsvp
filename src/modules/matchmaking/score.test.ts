import { describe, expect, it } from "vitest";
import {
  MATCH_BANDS,
  MATCH_WEIGHTS,
  buildMatchLabels,
  isMatchCandidate,
  isMatchmakingEligible,
  isProfileVisible,
  matchBandFromScore,
  matchBandLabel,
  overlapTerms,
  parseMatchReasons,
  parseQuestionnaire,
  questionnaireIsEmpty,
  scoreMatch,
  type ScoreableProfile,
} from "./score";

function profile(
  partial: {
    country?: string | null;
    interests?: string[];
    questionnaire?: Partial<ScoreableProfile["questionnaire"]>;
  } = {},
): ScoreableProfile {
  return {
    country: partial.country ?? null,
    interests: partial.interests ?? [],
    questionnaire: {
      lookingFor: [],
      offering: [],
      industries: [],
      geographies: [],
      meetingPreferences: [],
      completedAt: null,
      ...partial.questionnaire,
    },
  };
}

describe("parseQuestionnaire", () => {
  it("reads the Slice 1 JSON contract and ignores junk", () => {
    const parsed = parseQuestionnaire({
      lookingFor: ["Capital", " capital ", "Investors"],
      offering: ["Technology"],
      industries: ["Mining", 12],
      geographies: "South Africa",
      meetingPreferences: ["Partners"],
      completedAt: "2026-08-18T00:00:00.000Z",
    });
    expect(parsed.lookingFor).toEqual(["Capital", "Investors"]);
    expect(parsed.offering).toEqual(["Technology"]);
    expect(parsed.industries).toEqual(["Mining"]);
    expect(parsed.geographies).toEqual([]);
    expect(parsed.meetingPreferences).toEqual(["Partners"]);
    expect(parsed.completedAt).toBe("2026-08-18T00:00:00.000Z");
    expect(questionnaireIsEmpty(parsed)).toBe(false);
  });

  it("treats missing questionnaire as empty", () => {
    expect(questionnaireIsEmpty(parseQuestionnaire(null))).toBe(true);
    expect(questionnaireIsEmpty(parseQuestionnaire({}))).toBe(true);
  });
});

describe("scoreMatch complementarity", () => {
  it("scores my lookingFor ∩ their offering highest", () => {
    const result = scoreMatch(
      profile({ questionnaire: { lookingFor: ["Capital"] } }),
      profile({ questionnaire: { offering: ["capital"] } }),
    );
    expect(result.reasons.lookingOfferingOverlap).toEqual(["capital"]);
    expect(result.score).toBe(MATCH_WEIGHTS.lookingOffering);
    expect(result.band).toBe("strong");
    expect(result.reasons.labels[0]).toMatch(/They offer capital/i);
  });

  it("scores my offering ∩ their lookingFor as the second signal", () => {
    const result = scoreMatch(
      profile({ questionnaire: { offering: ["Technology"] } }),
      profile({ questionnaire: { lookingFor: ["technology"] } }),
    );
    expect(result.reasons.offeringLookingOverlap).toEqual(["technology"]);
    expect(result.score).toBe(MATCH_WEIGHTS.offeringLooking);
    expect(result.band).toBe("good");
  });

  it("adds shared industries, geographies, and meeting preferences", () => {
    const result = scoreMatch(
      profile({
        questionnaire: {
          industries: ["Mining"],
          geographies: ["Southern Africa"],
          meetingPreferences: ["Investors"],
        },
      }),
      profile({
        questionnaire: {
          industries: ["mining"],
          geographies: ["southern africa"],
          meetingPreferences: ["Investors"],
        },
      }),
    );
    expect(result.score).toBe(
      MATCH_WEIGHTS.industries +
        MATCH_WEIGHTS.geographies +
        MATCH_WEIGHTS.meetingPreferences,
    );
    expect(result.reasons.sharedIndustries).toEqual(["mining"]);
    expect(result.reasons.sharedGeographies).toEqual(["southern africa"]);
    expect(result.reasons.sharedMeetingPreferences).toEqual(["Investors"]);
  });

  it("falls back to Phase 2 interests and country when questionnaires are empty", () => {
    const result = scoreMatch(
      profile({ country: "South Africa", interests: ["Mining", "Energy"] }),
      profile({ country: "south africa", interests: ["energy", "Infrastructure"] }),
    );
    expect(result.reasons.sharedInterests).toEqual(["energy"]);
    expect(result.reasons.sameCountry).toBe(true);
    expect(result.score).toBe(MATCH_WEIGHTS.interests + MATCH_WEIGHTS.sameCountry);
    expect(result.band).toBe("possible");
  });

  it("does not treat unmatched people as a banded recommendation", () => {
    const result = scoreMatch(profile(), profile({ country: "Kenya" }));
    expect(result.score).toBe(0);
    expect(result.band).toBeNull();
    expect(result.reasons.labels).toEqual([]);
  });

  it("does not let shared interests outrank looking-for / offering complementarity", () => {
    const complementary = scoreMatch(
      profile({
        interests: ["Mining"],
        questionnaire: { lookingFor: ["Capital"] },
      }),
      profile({
        interests: ["Mining"],
        questionnaire: { offering: ["Capital"] },
      }),
    );
    const similarOnly = scoreMatch(
      profile({
        interests: ["Mining", "Energy", "Infrastructure", "Finance"],
        questionnaire: { lookingFor: ["Customers"], industries: ["Mining"] },
      }),
      profile({
        interests: ["Mining", "Energy", "Infrastructure", "Finance"],
        questionnaire: { lookingFor: ["Suppliers"], industries: ["Mining"] },
      }),
    );
    expect(complementary.score).toBeGreaterThan(similarOnly.score);
    expect(complementary.band).toBe("strong");
  });

  it("caps overlap so a long tag list cannot dominate", () => {
    const tags = ["a", "b", "c", "d", "e"];
    const result = scoreMatch(
      profile({ questionnaire: { lookingFor: tags } }),
      profile({ questionnaire: { offering: tags } }),
    );
    expect(result.score).toBe(
      MATCH_WEIGHTS.lookingOffering * MATCH_WEIGHTS.overlapCap,
    );
  });
});

describe("match bands", () => {
  it("maps thresholds to Strong / Good / Possible without percentages", () => {
    expect(matchBandFromScore(MATCH_BANDS.strong)).toBe("strong");
    expect(matchBandFromScore(MATCH_BANDS.good)).toBe("good");
    expect(matchBandFromScore(MATCH_BANDS.possible)).toBe("possible");
    expect(matchBandFromScore(MATCH_BANDS.possible - 1)).toBeNull();
    expect(matchBandLabel("strong")).toBe("Strong match");
    expect(matchBandLabel("good")).toBe("Good match");
    expect(matchBandLabel("possible")).toBe("Possible match");
  });
});

describe("eligibility helpers", () => {
  it("treats missing privacy as visible and missing category as eligible", () => {
    expect(isProfileVisible({ privacy: null })).toBe(true);
    expect(isMatchmakingEligible({ category: null })).toBe(true);
    expect(
      isMatchCandidate({ privacy: null, category: { matchmakingEligible: true } }),
    ).toBe(true);
  });

  it("hides non-visible profiles and ineligible categories", () => {
    expect(
      isProfileVisible({ privacy: { profileVisible: false } }),
    ).toBe(false);
    expect(
      isMatchmakingEligible({ category: { matchmakingEligible: false } }),
    ).toBe(false);
    expect(
      isMatchCandidate({
        privacy: { profileVisible: true },
        category: { matchmakingEligible: false },
      }),
    ).toBe(false);
  });
});

describe("reasons JSON", () => {
  it("rebuilds labels from stored overlap fields when labels are missing", () => {
    const reasons = parseMatchReasons(
      { sharedInterests: ["Mining"], sameCountry: true },
      "South Africa",
    );
    expect(reasons.labels).toEqual([
      "Shared interests: Mining",
      "You are both based in South Africa",
    ]);
  });

  it("keeps human-readable labels for the why UI", () => {
    const labels = buildMatchLabels({
      lookingOfferingOverlap: ["Capital"],
      offeringLookingOverlap: ["Technology"],
      sharedIndustries: ["Mining"],
      sharedGeographies: ["Southern Africa"],
      sharedMeetingPreferences: ["Partners"],
      sharedInterests: ["Infrastructure"],
      sameCountry: true,
    }, "Kenya");
    expect(labels).toContain(
      "They offer Capital — complementary to what you are looking for",
    );
    expect(labels).toContain("You offer Technology they are seeking");
    expect(labels).toContain("You both work in Mining");
    expect(labels).toContain("You both focus on Southern Africa");
    expect(labels).toContain("You both prefer meetings with Partners");
    expect(labels).toContain("Shared interests: Infrastructure");
    expect(labels).toContain("You are both based in Kenya");
  });
});

describe("overlapTerms", () => {
  it("matches case-insensitively and prefers the candidate wording", () => {
    expect(overlapTerms(["Capital", "Technology"], ["capital", "Distribution"])).toEqual([
      "capital",
    ]);
  });
});
