import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { hasPermission } from "@/lib/authz/permissions";
import { EventSubnav } from "@/components/event-subnav";
import { Card } from "@/components/ui/card";
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
      <EventSubnav
        orgSlug={orgSlug}
        eventId={eventId}
        current="Applications"
        grants={ctx.grants}
      />
      {applications.length === 0 ? (
        <Card>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-bronze-600">
            Public applications
          </p>
          <h1 className="mt-1 font-display text-3xl text-ink-800">Applications</h1>
          <p className="mt-2 text-sm text-stone-700">
            No applications yet. Enable public applications in{" "}
            <Link
              href={`/app/${orgSlug}/events/${eventId}/settings`}
              className="text-ink-700 underline"
            >
              event settings
            </Link>{" "}
            to publish an Apply to attend page.
          </p>
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
