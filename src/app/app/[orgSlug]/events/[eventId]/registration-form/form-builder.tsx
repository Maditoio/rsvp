"use client";

import { Suspense, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import {
  deleteRegistrationField,
  saveRegistrationField,
} from "@/modules/registrations/form-actions";
import { FIELD_TYPES, LOCKED_FIELD_KEYS } from "@/modules/registrations/defaults";
import type { StoredField } from "@/modules/registrations/form";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-table/data-table";
import { ActionsMenu } from "@/components/data-table/actions-menu";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { humanizeEnum } from "@/lib/utils";

export function RegistrationFormBuilder({
  orgSlug,
  eventId,
  fields,
  canManage,
}: {
  orgSlug: string;
  eventId: string;
  fields: StoredField[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StoredField | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const needsOptions = (type: string) =>
    ["select", "radio", "checkbox", "multiselect"].includes(type);
  const [showOptions, setShowOptions] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setShowOptions(false);
    setError(null);
    setOpen(true);
  };

  const openEdit = (field: StoredField) => {
    setEditing(field);
    setShowOptions(needsOptions(field.type));
    setError(null);
    setOpen(true);
  };

  const columns: DataTableColumn<StoredField>[] = [
    {
      id: "field",
      header: "Field",
      width: "2fr",
      cell: (field) => (
        <div>
          <p className="font-medium text-slate-700">{field.label}</p>
          <p className="text-xs text-slate-500">{field.key}</p>
        </div>
      ),
    },
    {
      id: "type",
      header: "Type",
      width: "1.2fr",
      cell: (field) => humanizeEnum(field.type),
    },
    {
      id: "required",
      header: "Required",
      width: "1fr",
      cell: (field) => (
        <Badge tone={field.required ? "default" : "muted"}>
          {field.required ? "Required" : "Optional"}
        </Badge>
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
            cell: (field: StoredField) => {
              const locked = LOCKED_FIELD_KEYS.includes(
                field.key as (typeof LOCKED_FIELD_KEYS)[number],
              );
              return (
                <ActionsMenu
                  disabled={pending}
                  items={[
                    {
                      id: "edit",
                      label: "Edit field",
                      icon: (
                        <Pencil
                          className="size-3.5 shrink-0"
                          strokeWidth={1.75}
                        />
                      ),
                      onSelect: () => openEdit(field),
                    },
                    ...(!locked
                      ? [
                          { type: "divider" as const, id: "div" },
                          {
                            id: "delete",
                            label: "Remove field",
                            destructive: true,
                            icon: (
                              <Trash2
                                className="size-3.5 shrink-0"
                                strokeWidth={1.75}
                              />
                            ),
                            onSelect: () => {
                              const formData = new FormData();
                              formData.set("fieldId", field.id);
                              setError(null);
                              start(async () => {
                                try {
                                  await deleteRegistrationField(
                                    orgSlug,
                                    eventId,
                                    formData,
                                  );
                                  router.refresh();
                                } catch (e) {
                                  setError(
                                    e instanceof Error
                                      ? e.message
                                      : "Could not delete field",
                                  );
                                }
                              });
                            },
                          },
                        ]
                      : []),
                  ]}
                />
              );
            },
          } satisfies DataTableColumn<StoredField>,
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Registration"
        title="Registration form"
        description="Invitees complete this form after they accept. Name and email cannot be removed."
        actions={
          canManage ? (
            <Button type="button" leadingIcon="plus" onClick={openCreate}>
              Add field
            </Button>
          ) : undefined
        }
      />

      <Suspense fallback={<div className="h-40 rounded-xl bg-white shadow-sm" />}>
        <DataTable
          rows={fields}
          columns={columns}
          getRowId={(field) => field.id}
          searchPlaceholder="Search fields…"
          searchFilter={(field, query) => {
            const haystack = [field.label, field.key, field.type]
              .join(" ")
              .toLowerCase();
            return haystack.includes(query);
          }}
          emptyMessage="No fields yet."
          minRowHeight="double"
        />
      </Suspense>
      {error && !open ? <p className="text-sm text-danger">{error}</p> : null}

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit field" : "Add field"}
        description="Only one field is edited at a time."
      >
        <form
          className="space-y-4"
          action={(formData) => {
            setError(null);
            start(async () => {
              try {
                await saveRegistrationField(orgSlug, eventId, formData);
                setOpen(false);
                router.refresh();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Could not save field");
              }
            });
          }}
        >
          {editing ? <input type="hidden" name="fieldId" value={editing.id} /> : null}
          <div>
            <Label htmlFor="label">Label</Label>
            <Input id="label" name="label" required defaultValue={editing?.label ?? ""} />
          </div>
          <div>
            <Label htmlFor="type">Type</Label>
            <Select
              id="type"
              name="type"
              defaultValue={editing?.type ?? "text"}
              disabled={Boolean(
                editing &&
                  LOCKED_FIELD_KEYS.includes(
                    editing.key as (typeof LOCKED_FIELD_KEYS)[number],
                  ),
              )}
              onChange={(event) => setShowOptions(needsOptions(event.target.value))}
            >
              {FIELD_TYPES.map((type) => (
                <option key={type} value={type}>
                  {humanizeEnum(type)}
                </option>
              ))}
            </Select>
          </div>
          {showOptions || (editing && needsOptions(editing.type)) ? (
            <div>
              <Label htmlFor="options">Options (one per line)</Label>
              <Textarea
                id="options"
                name="options"
                defaultValue={editing?.options?.join("\n") ?? ""}
              />
            </div>
          ) : null}
          <label className="flex items-center gap-2 text-body text-slate-700">
            <Checkbox
              name="required"
              defaultChecked={editing?.required ?? false}
              disabled={Boolean(
                editing &&
                  LOCKED_FIELD_KEYS.includes(
                    editing.key as (typeof LOCKED_FIELD_KEYS)[number],
                  ),
              )}
            />
            Required
          </label>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <div className="flex justify-between">
            {editing &&
            !LOCKED_FIELD_KEYS.includes(
              editing.key as (typeof LOCKED_FIELD_KEYS)[number],
            ) ? (
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => {
                  const formData = new FormData();
                  formData.set("fieldId", editing.id);
                  setError(null);
                  start(async () => {
                    try {
                      await deleteRegistrationField(orgSlug, eventId, formData);
                      setOpen(false);
                      router.refresh();
                    } catch (e) {
                      setError(
                        e instanceof Error ? e.message : "Could not delete field",
                      );
                    }
                  });
                }}
              >
                Remove field
              </Button>
            ) : (
              <span />
            )}
            <Button disabled={pending}>{pending ? "Saving…" : "Save field"}</Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
