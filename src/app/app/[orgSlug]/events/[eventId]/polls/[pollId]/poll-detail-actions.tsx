"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { closePoll, publishPoll } from "@/modules/polls/actions";
import type { PollQuestionDraft } from "@/modules/polls/types";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { PollEditorDrawer } from "../poll-editor-drawer";

export function PollDetailActions({
  orgSlug,
  eventId,
  poll,
}: {
  orgSlug: string;
  eventId: string;
  poll: {
    id: string;
    title: string;
    description: string | null;
    status: "DRAFT" | "PUBLISHED" | "CLOSED";
    questions: PollQuestionDraft[];
  };
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {poll.status === "DRAFT" ? (
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditOpen(true)}
            >
              Edit
            </Button>
            <Button type="button" onClick={() => setConfirmPublish(true)}>
              Publish & notify
            </Button>
          </>
        ) : null}
        {poll.status === "PUBLISHED" ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => setConfirmClose(true)}
          >
            Close poll
          </Button>
        ) : null}
      </div>

      <PollEditorDrawer
        orgSlug={orgSlug}
        eventId={eventId}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        initial={{
          id: poll.id,
          title: poll.title,
          description: poll.description,
          questions: poll.questions,
        }}
      />

      <ConfirmDialog
        open={confirmPublish}
        onClose={() => setConfirmPublish(false)}
        title="Publish poll?"
        description="Attendees with accounts will get an in-app notification to respond."
        confirmLabel="Publish"
        pending={pending}
        onConfirm={() => {
          start(async () => {
            const result = await publishPoll(orgSlug, eventId, poll.id);
            if (!result.ok) {
              toast.error(result.error);
              return;
            }
            toast.success(
              `Published. Notified ${result.data.notified} attendee${result.data.notified === 1 ? "" : "s"}.`,
            );
            setConfirmPublish(false);
            router.refresh();
          });
        }}
      />

      <ConfirmDialog
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        title="Close poll?"
        description="Attendees will no longer be able to submit new responses."
        confirmLabel="Close"
        pending={pending}
        onConfirm={() => {
          start(async () => {
            const result = await closePoll(orgSlug, eventId, poll.id);
            if (!result.ok) {
              toast.error(result.error);
              return;
            }
            toast.success("Poll closed.");
            setConfirmClose(false);
            router.refresh();
          });
        }}
      />
    </>
  );
}
