import { safe } from "@/lib/authz/safe";
import { getPlatformSurfaceCatalog } from "@/modules/platform/actions";
import { PlatformSurfaceCatalog } from "../platform-surface-catalog";

export const dynamic = "force-dynamic";

export default async function PlatformSurfacesPage() {
  const groups = await safe(() => getPlatformSurfaceCatalog());

  return (
    <div className="space-y-6">
      <div className="max-w-3xl">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-bronze-600">
          Platform navigation
        </p>
        <h1 className="mt-1 font-display text-4xl text-ink-800">Product surfaces</h1>
        <p className="mt-2 text-stone-700">
          Open any workspace, organiser route, event staff surface, or attendee
          portal path. As a platform admin you inherit organiser access across
          tenants — use this catalog to review UX before Phase 4 event-day roles
          (badge printing, additional staff surfaces) are added.
        </p>
      </div>

      <PlatformSurfaceCatalog groups={groups} />
    </div>
  );
}
