import { Suspense } from "react";
import { requireEvent } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { hasPermission } from "@/lib/authz/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { listEventSponsorsGrouped } from "@/modules/sponsors/service";
import { SponsorBulkUpload } from "./sponsor-bulk-upload";
import { SponsorList } from "./sponsor-list";

export default async function EventSponsorsPage({
  params,
}: PageProps<"/app/[orgSlug]/events/[eventId]/sponsors">) {
  const { orgSlug, eventId } = await params;
  const ctx = await safe(() => requireEvent(orgSlug, eventId, "event.read"));
  const canManage = hasPermission(ctx.grants, "event.update");
  const groups = await listEventSponsorsGrouped(ctx.organisation.id, eventId);
  const total = groups.reduce((sum, group) => sum + group.sponsors.length, 0);

  return (
    <div>
      <PageHeader
        title="Sponsors"
        description="Manage sponsor tiers, logos, and website placement. Selected sponsors can also appear on printed badges."
        className="mb-6"
      />
      {canManage ? (
        <div className="mb-6">
          <SponsorBulkUpload
            orgSlug={orgSlug}
            eventId={eventId}
            existingCount={total}
          />
        </div>
      ) : null}
      <Suspense fallback={<div className="h-40 rounded-xl bg-white shadow-sm" />}>
        <SponsorList
          orgSlug={orgSlug}
          eventId={eventId}
          canManage={canManage}
          groups={groups}
        />
      </Suspense>
    </div>
  );
}
