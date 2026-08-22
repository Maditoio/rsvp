import Link from "next/link";
import { Card } from "@/components/ui/card";
import { safe } from "@/lib/authz/safe";
import { displayName } from "@/lib/utils";
import { getPlatformOverview } from "@/modules/platform/actions";
import { PlatformAdminControls } from "./platform-admin-controls";

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
      <div className="max-w-3xl">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-bronze-600">
          Platform oversight
        </p>
        <h1 className="mt-1 font-display text-4xl text-ink-800">Platform overview</h1>
        <p className="mt-2 text-stone-700">
          Platform operators can inspect tenant growth, existing users, and access
          distribution without relying on client-supplied tenant identifiers.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {statCards.map(([label, value]) => (
          <Card key={label}>
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-stone-500">
              {label}
            </p>
            <p className="mt-2 text-3xl font-medium text-ink-800">{value}</p>
          </Card>
        ))}
      </div>

      <Card>
        <PlatformAdminControls />
      </Card>

      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-bronze-600">
              Navigation
            </p>
            <h2 className="mt-1 font-display text-2xl text-ink-800">Product surfaces</h2>
            <p className="mt-1 text-sm text-stone-700">
              Browse every workspace, organiser route, event staff entry point, and
              attendee portal URL across tenants.
            </p>
          </div>
          <Link
            href="/platform/surfaces"
            className="inline-flex h-10 items-center justify-center rounded-sm bg-ink-700 px-4 text-sm font-semibold text-white hover:bg-ink-800"
          >
            Open surface catalog
          </Link>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <Card>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-bronze-600">
            Identity
          </p>
          <h2 className="mt-1 font-display text-2xl text-ink-800">Recent users</h2>
          <div className="mt-5 space-y-3">
            {overview.recentUsers.length === 0 ? (
              <p className="text-sm text-stone-700">No users yet.</p>
            ) : (
              overview.recentUsers.map((user) => (
                <div
                  key={user.id}
                  className="rounded-md border border-stone-200 px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-ink-800">
                        {displayName(user)}
                        {user.platformAdmin ? " · Platform admin" : ""}
                      </p>
                      <p className="text-sm text-stone-700">{user.email}</p>
                    </div>
                    <p className="whitespace-nowrap text-xs text-stone-500">
                      {user.createdAt.toLocaleDateString("en-GB")}
                    </p>
                  </div>
                  <p className="mt-2 text-xs text-stone-500">
                    {user._count.organisationUsers} organisation memberships ·{" "}
                    {user._count.eventUsers} direct event assignments
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-bronze-600">
            Governance
          </p>
          <h2 className="mt-1 font-display text-2xl text-ink-800">Recent memberships</h2>
          <div className="mt-5 space-y-3">
            {overview.recentMemberships.length === 0 ? (
              <p className="text-sm text-stone-700">No memberships yet.</p>
            ) : (
              overview.recentMemberships.map((membership) => (
                <div
                  key={membership.id}
                  className="rounded-md border border-stone-200 px-4 py-3"
                >
                  <p className="font-medium text-ink-800">
                    {displayName(membership.user)}
                  </p>
                  <p className="text-sm text-stone-700">
                    {membership.user.email} · {membership.role}
                  </p>
                  <p className="mt-1 text-xs text-stone-500">
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
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-bronze-600">
          Tenants
        </p>
        <h2 className="mt-1 font-display text-2xl text-ink-800">Recent organisations</h2>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {overview.organisations.length === 0 ? (
            <p className="text-sm text-stone-700">No organisations yet.</p>
          ) : (
            overview.organisations.map((org) => (
              <div key={org.id} className="rounded-md border border-stone-200 px-4 py-3">
                <p className="text-lg font-medium text-ink-800">{org.name}</p>
                <p className="mt-1 text-sm text-stone-500">
                  {org.slug} · {org._count.events} events · {org._count.users} members
                </p>
                <p className="mt-1 text-xs text-stone-500">
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
