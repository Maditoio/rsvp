"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Trash2 } from "lucide-react";
import {
  createPoll,
  generatePollDraftAction,
  improvePollBriefAction,
  updatePoll,
} from "@/modules/polls/actions";
import {
  blankQuestion,
  newClientId,
  type PollDraft,
  type PollQuestionDraft,
  type PollQuestionType,
} from "@/modules/polls/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const QUESTION_COUNTS = [3, 5, 7] as const;

type EditorPoll = {
  id: string;
  title: string;
  description: string | null;
  questions: PollQuestionDraft[];
};

export function PollEditorDrawer({
  orgSlug,
  eventId,
  open,
  onClose,
  initial,
}: {
  orgSlug: string;
  eventId: string;
  open: boolean;
  onClose: () => void;
  initial?: EditorPoll | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const isEdit = Boolean(initial?.id);

  const [brief, setBrief] = useState("");
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<PollQuestionDraft[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [improving, startImprove] = useTransition();
  const [generating, startGenerate] = useTransition();
  const [saving, startSave] = useTransition();

  useEffect(() => {
    if (!open) return;
    setBrief(initial?.description ?? "");
    setTitle(initial?.title ?? "");
    setDescription(initial?.description ?? "");
    setQuestions(initial?.questions?.length ? initial.questions : []);
    setShowForm(Boolean(isEdit && initial?.questions?.length));
    setQuestionCount(5);
    setError(null);
  }, [open, initial, isEdit]);

  const busy = improving || generating || saving;

  const draftPayload = useMemo(
    (): PollDraft => ({
      title: title.trim(),
      description: description.trim() || null,
      questions,
    }),
    [title, description, questions],
  );

  function resetForClose() {
    setError(null);
    onClose();
  }

  function revealFormWithQuestion() {
    setShowForm(true);
    setQuestions((prev) =>
      prev.length > 0 ? prev : [blankQuestion("SINGLE")],
    );
  }

  function updateQuestion(
    clientId: string,
    patch: Partial<PollQuestionDraft>,
  ) {
    setQuestions((prev) =>
      prev.map((q) => (q.clientId === clientId ? { ...q, ...patch } : q)),
    );
  }

  function changeType(clientId: string, type: PollQuestionType) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.clientId !== clientId) return q;
        if (type === "TEXT") {
          return { ...q, type, allowOther: false, options: [] };
        }
        const options =
          q.options.length >= 2
            ? q.options
            : [
                { id: newClientId(), label: "Option 1" },
                { id: newClientId(), label: "Option 2" },
              ];
        return { ...q, type, options };
      }),
    );
  }

  function applyDraft(draft: PollDraft, usedAi: boolean, note?: string) {
    setTitle(draft.title);
    setDescription(draft.description ?? "");
    setQuestions(draft.questions);
    setShowForm(true);
    if (usedAi) {
      toast.success("Con·cierge AI drafted your poll.");
    } else if (note) {
      toast.success(note);
    } else {
      toast.success("Draft poll ready — review below.");
    }
  }

  return (
    <Drawer
      open={open}
      onClose={resetForClose}
      title={isEdit ? "Edit poll" : "New poll"}
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={resetForClose}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={busy || !showForm || questions.length === 0}
            onClick={() => {
              setError(null);
              startSave(async () => {
                const result = isEdit
                  ? await updatePoll(orgSlug, eventId, initial!.id, draftPayload)
                  : await createPoll(orgSlug, eventId, draftPayload);
                if (!result.ok) {
                  setError(result.error);
                  toast.error(result.error);
                  return;
                }
                toast.success(isEdit ? "Poll updated." : "Poll saved as draft.");
                resetForClose();
                router.refresh();
              });
            }}
          >
            {saving ? "Saving…" : isEdit ? "Save changes" : "Save draft"}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {!isEdit ? (
          <div>
            <Label htmlFor="poll-brief">What do you want to learn?</Label>
            <div className="relative mt-1.5">
              <Textarea
                id="poll-brief"
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder="e.g. Day 1 session feedback — usefulness, topics to expand, open comments"
                rows={5}
                className="min-h-[140px] resize-none pb-[52px]"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 border-t border-slate-200 bg-white/95 px-2 py-1.5">
                <div className="pointer-events-auto flex items-center gap-1">
                  <button
                    type="button"
                    disabled={busy || brief.trim().length < 8}
                    onClick={() => {
                      setError(null);
                      startImprove(async () => {
                        const result = await improvePollBriefAction(
                          orgSlug,
                          eventId,
                          brief,
                        );
                        if (!result.ok) {
                          setError(result.error);
                          toast.error(result.error);
                          return;
                        }
                        setBrief(result.data.brief);
                        toast.success(
                          result.data.usedAi
                            ? "Description improved."
                            : "Description refined.",
                        );
                      });
                    }}
                    className={cn(
                      "inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-xs font-semibold transition-colors",
                      "text-slate-600 hover:bg-slate-100 hover:text-indigo-700",
                      "disabled:cursor-not-allowed disabled:opacity-40",
                    )}
                  >
                    <Sparkles className="size-3.5" strokeWidth={1.75} aria-hidden />
                    {improving ? "Improving…" : "Improve"}
                  </button>
                  <button
                    type="button"
                    disabled={busy || brief.trim().length < 8}
                    onClick={() => {
                      setError(null);
                      startGenerate(async () => {
                        const result = await generatePollDraftAction(
                          orgSlug,
                          eventId,
                          { brief, questionCount },
                        );
                        if (!result.ok) {
                          setError(result.error);
                          toast.error(result.error);
                          return;
                        }
                        applyDraft(
                          result.data.draft,
                          result.data.usedAi,
                          result.data.note,
                        );
                      });
                    }}
                    className={cn(
                      "inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-xs font-semibold transition-colors",
                      "bg-indigo-600 text-white hover:bg-indigo-700",
                      "disabled:cursor-not-allowed disabled:opacity-40",
                    )}
                  >
                    <Sparkles className="size-3.5" strokeWidth={1.75} aria-hidden />
                    {generating ? "Generating…" : "Generate"}
                  </button>
                </div>
                <div className="pointer-events-auto flex items-center gap-1">
                  {QUESTION_COUNTS.map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setQuestionCount(count)}
                      className={cn(
                        "inline-flex size-7 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                        questionCount === count
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                      )}
                      aria-label={`${count} questions`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {!showForm && !isEdit ? (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="secondary"
              leadingIcon="plus"
              disabled={busy}
              onClick={revealFormWithQuestion}
            >
              New question
            </Button>
          </div>
        ) : null}

        {showForm || isEdit ? (
          <>
            <div className="space-y-4">
              <div>
                <Label htmlFor="poll-title">Poll title</Label>
                <Input
                  id="poll-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Day 1 session feedback"
                  required
                />
              </div>
              <div>
                <Label htmlFor="poll-description">Description (optional)</Label>
                <Textarea
                  id="poll-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Shown to attendees before they respond"
                  rows={2}
                />
              </div>
            </div>

            <div className="space-y-4">
              {questions.map((question, index) => (
                <div
                  key={question.clientId}
                  className="rounded-xl bg-white p-4 shadow-sm"
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <p className="text-label text-slate-400">
                      Question {index + 1}
                    </p>
                    <button
                      type="button"
                      className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      aria-label="Remove question"
                      disabled={questions.length <= 1}
                      onClick={() =>
                        setQuestions((prev) =>
                          prev.filter((q) => q.clientId !== question.clientId),
                        )
                      }
                    >
                      <Trash2 className="size-4" strokeWidth={1.75} />
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor={`q-label-${question.clientId}`}>
                        Question
                      </Label>
                      <Input
                        id={`q-label-${question.clientId}`}
                        value={question.label}
                        onChange={(e) =>
                          updateQuestion(question.clientId, {
                            label: e.target.value,
                          })
                        }
                        placeholder="What should we ask?"
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label htmlFor={`q-type-${question.clientId}`}>
                          Type
                        </Label>
                        <Select
                          id={`q-type-${question.clientId}`}
                          value={question.type}
                          onChange={(e) =>
                            changeType(
                              question.clientId,
                              e.target.value as PollQuestionType,
                            )
                          }
                        >
                          <option value="SINGLE">Single choice</option>
                          <option value="MULTI">Multiple choice</option>
                          <option value="TEXT">Free text</option>
                        </Select>
                      </div>
                      <label className="mt-6 flex items-center gap-2 text-sm text-slate-700">
                        <Checkbox
                          checked={question.required}
                          onChange={(e) =>
                            updateQuestion(question.clientId, {
                              required: e.target.checked,
                            })
                          }
                        />
                        Required
                      </label>
                    </div>

                    {question.type !== "TEXT" ? (
                      <div className="space-y-2">
                        <Label>Options</Label>
                        {question.options.map((option, optIndex) => (
                          <div
                            key={option.id}
                            className="flex items-center gap-2"
                          >
                            <Input
                              value={option.label}
                              onChange={(e) =>
                                updateQuestion(question.clientId, {
                                  options: question.options.map((o) =>
                                    o.id === option.id
                                      ? { ...o, label: e.target.value }
                                      : o,
                                  ),
                                })
                              }
                              placeholder={`Option ${optIndex + 1}`}
                            />
                            <button
                              type="button"
                              className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"
                              aria-label="Remove option"
                              disabled={question.options.length <= 2}
                              onClick={() =>
                                updateQuestion(question.clientId, {
                                  options: question.options.filter(
                                    (o) => o.id !== option.id,
                                  ),
                                })
                              }
                            >
                              <Trash2 className="size-3.5" strokeWidth={1.75} />
                            </button>
                          </div>
                        ))}
                        <div className="flex flex-wrap items-center gap-3">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            leadingIcon="plus"
                            disabled={question.options.length >= 8}
                            onClick={() =>
                              updateQuestion(question.clientId, {
                                options: [
                                  ...question.options,
                                  {
                                    id: newClientId(),
                                    label: `Option ${question.options.length + 1}`,
                                  },
                                ],
                              })
                            }
                          >
                            Add option
                          </Button>
                          <label className="flex items-center gap-2 text-sm text-slate-700">
                            <Checkbox
                              checked={question.allowOther}
                              onChange={(e) =>
                                updateQuestion(question.clientId, {
                                  allowOther: e.target.checked,
                                })
                              }
                            />
                            Allow “Other”
                          </label>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}

              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  leadingIcon="plus"
                  disabled={busy || questions.length >= 10}
                  onClick={() =>
                    setQuestions((prev) => [...prev, blankQuestion("SINGLE")])
                  }
                >
                  Add question
                </Button>
              </div>
            </div>
          </>
        ) : null}

        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </div>
    </Drawer>
  );
}
