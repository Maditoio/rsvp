import OpenAI from "openai";
import { z } from "zod";

const SYSTEM_PROMPT =
  "You rank professional networking matches. Never reveal private data. " +
  "Given structured match scores and profile summaries, return a JSON object with " +
  "candidate_rankings: an array of { candidate_id, rank_score (0-100), reason (max 120 chars) }. " +
  "Only include IDs from the provided list. rank_score reflects semantic fit on top of structured scoring.";

const rankingItemSchema = z.object({
  candidate_id: z.string().min(1),
  rank_score: z.number().min(0).max(100),
  reason: z.string().max(200),
});

const rankingResponseSchema = z.object({
  candidate_rankings: z.array(rankingItemSchema).max(20),
});

export type AiRankItem = {
  candidateId: string;
  rankScore: number;
  reason: string;
};

export type AiRankResult =
  | { rankings: AiRankItem[]; error?: undefined }
  | { rankings: null; error: string };

function openaiClient() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not configured");
  return new OpenAI({ apiKey: key });
}

function openaiModel() {
  return process.env.OPENAI_MATCH_MODEL?.trim() || "gpt-4o-mini";
}

export function validateAiRankings(
  raw: unknown,
  allowedCandidateIds: Set<string>,
): AiRankItem[] {
  const parsed = rankingResponseSchema.safeParse(raw);
  if (!parsed.success) return [];

  const out: AiRankItem[] = [];
  const seen = new Set<string>();
  for (const row of parsed.data.candidate_rankings) {
    if (!allowedCandidateIds.has(row.candidate_id)) continue;
    if (seen.has(row.candidate_id)) continue;
    seen.add(row.candidate_id);
    out.push({
      candidateId: row.candidate_id,
      rankScore: row.rank_score,
      reason: row.reason.trim(),
    });
  }
  return out;
}

export async function generateAiRankings(input: {
  subjectId: string;
  subjectSummary: Record<string, unknown>;
  candidates: {
    id: string;
    structuredScore: number;
    summary: Record<string, unknown>;
    labels: string[];
  }[];
}): Promise<AiRankResult> {
  if (input.candidates.length === 0) {
    return { rankings: [] };
  }

  try {
    const client = openaiClient();
    const payload = {
      subject_id: input.subjectId,
      subject: input.subjectSummary,
      candidates: input.candidates.map((c) => ({
        candidate_id: c.id,
        structured_score: c.structuredScore,
        summary: c.summary,
        match_labels: c.labels,
      })),
    };

    const response = await client.chat.completions.create({
      model: openaiModel(),
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify(payload) },
      ],
      max_tokens: 600,
      temperature: 0.4,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      return { rankings: null, error: "No response from AI" };
    }

    let json: unknown;
    try {
      json = JSON.parse(content);
    } catch {
      return { rankings: null, error: "Invalid AI JSON response" };
    }

    const allowed = new Set(input.candidates.map((c) => c.id));
    const rankings = validateAiRankings(json, allowed);
    if (rankings.length === 0) {
      return { rankings: null, error: "AI returned no valid candidate rankings" };
    }

    return { rankings };
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI ranking failed";
    return { rankings: null, error: message };
  }
}
