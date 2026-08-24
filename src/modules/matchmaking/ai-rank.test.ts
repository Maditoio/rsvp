import { describe, expect, it } from "vitest";
import { validateAiRankings } from "./ai-rank";

describe("validateAiRankings", () => {
  it("accepts only allowed candidate IDs", () => {
    const allowed = new Set(["a1", "a2"]);
    const rankings = validateAiRankings(
      {
        candidate_rankings: [
          { candidate_id: "a1", rank_score: 88, reason: "Strong fit" },
          { candidate_id: "evil", rank_score: 99, reason: "Injected" },
          { candidate_id: "a2", rank_score: 72, reason: "Good overlap" },
        ],
      },
      allowed,
    );
    expect(rankings).toHaveLength(2);
    expect(rankings.map((r) => r.candidateId)).toEqual(["a1", "a2"]);
  });

  it("rejects invalid JSON shape", () => {
    expect(validateAiRankings({ foo: "bar" }, new Set(["a1"]))).toEqual([]);
    expect(
      validateAiRankings(
        { candidate_rankings: [{ candidate_id: "a1", rank_score: 200, reason: "x" }] },
        new Set(["a1"]),
      ),
    ).toEqual([]);
  });

  it("deduplicates candidate IDs", () => {
    const allowed = new Set(["a1"]);
    const rankings = validateAiRankings(
      {
        candidate_rankings: [
          { candidate_id: "a1", rank_score: 80, reason: "First" },
          { candidate_id: "a1", rank_score: 90, reason: "Duplicate" },
        ],
      },
      allowed,
    );
    expect(rankings).toHaveLength(1);
    expect(rankings[0]?.rankScore).toBe(80);
  });
});
