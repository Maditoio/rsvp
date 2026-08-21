import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { hasPermission } from "@/lib/authz/permissions";
import { requireOrg } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { Card } from "@/components/ui/card";
import { hubspotConfigured } from "@/modules/hubspot";
import { HubSpotPanel } from "@/modules/hubspot/hubspot-panel";
import { salesforceConfigured } from "@/modules/salesforce";
import { SalesforcePanel } from "@/modules/salesforce/salesforce-panel";

export default async function IntegrationsPage({
  params,
  searchParams,
}: PageProps<"/app/[orgSlug]/integrations">) {
  const { orgSlug } = await params;
  const query = await searchParams;
  const hubspotStatus =
    typeof query.hubspot === "string" ? query.hubspot : null;
  const salesforceStatus =
    typeof query.salesforce === "string" ? query.salesforce : null;
  const ctx = await safe(() => requireOrg(orgSlug, "org.read"));
  if (!ctx.orgRole && !ctx.user.platformAdmin) notFound();

  const [hubSpotConnection, salesforceConnection] = await Promise.all([
    prisma.hubSpotConnection.findUnique({
      where: { organisationId: ctx.organisation.id },
      select: { id: true, portalId: true },
    }),
    prisma.salesforceConnection.findUnique({
      where: { organisationId: ctx.organisation.id },
      select: { id: true, salesforceOrgId: true },
    }),
  ]);

  const canManage =
    ctx.user.platformAdmin || hasPermission(ctx.grants, "settings.manage");

  return (
    <div className="flex-1 space-y-6 p-6 md:p-10">
      <div className="max-w-3xl">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-bronze-600">
          Organisation
        </p>
        <h1 className="mt-1 font-display text-3xl text-ink-800">Integrations</h1>
        <p className="mt-1 text-sm text-stone-700">
          Connect external systems for this organisation. Connections are
          organisation-owned, not per-user.
        </p>
      </div>

      <div className="grid max-w-4xl gap-6 lg:grid-cols-2">
        <Card>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-bronze-600">
            CRM
          </p>
          <h2 className="mt-1 font-display text-xl text-ink-800">HubSpot</h2>
          <p className="mt-1 text-sm text-stone-700">
            Connect HubSpot to import contacts as event invitees. Bizcon RSVP
            only reads contacts — nothing is written back to HubSpot.
          </p>
          <div className="mt-4">
            <HubSpotPanel
              orgSlug={orgSlug}
              connected={Boolean(hubSpotConnection)}
              portalId={hubSpotConnection?.portalId ?? null}
              configured={hubspotConfigured()}
              canManage={canManage}
              oauthStatus={hubspotStatus}
            />
          </div>
        </Card>

        <Card>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-bronze-600">
            CRM
          </p>
          <h2 className="mt-1 font-display text-xl text-ink-800">Salesforce</h2>
          <p className="mt-1 text-sm text-stone-700">
            Connect Salesforce to import contacts as event invitees. Bizcon RSVP
            only reads contacts — nothing is written back to Salesforce.
          </p>
          <div className="mt-4">
            <SalesforcePanel
              orgSlug={orgSlug}
              connected={Boolean(salesforceConnection)}
              salesforceOrgId={salesforceConnection?.salesforceOrgId ?? null}
              configured={salesforceConfigured()}
              canManage={canManage}
              oauthStatus={salesforceStatus}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
