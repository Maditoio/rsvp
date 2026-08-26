"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setOrganisationVenueAiFloorPlan } from "@/modules/platform/actions";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";

type OrgRow = {
  id: string;
  name: string;
  slug: string;
  venueAiFloorPlanEnabled: boolean;
  _count: { events: number; users: number };
};

export function PlatformOrgFeatureControls({
  organisations,
}: {
  organisations: OrgRow[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const toggle = (org: OrgRow, enabled: boolean) => {
    setPendingId(org.id);
    start(async () => {
      const result = await setOrganisationVenueAiFloorPlan(org.id, enabled);
      setPendingId(null);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        enabled
          ? `Con·cierge floor mapping enabled for ${org.name}.`
          : `Con·cierge floor mapping disabled for ${org.name}.`,
      );
      router.refresh();
    });
  };

  return (
    <div>
      <p className="text-[0.71875rem] font-semibold uppercase tracking-[0.04em] text-indigo-600">
        Features
      </p>
      <h2 className="mt-1 font-display text-2xl text-slate-900">
        Organisation features
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-slate-600">
        Enable optional capabilities per tenant. Manual floor-plan editing stays
        available for every organisation; Con·cierge floor mapping only appears
        when enabled here.
      </p>

      {organisations.length === 0 ? (
        <p className="mt-5 text-sm text-slate-700">No organisations yet.</p>
      ) : (
        <ul className="mt-5 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {organisations.map((org) => {
            const busy = pending && pendingId === org.id;
            const checkboxId = `venue-ai-${org.id}`;
            return (
              <li
                key={org.id}
                className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{org.name}</p>
                  <p className="text-sm text-slate-500">
                    {org.slug} · {org._count.events} events · {org._count.users}{" "}
                    members
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id={checkboxId}
                    checked={org.venueAiFloorPlanEnabled}
                    disabled={busy}
                    onChange={(event) => toggle(org, event.target.checked)}
                    aria-label={`Con·cierge floor mapping for ${org.name}`}
                  />
                  <Label
                    htmlFor={checkboxId}
                    className="cursor-pointer text-sm font-medium text-slate-700"
                  >
                    {busy ? "Saving…" : "Con·cierge floor mapping"}
                  </Label>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
