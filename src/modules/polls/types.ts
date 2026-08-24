import { z } from "zod";

export const POLL_QUESTION_TYPES = ["SINGLE", "MULTI", "TEXT"] as const;
export type PollQuestionType = (typeof POLL_QUESTION_TYPES)[number];

export const pollOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(120),
});

export type PollOption = z.infer<typeof pollOptionSchema>;

export const pollQuestionDraftSchema = z.object({
  clientId: z.string().min(1),
  label: z.string().min(1).max(280),
  type: z.enum(POLL_QUESTION_TYPES),
  required: z.boolean(),
  allowOther: z.boolean(),
  options: z.array(pollOptionSchema).max(8),
});

export type PollQuestionDraft = z.infer<typeof pollQuestionDraftSchema>;

export const pollDraftSchema = z.object({
  title: z.string().min(2).max(160),
  description: z.string().max(800).optional().nullable(),
  questions: z.array(pollQuestionDraftSchema).min(1).max(10),
});

export type PollDraft = z.infer<typeof pollDraftSchema>;

export function newClientId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function blankQuestion(
  type: PollQuestionType = "SINGLE",
): PollQuestionDraft {
  return {
    clientId: newClientId(),
    label: "",
    type,
    required: true,
    allowOther: false,
    options:
      type === "TEXT"
        ? []
        : [
            { id: newClientId(), label: "Option 1" },
            { id: newClientId(), label: "Option 2" },
          ],
  };
}

export function parsePollOptions(value: unknown): PollOption[] {
  const parsed = z.array(pollOptionSchema).safeParse(value);
  return parsed.success ? parsed.data : [];
}

export function parseSelectedOptionIds(value: unknown): string[] {
  const parsed = z.array(z.string()).safeParse(value);
  return parsed.success ? parsed.data : [];
}
