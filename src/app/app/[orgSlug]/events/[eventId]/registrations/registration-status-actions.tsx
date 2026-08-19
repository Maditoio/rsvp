"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, XCircle } from "lucide-react";
import {
  cancelAttendeeRegistration,
  cancelRegistration,
  confirmAttendeeRegistration,
  confirmRegistration,
} from "@/modules/registrations/organiser-actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type Intent = "confirm" | "cancel";

export function RegistrationStatusActions({
  orgSlug,
  eventId,
  subjectId,
  kind,
  status,
}: {
  orgSlug: string;
  eventId: string;
  subjectId: string;
  kind: "registration" | "attendee";
  status: string;
}) {
  const router = useRouter();
  const [intent, setIntent] = useState<Intent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const canConfirm =
    kind === "registration"
      ? status === "COMPLETED" || status === "WAITLISTED"
      : status === "REGISTERED";
  const canCancel =
    kind === "registration"
      ? ["NOT_STARTED", "INCOMPLETE", "COMPLETED", "CONFIRMED", "WAITLISTED"].includes(
          status,
        )
      : status === "REGISTERED" || status === "CONFIRMED";

  if (!canConfirm && !canCancel) return null;

  function run(next: Intent) {
    setError(null);
    start(async () => {
      try {
        if (kind === "registration") {
          if (next === "confirm") {
            await confirmRegistration(orgSlug, eventId, subjectId);
          } else {
            await cancelRegistration(orgSlug, eventId, subjectId);
          }
        } else if (next === "confirm") {
          await confirmAttendeeRegistration(orgSlug, eventId, subjectId);
        } else {
          await cancelAttendeeRegistration(orgSlug, eventId, subjectId);
        }
        setIntent(null);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not update registration");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center justify-end gap-1">
        {canConfirm ? (
          <button
            type="button"
            title="Confirm registration"
            disabled={pending}
            className="rounded-sm p-1.5 text-stone-500 hover:bg-stone-100 hover:text-ink-700 disabled:opacity-50"
            onClick={() => setIntent("confirm")}
          >
            <Check className="size-4" />
          </button>
        ) : null}
        {canCancel ? (
          <button
            type="button"
            title="Cancel registration"
            disabled={pending}
            className="rounded-sm p-1.5 text-stone-500 hover:bg-stone-100 hover:text-danger disabled:opacity-50"
            onClick={() => setIntent("cancel")}
          >
            <XCircle className="size-4" />
          </button>
        ) : null}
      </div>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
      <ConfirmDialog
        open={intent === "confirm"}
        onClose={() => (pending ? undefined : setIntent(null))}
        title="Confirm this registration"
        description="The attendee will move from registered to confirmed. This is recorded in the audit log."
        confirmLabel="Confirm registration"
        pending={pending}
        onConfirm={() => run("confirm")}
      />
      <ConfirmDialog
        open={intent === "cancel"}
        onClose={() => (pending ? undefined : setIntent(null))}
        title="Cancel this registration"
        description="The attendee will be marked cancelled and will no longer appear as registered."
        confirmLabel="Cancel registration"
        cancelLabel="Keep registration"
        destructive
        pending={pending}
        onConfirm={() => run("cancel")}
      />
    </div>
  );
}
