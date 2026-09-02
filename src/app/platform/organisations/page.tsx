import Link from "next/link";
import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { safe } from "@/lib/authz/safe";
import { listPlatformOrganisations } from "@/modules/platform/governance";
import { PlatformSearchBar } from "../platform-search-bar";
import {
  PlatformStatusTag,
  formatPlatformDate,
} from "../platform-ui";

export const dynamic = "force-dynamic";

export default async function PlatformOrganisationsPage({
  searchParams,
}: PageProps<"/platform/organisations">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const status =
    params.status === "active" || params.status === "suspended"
      ? params.status
      : "all";

  const organisations = await safe(() =>
    listPlatformOrganisations({ q, status, take: 100 }),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organisations"
        description="Search event companies, open their workspace, and manage suspension."
        className="max-w-3xl"
      />

      <Card>
        <Suspense fallback={null}>
          <PlatformSearchBar />
        </Suspense>
      </Card>

      <Card className="overflow-hidden p-0">
        {organisations.length === 0 ? (
          <p className="p-6 text-sm text-slate-600">No organisations match your search.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-[0.04em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Events</th>
                  <th className="px-4 py-3">Members</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {organisations.map((org) => (
                  <tr key={org.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{org.name}</p>
                      <p className="text-slate-500">{org.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {org.eventCount}
                      {org.suspendedEventCount > 0 ? (
                        <span className="text-slate-400">
                          {" "}
                          · {org.suspendedEventCount} suspended
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{org.memberCount}</td>
                    <td className="px-4 py-3">
                      <PlatformStatusTag suspended={Boolean(org.suspendedAt)} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatPlatformDate(org.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/platform/organisations/${org.id}`}
                        className="inline-flex h-9 items-center rounded-full bg-indigo-600 px-3 text-xs font-semibold text-white hover:bg-indigo-700"
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
