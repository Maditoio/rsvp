"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteCategory } from "@/modules/events/actions";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-table/data-table";
import { ActionsMenu } from "@/components/data-table/actions-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Card } from "@/components/ui/card";
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

  const columns: DataTableColumn<CategoryRow>[] = [
    {
      id: "name",
      header: "Name",
      width: "2fr",
      cell: (category) => (
        <span className="font-medium text-slate-700">{category.name}</span>
      ),
    },
    {
      id: "invitations",
      header: "Invitations",
      width: "1fr",
      cell: (category) => (
        <span className="font-mono text-sm">{category.invitationCount}</span>
      ),
    },
    {
      id: "attendees",
      header: "Attendees",
      width: "1fr",
      cell: (category) => (
        <span className="font-mono text-sm">{category.attendeeCount}</span>
      ),
    },
    ...(canManage
      ? [
          {
            id: "actions",
            header: "",
            width: "60px",
            headerClassName: "sr-only",
            cellClassName: "justify-self-end",
            cell: (category: CategoryRow) => (
              <ActionsMenu
                disabled={pending}
                items={[
                  {
                    id: "delete",
                    label: "Delete category",
                    destructive: true,
                    icon: (
                      <Trash2 className="size-3.5 shrink-0" strokeWidth={1.75} />
                    ),
                    onSelect: () => setDeleteTarget(category),
                  },
                ]}
              />
            ),
          } satisfies DataTableColumn<CategoryRow>,
        ]
      : []),
  ];

  return (
    <>
      <DataTable
        rows={categories}
        columns={columns}
        getRowId={(category) => category.id}
        searchPlaceholder="Search categories…"
        searchFilter={(category, query) =>
          category.name.toLowerCase().includes(query)
        }
        emptyMessage="No categories yet."
      />

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
