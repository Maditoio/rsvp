import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { safe } from "@/lib/authz/safe";
import { displayName } from "@/lib/utils";
import { getPlatformOrganisationDetail } from "@/modules/platform/governance";
import {
  PlatformStatusTag,
  formatPlatformDate,
  formatPlatformDateTime,
} from "../../platform-ui";
import { PlatformOrganisationControls } from "./platform-organisation-controls";

export const dynamic = "force-dynamic";

export default async function PlatformOrganisationPage({
  params,
}: PageProps<"/platform/organisations/[organisationId]">) {
  const { organisationId } = await params;
  const detail = await safe(() => getPlatformOrganisationDetail(organisationId));
  if (!detail) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link
            href="/platform/organisations"
            className="text-indigo-600 hover:text-indigo-700"
          >
            Organisations
          </Link>
        }
        title={detail.name}
        description="Review events for this company and suspend access when needed."
        className="max-w-3xl"
      />

      <PlatformOrganisationControls
        organisation={{
          id: detail.id,
          name: detail.name,
          slug: detail.slug,
          suspendedAt: detail.suspendedAt,
        }}
        events={detail.events}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <h3 className="font-medium text-slate-900">Company details</h3>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Status</dt>
              <dd>
                <PlatformStatusTag suspended={Boolean(detail.suspendedAt)} />
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Slug</dt>
              <dd className="font-medium text-slate-900">{detail.slug}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Events</dt>
              <dd className="font-medium text-slate-900">{detail.eventCount}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Members</dt>
              <dd className="font-medium text-slate-900">{detail.memberCount}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Created</dt>
              <dd className="font-medium text-slate-900">
                {formatPlatformDate(detail.createdAt)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">AI floor mapping</dt>
              <dd className="font-medium text-slate-900">
                {detail.venueAiFloorPlanEnabled ? "Enabled" : "Off"}
              </dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h3 className="font-medium text-slate-900">Recent audit</h3>
          <div className="mt-4 space-y-3">
            {detail.recentAudit.length === 0 ? (
              <p className="text-sm text-slate-600">No audit entries yet.</p>
            ) : (
              detail.recentAudit.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-md border border-slate-200 px-3 py-2"
                >
                  <p className="text-sm font-medium text-slate-900">
                    {entry.action}
                  </p>
                  <p className="text-xs text-slate-500">
                    {entry.user ? displayName(entry.user) : "System"} ·{" "}
                    {formatPlatformDateTime(entry.createdAt)}
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
