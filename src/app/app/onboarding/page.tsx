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
    <div className="min-h-screen bg-slate-50">
      <div className="absolute inset-0 bg-slate-900/45" />
      <div className="relative flex min-h-screen items-center px-6 py-10">
        <div className="max-w-xl">
          <p className="text-[0.71875rem] font-semibold uppercase tracking-[0.04em] text-indigo-600">
            New organisation
          </p>
          <h1 className="mt-2 font-display text-4xl text-slate-900">
            Create your workspace
          </h1>
          <p className="mt-3 text-sm text-slate-700">
            Set up the organisation that will own your events, teams, invitations,
            registration, and check-in operations.
          </p>
        </div>
      </div>
      <div className="absolute inset-y-0 right-0 flex w-full max-w-full flex-col bg-white shadow-lg sm:max-w-[480px] sm:rounded-l-lg">
        <div className="border-b border-slate-200 px-6 py-6">
          <h2 className="text-[1.125rem] font-semibold text-slate-700">
            Organisation details
          </h2>
          <p className="mt-1 text-sm text-slate-700">
            You can run multiple summits from one organisation account.
          </p>
        </div>
        <form
          className="flex-1 space-y-4 overflow-y-auto px-6 py-6"
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
          <div>
            <Label htmlFor="name">Organisation name</Label>
            <Input id="name" name="name" required placeholder="Africa Summit Group" />
          </div>
          {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
          <div className="flex justify-end">
            <Button disabled={pending}>{pending ? "Creating…" : "Create organisation"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
