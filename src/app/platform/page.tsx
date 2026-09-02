import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { safe } from "@/lib/authz/safe";
import { displayName } from "@/lib/utils";
import { getPlatformOverview } from "@/modules/platform/actions";
import { PlatformAdminControls } from "./platform-admin-controls";
import { PlatformOrgFeatureControls } from "./platform-org-features";

export const dynamic = "force-dynamic";

export default async function PlatformPage() {
  const overview = await safe(() => getPlatformOverview());

  const statCards = [
    ["Organisations", overview.stats.organisationCount],
    ["Events", overview.stats.eventCount],
    ["Users", overview.stats.userCount],
    ["Platform admins", overview.stats.platformAdminCount],
    ["Owner memberships", overview.stats.ownerMemberships],
    ["Admin memberships", overview.stats.adminMemberships],
  ] as const;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Platform oversight"
        title="Platform overview"
        description="Platform operators can inspect tenant growth, existing users, and access distribution without relying on client-supplied tenant identifiers."
        className="max-w-3xl"
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {statCards.map(([label, value]) => (
          <Card key={label}>
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-slate-500">
              {label}
            </p>
            <p className="mt-2 text-3xl font-medium text-slate-900">{value}</p>
          </Card>
        ))}
      </div>

      <Card>
        <PlatformAdminControls />
      </Card>

      <Card>
        <PlatformOrgFeatureControls organisations={overview.organisations} />
      </Card>

      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[0.71875rem] font-semibold uppercase tracking-[0.04em] text-indigo-600">
              Governance
            </p>
            <h2 className="mt-1 font-display text-2xl text-slate-900">
              Organisations & events
            </h2>
            <p className="mt-1 text-sm text-slate-700">
              Search companies, review their events, and suspend access when needed.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/platform/organisations"
              className="inline-flex h-10 items-center justify-center rounded-full bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Organisations
            </Link>
            <Link
              href="/platform/events"
              className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              All events
            </Link>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[0.71875rem] font-semibold uppercase tracking-[0.04em] text-indigo-600">
              Navigation
            </p>
            <h2 className="mt-1 font-display text-2xl text-slate-900">Product surfaces</h2>
            <p className="mt-1 text-sm text-slate-700">
              Browse every workspace, organiser route, event staff entry point, and
              attendee portal URL across tenants.
            </p>
          </div>
          <Link
            href="/platform/surfaces"
            className="inline-flex h-10 items-center justify-center rounded-full bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Open surface catalog
          </Link>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <Card>
          <p className="text-[0.71875rem] font-semibold uppercase tracking-[0.04em] text-indigo-600">
            Identity
          </p>
          <h2 className="mt-1 font-display text-2xl text-slate-900">Recent users</h2>
          <div className="mt-5 space-y-3">
            {overview.recentUsers.length === 0 ? (
              <p className="text-sm text-slate-700">No users yet.</p>
            ) : (
              overview.recentUsers.map((user) => (
                <div
                  key={user.id}
                  className="rounded-md border border-slate-200 px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-slate-900">
                        {displayName(user)}
                        {user.platformAdmin ? " · Platform admin" : ""}
                      </p>
                      <p className="text-sm text-slate-700">{user.email}</p>
                    </div>
                    <p className="whitespace-nowrap text-xs text-slate-500">
                      {user.createdAt.toLocaleDateString("en-GB")}
                    </p>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {user._count.organisationUsers} organisation memberships ·{" "}
                    {user._count.eventUsers} direct event assignments
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <p className="text-[0.71875rem] font-semibold uppercase tracking-[0.04em] text-indigo-600">
            Governance
          </p>
          <h2 className="mt-1 font-display text-2xl text-slate-900">Recent memberships</h2>
          <div className="mt-5 space-y-3">
            {overview.recentMemberships.length === 0 ? (
              <p className="text-sm text-slate-700">No memberships yet.</p>
            ) : (
              overview.recentMemberships.map((membership) => (
                <div
                  key={membership.id}
                  className="rounded-md border border-slate-200 px-4 py-3"
                >
                  <p className="font-medium text-slate-900">
                    {displayName(membership.user)}
                  </p>
                  <p className="text-sm text-slate-700">
                    {membership.user.email} · {membership.role}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {membership.organisation.name} ({membership.organisation.slug}) ·{" "}
                    {membership.createdAt.toLocaleDateString("en-GB")}
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <Card>
        <p className="text-[0.71875rem] font-semibold uppercase tracking-[0.04em] text-indigo-600">
          Tenants
        </p>
        <h2 className="mt-1 font-display text-2xl text-slate-900">Recent organisations</h2>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {overview.recentOrganisations.length === 0 ? (
            <p className="text-sm text-slate-700">No organisations yet.</p>
          ) : (
            overview.recentOrganisations.map((org) => (
              <div key={org.id} className="rounded-md border border-slate-200 px-4 py-3">
                <p className="text-lg font-medium text-slate-900">{org.name}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {org.slug} · {org._count.events} events · {org._count.users} members
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Created {org.createdAt.toLocaleDateString("en-GB")}
                </p>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
