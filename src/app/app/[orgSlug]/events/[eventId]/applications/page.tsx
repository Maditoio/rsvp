import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { hasPermission } from "@/lib/authz/permissions";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ApplicationsPanel } from "./applications-panel";

export default async function ApplicationsPage({
  params,
}: PageProps<"/app/[orgSlug]/events/[eventId]/applications">) {
  const { orgSlug, eventId } = await params;
  const ctx = await safe(() => requireEvent(orgSlug, eventId, "invitations.read"));
  const applications = await prisma.eventApplication.findMany({
    where: { eventId, organisationId: ctx.organisation.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      {applications.length === 0 ? (
        <Card>
          <PageHeader
            eyebrow="Public applications"
            title="Applications"
            description={
              <>
                No applications yet. Enable public applications in{" "}
                <Link
                  href={`/app/${orgSlug}/events/${eventId}/settings`}
                  className="text-slate-700 underline"
                >
                  event settings
                </Link>{" "}
                to publish an Apply to attend page.
              </>
            }
          />
        </Card>
      ) : (
        <ApplicationsPanel
          orgSlug={orgSlug}
          eventId={eventId}
          canDecide={hasPermission(ctx.grants, "invitations.write")}
          applications={applications.map((row) => ({
            id: row.id,
            email: row.email,
            firstName: row.firstName,
            lastName: row.lastName,
            company: row.company,
            jobTitle: row.jobTitle,
            country: row.country,
            message: row.message,
            status: row.status,
            createdAt: row.createdAt.toLocaleDateString("en-GB"),
          }))}
        />
      )}
    </div>
  );
}
