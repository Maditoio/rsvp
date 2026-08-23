"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setPlatformAdmin } from "@/modules/access/actions";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { isValidEmail } from "@/lib/validation";
import { useToast } from "@/components/ui/toast";

export function PlatformAdminControls() {
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);

  const submit = (makeAdmin: boolean, formData: FormData) => {
    formData.set("platformAdmin", String(makeAdmin));
    setError(null);
    const email = String(formData.get("email") ?? "").trim();
    if (!isValidEmail(email)) {
      const message = "Enter a valid email address.";
      setError(message);
      toast.error(message);
      return;
    }
    start(async () => {
      const result = await setPlatformAdmin(formData);
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success(makeAdmin ? "Platform admin granted." : "Platform admin revoked.");
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <PageHeader
        eyebrow="Platform control"
        title="Platform admin access"
        titleAs="h2"
        description="Grant or revoke platform access for existing users by email."
        actions={
          <Button type="button" onClick={() => setOpen(true)}>
            Manage admin access
          </Button>
        }
      />
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
    </>
  );
}
