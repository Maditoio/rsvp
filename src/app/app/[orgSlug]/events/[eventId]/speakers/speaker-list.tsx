"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import {
  deleteEventSpeakerAction,
  removeEventSpeakerPhotoAction,
  reorderEventSpeakerAction,
  toggleEventSpeakerHiddenAction,
} from "@/modules/speakers/actions";
import {
  speakerDisplayName,
  type EventSpeakerRecord,
} from "@/modules/speakers/config";
import { SpeakerForm } from "./speaker-form";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ActionsMenu } from "@/components/data-table/actions-menu";
import { useToast } from "@/components/ui/toast";

export function SpeakerList({
  orgSlug,
  eventId,
  speakers,
  canManage,
}: {
  orgSlug: string;
  eventId: string;
  speakers: EventSpeakerRecord[];
  canManage: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [deleteTarget, setDeleteTarget] = useState<EventSpeakerRecord | null>(
    null,
  );
  const [editTarget, setEditTarget] = useState<EventSpeakerRecord | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [pending, start] = useTransition();

  if (speakers.length === 0) {
    return (
      <Card className="space-y-4 p-6">
        <p className="text-sm text-slate-600">No speakers yet.</p>
        <p className="text-sm text-slate-500">
          Add speakers here — they appear on the event website when the{" "}
          <Link
            href={`/app/${orgSlug}/events/${eventId}/website`}
            className="font-medium text-indigo-600 hover:text-indigo-700"
          >
            Speakers section
          </Link>{" "}
          is enabled and published.
        </p>
        {canManage ? (
          <Button type="button" variant="secondary" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" strokeWidth={1.75} aria-hidden />
            Add speaker
          </Button>
        ) : null}
        {createOpen ? (
          <SpeakerForm
            orgSlug={orgSlug}
            eventId={eventId}
            open
            onOpenChange={setCreateOpen}
          />
        ) : null}
      </Card>
    );
  }

  function reorder(speakerId: string, direction: "up" | "down") {
    start(async () => {
      const result = await reorderEventSpeakerAction(
        orgSlug,
        eventId,
        speakerId,
        direction,
      );
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  function toggleHidden(speaker: EventSpeakerRecord) {
    start(async () => {
      const result = await toggleEventSpeakerHiddenAction(
        orgSlug,
        eventId,
        speaker.id,
        !speaker.hidden,
      );
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      {canManage ? (
        <div className="mb-4 flex justify-end">
          <Button type="button" variant="secondary" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" strokeWidth={1.75} aria-hidden />
            Add speaker
          </Button>
        </div>
      ) : null}

      <ul className="space-y-2">
        {speakers.map((speaker, index) => {
          const label = speakerDisplayName(speaker);
          return (
            <li
              key={speaker.id}
              className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm"
            >
              {speaker.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={speaker.photoUrl}
                  alt={label}
                  className="size-10 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                  {label.slice(0, 1).toUpperCase()}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium text-slate-900">{label}</p>
                  {speaker.featured ? (
                    <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-violet-700">
                      Featured
                    </span>
                  ) : null}
                  {speaker.hidden ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-slate-500">
                      Hidden
                    </span>
                  ) : null}
                </div>
                <p className="truncate text-xs text-slate-500">
                  {[speaker.jobTitle, speaker.organization].filter(Boolean).join(" · ") ||
                    "No title"}
                </p>
              </div>

              {canManage ? (
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    aria-label={speaker.hidden ? `Show ${label}` : `Hide ${label}`}
                    onClick={() => toggleHidden(speaker)}
                  >
                    {speaker.hidden ? (
                      <EyeOff className="size-4" strokeWidth={1.75} />
                    ) : (
                      <Eye className="size-4" strokeWidth={1.75} />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={pending || index === 0}
                    aria-label={`Move ${label} up`}
                    onClick={() => reorder(speaker.id, "up")}
                  >
                    <ArrowUp className="size-4" strokeWidth={1.75} />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={pending || index === speakers.length - 1}
                    aria-label={`Move ${label} down`}
                    onClick={() => reorder(speaker.id, "down")}
                  >
                    <ArrowDown className="size-4" strokeWidth={1.75} />
                  </Button>
                  <ActionsMenu
                    disabled={pending}
                    items={[
                      {
                        id: "edit",
                        label: "Edit speaker",
                        icon: (
                          <Pencil className="size-3.5 shrink-0" strokeWidth={1.75} />
                        ),
                        onSelect: () => setEditTarget(speaker),
                      },
                      ...(speaker.photoUrl
                        ? [
                            {
                              id: "remove-photo",
                              label: "Remove photo",
                              onSelect: () => {
                                start(async () => {
                                  const result = await removeEventSpeakerPhotoAction(
                                    orgSlug,
                                    eventId,
                                    speaker.id,
                                  );
                                  if (!result.ok) {
                                    toast.error(result.error);
                                    return;
                                  }
                                  toast.success("Photo removed.");
                                  router.refresh();
                                });
                              },
                            },
                          ]
                        : []),
                      {
                        id: "delete",
                        label: "Delete speaker",
                        destructive: true,
                        icon: (
                          <Trash2 className="size-3.5 shrink-0" strokeWidth={1.75} />
                        ),
                        onSelect: () => setDeleteTarget(speaker),
                      },
                    ]}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => (pending ? undefined : setDeleteTarget(null))}
        title="Delete this speaker"
        description={
          deleteTarget
            ? `Remove “${speakerDisplayName(deleteTarget)}” from this event. They will disappear from the website.`
            : "Remove this speaker from the event."
        }
        confirmLabel="Delete speaker"
        cancelLabel="Keep speaker"
        destructive
        pending={pending}
        onConfirm={() => {
          if (!deleteTarget) return;
          start(async () => {
            const result = await deleteEventSpeakerAction(
              orgSlug,
              eventId,
              deleteTarget.id,
            );
            if (!result.ok) {
              toast.error(result.error);
              setDeleteTarget(null);
              return;
            }
            toast.success(`“${speakerDisplayName(deleteTarget)}” deleted.`);
            setDeleteTarget(null);
            router.refresh();
          });
        }}
      />

      {editTarget ? (
        <SpeakerForm
          orgSlug={orgSlug}
          eventId={eventId}
          speaker={editTarget}
          open
          onOpenChange={(next) => {
            if (!next) setEditTarget(null);
          }}
        />
      ) : null}

      {createOpen ? (
        <SpeakerForm
          orgSlug={orgSlug}
          eventId={eventId}
          open
          onOpenChange={setCreateOpen}
        />
      ) : null}
    </>
  );
}
