import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { hasPermission } from "@/lib/authz/permissions";
import { StaffManagement } from "../staff-management";

export default async function EventStaffPage({
  params,
}: PageProps<"/app/[orgSlug]/events/[eventId]/staff">) {
  const { orgSlug, eventId } = await params;
  const ctx = await safe(() => requireEvent(orgSlug, eventId, "event.update"));
  const canManage = hasPermission(ctx.grants, "event.update");

  const [staff, orgMemberships] = await Promise.all([
    prisma.eventUser.findMany({
      where: {
        organisationId: ctx.organisation.id,
        eventId,
      },
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
    prisma.organisationUser.findMany({
      where: { organisationId: ctx.organisation.id },
      select: {
        userId: true,
        role: true,
      },
    }),
  ]);

  const orgRoles = new Map(
    orgMemberships.map((membership) => [membership.userId, membership.role]),
  );

  return (
    <div>
      <StaffManagement
        orgSlug={orgSlug}
        eventId={eventId}
        canManage={canManage}
        staff={staff.map((assignment) => ({
          userId: assignment.user.id,
          email: assignment.user.email,
          firstName: assignment.user.firstName,
          lastName: assignment.user.lastName,
          role: assignment.role,
          orgRole: orgRoles.get(assignment.user.id) ?? null,
          assignedAt: assignment.createdAt.toLocaleDateString("en-GB"),
          isCurrentUser: assignment.user.id === ctx.user.id,
        }))}
      />
    </div>
  );
}
