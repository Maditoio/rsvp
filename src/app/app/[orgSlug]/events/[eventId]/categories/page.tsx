import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { hasPermission } from "@/lib/authz/permissions";
import { CategoryForm } from "./category-form";
import { CategoryList } from "./category-list";

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
      <h1 className="font-display text-3xl text-ink-800">Invitation categories</h1>
      <p className="mt-1 text-sm text-stone-700">
        Categories are configured per event. They are not a hard-coded list of
        VIP / speaker / delegate labels.
      </p>
      {canManage ? <CategoryForm orgSlug={orgSlug} eventId={eventId} /> : null}
      <div className="mt-6">
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
      </div>
    </div>
  );
}
