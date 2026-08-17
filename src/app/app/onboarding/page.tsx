"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createOrganisation } from "@/modules/organisations/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function OnboardingPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary-300 p-6">
      <form
        className="w-full max-w-md rounded-2xl bg-white p-8"
        action={(formData) => {
          setError(null);
          start(async () => {
            try {
              const result = await createOrganisation(formData);
              router.push(`/app/${result.slug}`);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Could not create organisation");
            }
          });
        }}
      >
        <p className="text-xs uppercase tracking-[0.18em] text-accent-700">
          New organisation
        </p>
        <h1 className="mt-2 font-serif text-3xl text-slate-900">
          Create your workspace
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          You can run multiple summits from one organisation account.
        </p>
        <div className="mt-6">
          <Label htmlFor="name">Organisation name</Label>
          <Input id="name" name="name" required placeholder="Africa Summit Group" />
        </div>
        {error ? <p className="mt-3 text-sm text-error-500">{error}</p> : null}
        <Button className="mt-6 w-full" disabled={pending}>
          {pending ? "Creating…" : "Create organisation"}
        </Button>
      </form>
    </div>
  );
}
