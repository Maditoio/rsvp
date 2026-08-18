"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setPlatformAdmin } from "@/modules/access/actions";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PlatformAdminControls() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);

  const submit = (makeAdmin: boolean, formData: FormData) => {
    formData.set("platformAdmin", String(makeAdmin));
    setError(null);
    start(async () => {
      try {
        await setPlatformAdmin(formData);
        setOpen(false);
        router.refresh();
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Could not update platform admin access",
        );
      }
    });
  };

  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-bronze-600">
          Platform control
        </p>
        <h2 className="mt-1 font-display text-2xl text-ink-800">Platform admin access</h2>
        <p className="mt-1 text-sm text-stone-700">
          Grant or revoke platform access for existing users by email.
        </p>
      </div>
      <Button type="button" onClick={() => setOpen(true)}>
        Manage admin access
      </Button>
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Platform admin access"
        description="Grant or revoke platform access for an existing signed-in user."
      >
        <form className="space-y-4">
          <div>
            <Label htmlFor="platform-admin-email">User email</Label>
            <Input
              id="platform-admin-email"
              name="email"
              type="email"
              placeholder="name@example.com"
              required
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={(event) => {
                const form = event.currentTarget.form;
                if (!form?.reportValidity()) return;
                submit(true, new FormData(form));
              }}
            >
              {pending ? "Saving…" : "Grant admin"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={(event) => {
                const form = event.currentTarget.form;
                if (!form?.reportValidity()) return;
                submit(false, new FormData(form));
              }}
            >
              Revoke admin
            </Button>
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </form>
      </Drawer>
    </div>
  );
}
