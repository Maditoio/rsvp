"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCategory } from "@/modules/events/actions";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";

export function CategoryForm({
  orgSlug,
  eventId,
}: {
  orgSlug: string;
  eventId: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="mt-4">
        <Button type="button" leadingIcon="plus" onClick={() => setOpen(true)}>
          Add category
        </Button>
      </div>
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Add invitation category"
        description="Create a new per-event invitation category."
        size="sm"
      >
        <form
          ref={formRef}
          className="space-y-4"
          action={(formData) => {
            setError(null);
            start(async () => {
              try {
                await createCategory(orgSlug, eventId, formData);
                formRef.current?.reset();
                setOpen(false);
                toast.success("Category added.");
                router.refresh();
              } catch (e) {
                const message =
                  e instanceof Error ? e.message : "Could not create category";
                setError(message);
                toast.error(message);
              }
            });
          }}
        >
          <div>
            <Label htmlFor="category-name">New category</Label>
            <Input id="category-name" name="name" required placeholder="Delegate" />
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <div className="flex justify-end">
            <Button disabled={pending}>{pending ? "Adding…" : "Add category"}</Button>
          </div>
        </form>
      </Drawer>
    </>
  );
}
