"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  closePoll,
  deletePoll,
  publishPoll,
} from "@/modules/polls/actions";
import type { PollQuestionDraft } from "@/modules/polls/types";
import { ActionsMenu } from "@/components/data-table/actions-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { PollEditorDrawer } from "./poll-editor-drawer";

export type OrganiserPollRow = {
  id: string;
  title: string;
  description: string | null;
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  responseCount: number;
  questionCount: number;
  publishedAt: string | null;
  questions: PollQuestionDraft[];
};

function statusTone(status: OrganiserPollRow["status"]) {
  if (status === "PUBLISHED") return "success" as const;
  if (status === "CLOSED") return "muted" as const;
  return "warning" as const;
}

function statusLabel(status: OrganiserPollRow["status"]) {
  if (status === "PUBLISHED") return "Live";
  if (status === "CLOSED") return "Closed";
  return "Draft";
}

export function PollsPanel({
  orgSlug,
  eventId,
  canManage,
  polls,
}: {
  orgSlug: string;
  eventId: string;
  canManage: boolean;
  polls: OrganiserPollRow[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<OrganiserPollRow | null>(null);
  const [confirm, setConfirm] = useState<
    | { type: "publish" | "close" | "delete"; poll: OrganiserPollRow }
    | null
  >(null);

  const sorted = useMemo(
    () =>
      [...polls].sort((a, b) => {
        const order = { PUBLISHED: 0, DRAFT: 1, CLOSED: 2 } as const;
        return order[a.status] - order[b.status] || a.title.localeCompare(b.title);
      }),
    [polls],
  );

  return (
    <div className="space-y-4">
      {sorted.length === 0 ? (
        <div className="rounded-xl bg-white px-6 py-12 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-900">No polls yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Create a poll to collect feedback from attendees. Con·cierge AI can
            draft questions from a short description.
          </p>
          {canManage ? (
            <div className="mt-4 flex justify-center">
              <Button
                type="button"
                leadingIcon="plus"
                onClick={() => {
                  setEditing(null);
                  setEditorOpen(true);
                }}
              >
                New poll
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <ul className="space-y-3">
          {sorted.map((poll) => (
            <li
              key={poll.id}
              className="flex flex-wrap items-center gap-4 rounded-xl bg-white px-5 py-4 shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/app/${orgSlug}/events/${eventId}/polls/${poll.id}`}
                    className="font-semibold text-slate-900 hover:text-indigo-700"
                  >
                    {poll.title}
                  </Link>
                  <Badge tone={statusTone(poll.status)}>
                    {statusLabel(poll.status)}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {poll.questionCount} question
                  {poll.questionCount === 1 ? "" : "s"} · {poll.responseCount}{" "}
                  response{poll.responseCount === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/app/${orgSlug}/events/${eventId}/polls/${poll.id}`}
                  className="inline-flex h-9 items-center rounded-full border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:border-indigo-400 hover:bg-slate-50"
                >
                  {poll.status === "DRAFT" ? "Open" : "Results"}
                </Link>
                {canManage ? (
                  <ActionsMenu
                    disabled={pending}
                    items={[
                      ...(poll.status === "DRAFT"
                        ? [
                            {
                              id: "edit",
                              label: "Edit",
                              onSelect: () => {
                                setEditing(poll);
                                setEditorOpen(true);
                              },
                            },
                            {
                              id: "publish",
                              label: "Publish & notify",
                              onSelect: () =>
                                setConfirm({ type: "publish", poll }),
                            },
                            {
                              id: "delete",
                              label: "Delete",
                              destructive: true as const,
                              onSelect: () =>
                                setConfirm({ type: "delete", poll }),
                            },
                          ]
                        : []),
                      ...(poll.status === "PUBLISHED"
                        ? [
                            {
                              id: "close",
                              label: "Close poll",
                              onSelect: () =>
                                setConfirm({ type: "close", poll }),
                            },
                          ]
                        : []),
                      ...(poll.status === "CLOSED"
                        ? [
                            {
                              id: "delete-closed",
                              label: "Delete",
                              destructive: true as const,
                              onSelect: () =>
                                setConfirm({ type: "delete", poll }),
                            },
                          ]
                        : []),
                    ]}
                  />
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <PollEditorDrawer
        key={editing?.id ?? "new"}
        orgSlug={orgSlug}
        eventId={eventId}
        open={editorOpen}
        onClose={() => {
          setEditorOpen(false);
          setEditing(null);
        }}
        initial={
          editing
            ? {
                id: editing.id,
                title: editing.title,
                description: editing.description,
                questions: editing.questions,
              }
            : null
        }
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title={
          confirm?.type === "publish"
            ? "Publish poll?"
            : confirm?.type === "close"
              ? "Close poll?"
              : "Delete poll?"
        }
        description={
          confirm?.type === "publish"
            ? "Attendees with accounts will get an in-app notification to respond."
            : confirm?.type === "close"
              ? "Attendees will no longer be able to submit new responses."
              : "This permanently removes the poll and its responses."
        }
        confirmLabel={
          confirm?.type === "publish"
            ? "Publish"
            : confirm?.type === "close"
              ? "Close"
              : "Delete"
        }
        destructive={confirm?.type === "delete"}
        pending={pending}
        onConfirm={() => {
          if (!confirm) return;
          const { type, poll } = confirm;
          start(async () => {
            const result =
              type === "publish"
                ? await publishPoll(orgSlug, eventId, poll.id)
                : type === "close"
                  ? await closePoll(orgSlug, eventId, poll.id)
                  : await deletePoll(orgSlug, eventId, poll.id);
            if (!result.ok) {
              toast.error(result.error);
              return;
            }
            if (type === "publish") {
              const notified =
                "notified" in result.data ? result.data.notified : 0;
              toast.success(
                `Poll published. Notified ${notified} attendee${notified === 1 ? "" : "s"}.`,
              );
            } else if (type === "close") {
              toast.success("Poll closed.");
            } else {
              toast.success("Poll deleted.");
            }
            setConfirm(null);
            router.refresh();
          });
        }}
      />
    </div>
  );
}
