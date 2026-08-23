import { Suspense } from "react";
import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { hasPermission } from "@/lib/authz/permissions";
import { CategoryForm } from "./category-form";
import { CategoryList } from "./category-list";
import { PageHeader } from "@/components/ui/page-header";

export default async function CategoriesPage({
  params,
}: PageProps<"/app/[orgSlug]/events/[eventId]/categories">) {
  const { orgSlug, eventId } = await params;
  const ctx = await safe(() =>
    requireEvent(orgSlug, eventId, "invitations.read"),
  );
  const categories = await prisma.invitationCategory.findMany({
    where: { eventId, organisationId: ctx.organisation.id },
    include: {
      _count: { select: { invitations: true, attendees: true } },
    },
    orderBy: { name: "asc" },
  });
  const canManage = hasPermission(ctx.grants, "event.update");

  return (
    <div>
      <PageHeader
        title="Invitation categories"
        description="Categories are configured per event. They are not a hard-coded list of VIP / speaker / delegate labels."
        className="mb-6"
        actions={
          canManage ? (
            <CategoryForm orgSlug={orgSlug} eventId={eventId} />
          ) : undefined
        }
      />
      <div className="mt-6">
        <Suspense fallback={<div className="h-40 rounded-xl bg-white shadow-sm" />}>
          <CategoryList
            orgSlug={orgSlug}
            eventId={eventId}
            canManage={canManage}
            categories={categories.map((category) => ({
              id: category.id,
              name: category.name,
              invitationCount: category._count.invitations,
              attendeeCount: category._count.attendees,
            }))}
          />
        </Suspense>
      </div>
    </div>
  );
}
