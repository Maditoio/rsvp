import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { hasPermission } from "@/lib/authz/permissions";
import { EventSubnav } from "@/components/event-subnav";
import { Card } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { CategoryForm } from "./category-form";

export default async function CategoriesPage({
  params,
}: PageProps<"/app/[orgSlug]/events/[eventId]/categories">) {
  const { orgSlug, eventId } = await params;
  const ctx = await safe(() =>
    requireEvent(orgSlug, eventId, "invitations.read"),
  );
  const categories = await prisma.invitationCategory.findMany({
    where: { eventId, organisationId: ctx.organisation.id },
    include: { _count: { select: { invitations: true } } },
    orderBy: { name: "asc" },
  });
  const canCreate = hasPermission(ctx.grants, "event.update");

  return (
    <div>
      <EventSubnav
        orgSlug={orgSlug}
        eventId={eventId}
        current="Categories"
        grants={ctx.grants}
      />
      <h1 className="font-serif text-3xl text-slate-900">Invitation categories</h1>
      <p className="mt-1 text-sm text-slate-600">
        Categories are configured per event. They are not a hard-coded list of
        VIP / speaker / delegate labels.
      </p>
      {canCreate ? <CategoryForm orgSlug={orgSlug} eventId={eventId} /> : null}
      <div className="mt-6">
        {categories.length === 0 ? (
          <Card>No categories yet.</Card>
        ) : (
          <Table>
            <thead>
              <tr className="border-b border-slate-100">
                <Th>Name</Th>
                <Th>Invitations</Th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id} className="border-b border-slate-50">
                  <Td className="font-medium">{category.name}</Td>
                  <Td>{category._count.invitations}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </div>
  );
}
