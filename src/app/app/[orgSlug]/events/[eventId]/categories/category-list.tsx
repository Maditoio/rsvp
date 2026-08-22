"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteCategory } from "@/modules/events/actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Card } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";

export type CategoryRow = {
  id: string;
  name: string;
  invitationCount: number;
  attendeeCount: number;
};

export function CategoryList({
  orgSlug,
  eventId,
  categories,
  canManage,
}: {
  orgSlug: string;
  eventId: string;
  categories: CategoryRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [deleteTarget, setDeleteTarget] = useState<CategoryRow | null>(null);
  const [pending, start] = useTransition();

  if (categories.length === 0) {
    return <Card>No categories yet.</Card>;
  }

  return (
    <>
      <Table>
        <thead>
          <tr className="border-b border-stone-200">
            <Th>Name</Th>
            <Th>Invitations</Th>
            <Th>Attendees</Th>
            {canManage ? <Th className="w-24 text-right">Actions</Th> : null}
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => (
            <tr key={category.id} className="border-b border-stone-100">
              <Td className="font-medium text-ink-800">{category.name}</Td>
              <Td className="font-mono text-sm">{category.invitationCount}</Td>
              <Td className="font-mono text-sm">{category.attendeeCount}</Td>
              {canManage ? (
                <Td className="text-right">
                  <button
                    type="button"
                    title={`Delete ${category.name}`}
                    disabled={pending}
                    className="inline-flex rounded-sm p-1.5 text-stone-500 hover:bg-stone-100 hover:text-danger disabled:opacity-50"
                    onClick={() => setDeleteTarget(category)}
                  >
                    <Trash2 className="size-4" aria-hidden />
                    <span className="sr-only">Delete {category.name}</span>
                  </button>
                </Td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </Table>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => (pending ? undefined : setDeleteTarget(null))}
        title="Delete this category"
        description={
          deleteTarget
            ? `Remove “${deleteTarget.name}” from this event. Linked invitations and attendees keep their records but lose this category label (${deleteTarget.invitationCount} invitation${deleteTarget.invitationCount === 1 ? "" : "s"}, ${deleteTarget.attendeeCount} attendee${deleteTarget.attendeeCount === 1 ? "" : "s"}).`
            : "Remove this category from the event."
        }
        confirmLabel="Delete category"
        cancelLabel="Keep category"
        destructive
        pending={pending}
        onConfirm={() => {
          if (!deleteTarget) return;
          start(async () => {
            try {
              await deleteCategory(orgSlug, eventId, deleteTarget.id);
              toast.success(`“${deleteTarget.name}” deleted.`);
              setDeleteTarget(null);
              router.refresh();
            } catch (e) {
              toast.error(
                e instanceof Error ? e.message : "Could not delete category",
              );
              setDeleteTarget(null);
            }
          });
        }}
      />
    </>
  );
}
