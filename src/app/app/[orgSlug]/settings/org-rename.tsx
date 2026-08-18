"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { renameOrganisation } from "@/modules/organisations/actions";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function OrgRename({
  orgSlug,
  name,
  canManage,
}: {
  orgSlug: string;
  name: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!canManage) return null;

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        Rename
      </Button>
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Rename organisation"
        description="The organisation slug stays the same so existing links continue to work."
      >
        <form
          className="space-y-4"
          action={(formData) => {
            setError(null);
            start(async () => {
              try {
                await renameOrganisation(orgSlug, formData);
                setOpen(false);
                router.refresh();
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "Could not rename organisation",
                );
              }
            });
          }}
        >
          <div>
            <Label htmlFor="org-name">Organisation name</Label>
            <Input id="org-name" name="name" required defaultValue={name} />
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <div className="flex justify-end">
            <Button disabled={pending}>{pending ? "Saving…" : "Save name"}</Button>
          </div>
        </form>
      </Drawer>
    </>
  );
}
