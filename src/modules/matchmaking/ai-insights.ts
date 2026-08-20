import OpenAI from "openai";

const SYSTEM_PROMPT =
  "You are analyzing professional networking compatibility. Never reveal private data. Only discuss professional synergies. " +
  "Given two attendee profiles and their structured match score, write a concise 2-3 sentence professional explanation of why they are a good match. " +
  "Focus on complementary objectives, shared industries, and mutual value. Be specific but concise.";

type MatchmakingProfileData = {
  interests: string[];
  lookingFor: string[];
  offering: string[];
  industries: string[];
  geographies: string[];
};

export type AiInsightResult =
  | { insight: string; error?: undefined }
  | { insight: null; error: string };

function openaiClient() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not configured");
  return new OpenAI({ apiKey: key });
}

function openaiModel() {
  return process.env.OPENAI_MATCH_MODEL?.trim() || "gpt-4o-mini";
}

export async function generateMatchInsight(
  profileA: MatchmakingProfileData,
  profileB: MatchmakingProfileData,
  structuredScore: number,
  reasons: string[],
): Promise<AiInsightResult> {
  try {
    const client = openaiClient();

    const payload = {
      attendee_a: {
        interests: profileA.interests,
        looking_for: profileA.lookingFor,
        offering: profileA.offering,
        industries: profileA.industries,
        geographies: profileA.geographies,
      },
      attendee_b: {
        interests: profileB.interests,
        looking_for: profileB.lookingFor,
        offering: profileB.offering,
        industries: profileB.industries,
        geographies: profileB.geographies,
      },
      match_score: structuredScore,
      match_reasons: reasons,
    };

    const response = await client.chat.completions.create({
      model: openaiModel(),
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify(payload) },
      ],
      max_tokens: 200,
      temperature: 0.7,
    });

    const insight = response.choices[0]?.message?.content?.trim();
    if (!insight) {
      return { insight: null, error: "No response from AI" };
    }
    return { insight };
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI generation failed";
    return { insight: null, error: message };
  }
}
