"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  deletePlatformEvent,
  setEventSuspended,
} from "@/modules/platform/governance";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";

type EventRow = {
  id: string;
  name: string;
  slug: string;
  suspendedAt: Date | null;
  organisation: {
    id: string;
    name: string;
    slug: string;
    suspendedAt: Date | null;
  };
};

export function PlatformEventRowActions({ event }: { event: EventRow }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const orgSuspended = Boolean(event.organisation.suspendedAt);
  const eventSuspended = Boolean(event.suspendedAt);

  return (
    <>
      <div className="flex justify-end gap-2">
        <Link
          href={`/app/${event.organisation.slug}/events/${event.id}`}
          className="inline-flex h-9 items-center rounded-full border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          Open
        </Link>
        <Button
          type="button"
          size="sm"
          variant={eventSuspended || orgSuspended ? "primary" : "destructive"}
          disabled={pending || orgSuspended}
          onClick={() => {
            start(async () => {
              const result = await setEventSuspended(event.id, !eventSuspended);
              if (!result.ok) {
                toast.error(result.error);
                return;
              }
              toast.success(
                eventSuspended
                  ? `${event.name} is active again.`
                  : `${event.name} has been suspended.`,
              );
              router.refresh();
            });
          }}
        >
          {pending && !confirmOpen
            ? "Saving…"
            : eventSuspended
              ? "Restore"
              : "Suspend"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={pending}
          onClick={() => setConfirmOpen(true)}
        >
          Delete
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => (pending ? undefined : setConfirmOpen(false))}
        title="Delete event?"
        description={`Permanently delete “${event.name}” (${event.organisation.name}) and its invitees, registrations, and related data. This cannot be undone.`}
        confirmLabel="Delete event"
        cancelLabel="Cancel"
        destructive
        pending={pending}
        onConfirm={() => {
          start(async () => {
            const result = await deletePlatformEvent(event.id);
            setConfirmOpen(false);
            if (!result.ok) {
              toast.error(result.error);
              return;
            }
            toast.success(`${event.name} deleted.`);
            router.refresh();
          });
        }}
      />
    </>
  );
}
