"use client";

import { useRef, useState, useTransition } from "react";
import { createCategory } from "@/modules/events/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CategoryForm({
  orgSlug,
  eventId,
}: {
  orgSlug: string;
  eventId: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      ref={formRef}
      className="mt-4 flex max-w-md flex-col gap-3 sm:flex-row sm:items-end"
      action={(formData) => {
        setError(null);
        start(async () => {
          try {
            await createCategory(orgSlug, eventId, formData);
            formRef.current?.reset();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Could not create category");
          }
        });
      }}
    >
      <div className="flex-1">
        <Label htmlFor="category-name">New category</Label>
        <Input id="category-name" name="name" required placeholder="Delegate" />
      </div>
      <Button disabled={pending}>{pending ? "Adding…" : "Add category"}</Button>
      {error ? <p className="text-sm text-error-500 sm:col-span-2">{error}</p> : null}
    </form>
  );
}
