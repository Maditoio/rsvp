"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Trash2, XCircle } from "lucide-react";
import {
  cancelAttendeeRegistration,
  cancelRegistration,
  confirmAttendeeRegistration,
  confirmRegistration,
  deleteAttendee,
} from "@/modules/registrations/organiser-actions";
import {
  ActionsMenu,
  type ActionsMenuItem,
} from "@/components/data-table/actions-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";

type Intent = "confirm" | "cancel" | "delete";

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
  const toast = useToast();
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
  const canDelete = kind === "attendee" && status !== "CHECKED_IN";

  const items = useMemo(() => {
    const next: ActionsMenuItem[] = [];
    if (canConfirm) {
      next.push({
        id: "confirm",
        label: "Confirm registration",
        icon: <Check className="size-3.5 shrink-0" strokeWidth={1.75} />,
        onSelect: () => setIntent("confirm"),
      });
    }
    if (canCancel) {
      next.push({
        id: "cancel",
        label: "Cancel registration",
        destructive: true,
        icon: <XCircle className="size-3.5 shrink-0" strokeWidth={1.75} />,
        onSelect: () => setIntent("cancel"),
      });
    }
    if (canDelete) {
      if (next.length > 0) {
        next.push({ type: "divider", id: "divider-delete" });
      }
      next.push({
        id: "delete",
        label: "Delete attendee",
        destructive: true,
        icon: <Trash2 className="size-3.5 shrink-0" strokeWidth={1.75} />,
        onSelect: () => setIntent("delete"),
      });
    }
    return next;
  }, [canCancel, canConfirm, canDelete]);

  if (items.length === 0) return null;

  function run(next: Intent) {
    setError(null);
    start(async () => {
      try {
        if (kind === "registration") {
          if (next === "confirm") {
            await confirmRegistration(orgSlug, eventId, subjectId);
          } else if (next === "cancel") {
            await cancelRegistration(orgSlug, eventId, subjectId);
          }
        } else if (next === "confirm") {
          await confirmAttendeeRegistration(orgSlug, eventId, subjectId);
        } else if (next === "cancel") {
          await cancelAttendeeRegistration(orgSlug, eventId, subjectId);
        } else {
          const result = await deleteAttendee(orgSlug, eventId, subjectId);
          if (!result.ok) {
            setError(result.error);
            toast.error(result.error);
            return;
          }
        }
        setIntent(null);
        toast.success(
          next === "confirm"
            ? "Registration confirmed."
            : next === "cancel"
              ? "Registration cancelled."
              : "Attendee removed.",
        );
        router.refresh();
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Could not update registration";
        setError(message);
        toast.error(message);
      }
    });
  }

  return (
    <>
      <ActionsMenu items={items} disabled={pending} />
      {error ? (
        <p className="mt-1 text-right text-xs text-danger">{error}</p>
      ) : null}
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
        description="The attendee will be marked cancelled and will no longer appear as registered. You can delete them afterwards to remove the invitee record as well."
        confirmLabel="Cancel registration"
        cancelLabel="Keep registration"
        destructive
        pending={pending}
        onConfirm={() => run("cancel")}
      />
      <ConfirmDialog
        open={intent === "delete"}
        onClose={() => (pending ? undefined : setIntent(null))}
        title="Delete this attendee"
        description="Permanently remove this attendee from the event. This clears their registration record so you can also delete the invitee if needed. Checked-in attendees cannot be deleted."
        confirmLabel="Delete attendee"
        cancelLabel="Keep attendee"
        destructive
        pending={pending}
        onConfirm={() => run("delete")}
      />
    </>
  );
}
