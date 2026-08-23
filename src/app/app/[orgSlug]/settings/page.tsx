import { Suspense } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { hasPermission } from "@/lib/authz/permissions";
import { requireOrg } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { hubspotConfigured } from "@/modules/hubspot";
import { salesforceConfigured } from "@/modules/salesforce";
import { MemberManagement } from "./member-management";
import { OrgRename } from "./org-rename";
import { IntegrationsGrid } from "./integrations-grid";
import { BillingPanel } from "./billing-panel";
import { SettingsTabs } from "./settings-tabs";

type SettingsTabId = "general" | "integrations" | "members" | "billing";

function resolveSettingsTab(value: string | null | undefined): SettingsTabId {
  switch (value) {
    case "integrations":
    case "members":
    case "billing":
    case "general":
      return value;
    default:
      return "general";
  }
}

export default async function OrgSettingsPage({
  params,
  searchParams,
}: PageProps<"/app/[orgSlug]/settings">) {
  const { orgSlug } = await params;
  const query = await searchParams;
  const tab = resolveSettingsTab(
    typeof query.tab === "string" ? query.tab : null,
  );
  const hubspotStatus =
    typeof query.hubspot === "string" ? query.hubspot : null;
  const salesforceStatus =
    typeof query.salesforce === "string" ? query.salesforce : null;

  const ctx = await safe(() => requireOrg(orgSlug, "org.read"));
  if (!ctx.orgRole && !ctx.user.platformAdmin) notFound();

  const [organisation, members, hubSpotConnection, salesforceConnection] =
    await Promise.all([
      prisma.organisation.findFirst({
        where: { id: ctx.organisation.id },
        select: { name: true, slug: true },
      }),
      prisma.organisationUser.findMany({
        where: { organisationId: ctx.organisation.id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      }),
      prisma.hubSpotConnection.findUnique({
        where: { organisationId: ctx.organisation.id },
        select: { id: true, portalId: true },
      }),
      prisma.salesforceConnection.findUnique({
        where: { organisationId: ctx.organisation.id },
        select: { id: true, salesforceOrgId: true },
      }),
    ]);

  if (!organisation) return null;
  const canManage =
    ctx.user.platformAdmin || hasPermission(ctx.grants, "settings.manage");

  return (
    <div className="flex-1 px-10 pt-8 pb-10">
      <header className="mb-6">
        <p className="mb-2 text-[0.71875rem] font-semibold uppercase tracking-[0.04em] text-indigo-600">
          Organisation governance
        </p>
        <h1 className="mb-1 text-[1.875rem] font-semibold text-slate-900">
          Organisation settings
        </h1>
        <p className="mb-6 text-[0.9375rem] text-slate-500">
          Manage identity, CRM connections, membership, and billing for this
          organisation.
        </p>

        <Suspense fallback={<div className="mb-7 h-10 border-b border-slate-200" />}>
          <SettingsTabs orgSlug={orgSlug} active={tab} />
        </Suspense>
      </header>

      {tab === "general" ? (
        <div className="max-w-[640px] rounded-xl bg-white shadow-sm p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[0.71875rem] font-semibold uppercase tracking-[0.04em] text-indigo-600">
                Organisation identity
              </p>
              <p className="mt-1 text-[1.375rem] font-semibold text-slate-900">
                {organisation.name}
              </p>
            </div>
            <OrgRename
              orgSlug={orgSlug}
              name={organisation.name}
              canManage={canManage}
            />
          </div>
          <p className="mt-4 text-[0.8125rem] font-medium tracking-[0.04em] text-slate-500 uppercase">
            Slug
          </p>
          <p className="mt-1 font-mono text-sm text-slate-700">
            {organisation.slug}
          </p>
          <p className="mt-4 text-[0.8125rem] font-medium text-slate-500">
            Tenant identity is derived from the signed-in user session, never
            from a client-supplied organisation id.
          </p>
        </div>
      ) : null}

      {tab === "integrations" ? (
        <IntegrationsGrid
          orgSlug={orgSlug}
          canManage={canManage}
          hubspot={{
            connected: Boolean(hubSpotConnection),
            portalId: hubSpotConnection?.portalId ?? null,
            configured: hubspotConfigured(),
            oauthStatus: hubspotStatus,
          }}
          salesforce={{
            connected: Boolean(salesforceConnection),
            salesforceOrgId: salesforceConnection?.salesforceOrgId ?? null,
            configured: salesforceConfigured(),
            oauthStatus: salesforceStatus,
          }}
        />
      ) : null}

      {tab === "members" ? (
        <Suspense fallback={<div className="h-40 rounded-xl bg-white shadow-sm" />}>
          <MemberManagement
            orgSlug={orgSlug}
            canManage={canManage}
            members={members.map((member) => ({
              userId: member.user.id,
              email: member.user.email,
              firstName: member.user.firstName,
              lastName: member.user.lastName,
              role: member.role,
              joinedAt: member.createdAt.toLocaleDateString("en-GB"),
              isCurrentUser: member.user.id === ctx.user.id,
            }))}
          />
        </Suspense>
      ) : null}

      {tab === "billing" ? <BillingPanel /> : null}
    </div>
  );
}
