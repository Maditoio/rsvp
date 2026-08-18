"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  deleteRegistrationField,
  saveRegistrationField,
} from "@/modules/registrations/form-actions";
import { FIELD_TYPES, LOCKED_FIELD_KEYS } from "@/modules/registrations/defaults";
import type { StoredField } from "@/modules/registrations/form";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, Td, Th } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { humanizeEnum } from "@/lib/utils";

const selectClassName =
  "h-[42px] w-full rounded-sm border border-stone-300 bg-stone-0 px-4 text-[0.9375rem] text-ink-700 outline-none focus:border-ink-700 focus:ring-3 focus:ring-ink-700/12";

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

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-bronze-600">
            Registration
          </p>
          <h1 className="mt-1 font-display text-3xl text-ink-800">
            Registration form
          </h1>
          <p className="mt-1 text-sm text-stone-700">
            Invitees complete this form after they accept. Name and email cannot
            be removed.
          </p>
        </div>
        {canManage ? (
          <Button type="button" onClick={openCreate}>
            Add field
          </Button>
        ) : null}
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Field</Th>
            <Th>Type</Th>
            <Th>Required</Th>
            {canManage ? <Th>Actions</Th> : null}
          </tr>
        </thead>
        <tbody>
          {fields.map((field) => {
            return (
              <tr key={field.id}>
                <Td>
                  <p className="font-medium text-ink-800">{field.label}</p>
                  <p className="text-xs text-stone-500">{field.key}</p>
                </Td>
                <Td>{humanizeEnum(field.type)}</Td>
                <Td>
                  <Badge tone={field.required ? "default" : "muted"}>
                    {field.required ? "Required" : "Optional"}
                  </Badge>
                </Td>
                {canManage ? (
                  <Td>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => openEdit(field)}
                    >
                      Edit
                    </Button>
                  </Td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </Table>
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
            <select
              id="type"
              name="type"
              defaultValue={editing?.type ?? "text"}
              className={selectClassName}
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
            </select>
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
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
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
                      setError(e instanceof Error ? e.message : "Could not delete field");
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
