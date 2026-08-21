import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { hasPermission } from "@/lib/authz/permissions";
import { requireOrg } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { hubspotConfigured } from "@/modules/hubspot";
import { HubSpotPanel } from "@/modules/hubspot/hubspot-panel";
import { salesforceConfigured } from "@/modules/salesforce";
import { SalesforcePanel } from "@/modules/salesforce/salesforce-panel";
import { MemberManagement } from "./member-management";
import { OrgRename } from "./org-rename";

export default async function OrgSettingsPage({
  params,
  searchParams,
}: PageProps<"/app/[orgSlug]/settings">) {
  const { orgSlug } = await params;
  const query = await searchParams;
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
        select: {
          name: true,
          slug: true,
        },
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
    <div className="flex-1 space-y-6 p-6 md:p-10">
      <div className="max-w-3xl">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-bronze-600">
          Organisation governance
        </p>
        <h1 className="mt-1 font-display text-3xl text-ink-800">
          Organisation settings
        </h1>
        <p className="mt-1 text-sm text-stone-700">
          Membership changes are authorized against your current session and
          organisation scope on the server.
        </p>
      </div>

      <Card className="max-w-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-bronze-600">
              Organisation identity
            </p>
            <p className="mt-1 font-display text-2xl text-ink-800">
              {organisation.name}
            </p>
          </div>
          <OrgRename
            orgSlug={orgSlug}
            name={organisation.name}
            canManage={canManage}
          />
        </div>
        <p className="mt-4 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-stone-500">
          Slug
        </p>
        <p className="mt-1 text-sm text-stone-700">{organisation.slug}</p>
        <p className="mt-4 text-sm text-stone-700">
          Tenant identity is derived from the signed-in user session, never from
          a client-supplied organisation id.
        </p>
      </Card>

      <Card className="max-w-xl space-y-8">
        <div>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-bronze-600">
            Integrations
          </p>
          <p className="mt-1 text-sm text-stone-700">
            CRM connections are organisation-owned. Manage them from the{" "}
            <Link
              href={`/app/${orgSlug}/integrations`}
              className="font-medium text-ink-800 underline decoration-stone-300 underline-offset-2 hover:decoration-ink-700"
            >
              Integrations
            </Link>{" "}
            page.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-ink-800">HubSpot</h2>
          <div className="mt-3">
            <HubSpotPanel
              orgSlug={orgSlug}
              connected={Boolean(hubSpotConnection)}
              portalId={hubSpotConnection?.portalId ?? null}
              configured={hubspotConfigured()}
              canManage={canManage}
              oauthStatus={hubspotStatus}
            />
          </div>
        </div>

        <div>
          <h2 className="font-display text-xl text-ink-800">Salesforce</h2>
          <div className="mt-3">
            <SalesforcePanel
              orgSlug={orgSlug}
              connected={Boolean(salesforceConnection)}
              salesforceOrgId={salesforceConnection?.salesforceOrgId ?? null}
              configured={salesforceConfigured()}
              canManage={canManage}
              oauthStatus={salesforceStatus}
            />
          </div>
        </div>
      </Card>

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
    </div>
  );
}
