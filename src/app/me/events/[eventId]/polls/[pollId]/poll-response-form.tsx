"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { submitPollResponse } from "@/modules/polls/actions";
import type { PollOption } from "@/modules/polls/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Radio } from "@/components/ui/radio";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";

export type AttendeePollQuestion = {
  id: string;
  label: string;
  type: "SINGLE" | "MULTI" | "TEXT";
  required: boolean;
  allowOther: boolean;
  options: PollOption[];
};

type AnswerState = {
  selectedOptionIds: string[];
  otherText: string;
  textValue: string;
};

export function PollResponseForm({
  eventId,
  pollId,
  questions,
}: {
  eventId: string;
  pollId: string;
  questions: AttendeePollQuestion[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>(() =>
    Object.fromEntries(
      questions.map((q) => [
        q.id,
        { selectedOptionIds: [], otherText: "", textValue: "" },
      ]),
    ),
  );

  function patch(questionId: string, next: Partial<AnswerState>) {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], ...next },
    }));
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const payload = questions.map((q) => {
            const a = answers[q.id];
            return {
              questionId: q.id,
              selectedOptionIds: a.selectedOptionIds,
              otherText: a.otherText || null,
              textValue: a.textValue || null,
            };
          });
          const result = await submitPollResponse(eventId, pollId, payload);
          if (!result.ok) {
            setError(result.error);
            toast.error(result.error);
            return;
          }
          toast.success("Thank you — your response was submitted.");
          router.refresh();
        });
      }}
    >
      {questions.map((question, index) => {
        const answer = answers[question.id];
        return (
          <fieldset
            key={question.id}
            className="rounded-xl bg-white p-5 shadow-sm"
          >
            <legend className="text-sm font-semibold text-slate-900">
              {index + 1}. {question.label}
              {question.required ? (
                <span className="text-danger"> *</span>
              ) : null}
            </legend>

            {question.type === "TEXT" ? (
              <div className="mt-3">
                <Label htmlFor={`text-${question.id}`} className="sr-only">
                  Answer
                </Label>
                <Textarea
                  id={`text-${question.id}`}
                  value={answer.textValue}
                  onChange={(e) =>
                    patch(question.id, { textValue: e.target.value })
                  }
                  required={question.required}
                  rows={4}
                />
              </div>
            ) : null}

            {question.type === "SINGLE" ? (
              <div className="mt-3 space-y-2">
                {question.options.map((opt) => (
                  <label
                    key={opt.id}
                    className="flex items-center gap-2.5 text-sm text-slate-700"
                  >
                    <Radio
                      name={`q-${question.id}`}
                      checked={answer.selectedOptionIds[0] === opt.id}
                      onChange={() =>
                        patch(question.id, {
                          selectedOptionIds: [opt.id],
                          otherText: "",
                        })
                      }
                    />
                    {opt.label}
                  </label>
                ))}
                {question.allowOther ? (
                  <div className="space-y-2">
                    <label className="flex items-center gap-2.5 text-sm text-slate-700">
                      <Radio
                        name={`q-${question.id}`}
                        checked={
                          answer.selectedOptionIds.length === 0 &&
                          Boolean(answer.otherText)
                        }
                        onChange={() =>
                          patch(question.id, { selectedOptionIds: [] })
                        }
                      />
                      Other
                    </label>
                    <Input
                      value={answer.otherText}
                      onChange={(e) =>
                        patch(question.id, {
                          otherText: e.target.value,
                          selectedOptionIds: [],
                        })
                      }
                      placeholder="Please specify"
                      className="ml-7 max-w-md"
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

            {question.type === "MULTI" ? (
              <div className="mt-3 space-y-2">
                {question.options.map((opt) => {
                  const checked = answer.selectedOptionIds.includes(opt.id);
                  return (
                    <label
                      key={opt.id}
                      className="flex items-center gap-2.5 text-sm text-slate-700"
                    >
                      <Checkbox
                        checked={checked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...answer.selectedOptionIds, opt.id]
                            : answer.selectedOptionIds.filter(
                                (id) => id !== opt.id,
                              );
                          patch(question.id, { selectedOptionIds: next });
                        }}
                      />
                      {opt.label}
                    </label>
                  );
                })}
                {question.allowOther ? (
                  <div className="space-y-2">
                    <label className="flex items-center gap-2.5 text-sm text-slate-700">
                      <Checkbox
                        checked={Boolean(answer.otherText)}
                        onChange={(e) => {
                          if (!e.target.checked) {
                            patch(question.id, { otherText: "" });
                          }
                        }}
                      />
                      Other
                    </label>
                    <Input
                      value={answer.otherText}
                      onChange={(e) =>
                        patch(question.id, { otherText: e.target.value })
                      }
                      placeholder="Please specify"
                      className="ml-7 max-w-md"
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
          </fieldset>
        );
      })}

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Submitting…" : "Submit response"}
        </Button>
      </div>
    </form>
  );
}
