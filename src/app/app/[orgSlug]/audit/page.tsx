import { format } from "date-fns";
import { prisma } from "@/lib/db/prisma";
import { requireOrg } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { Card } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { displayName } from "@/lib/utils";

export default async function AuditPage({
  params,
}: PageProps<"/app/[orgSlug]/audit">) {
  const { orgSlug } = await params;
  const ctx = await safe(() => requireOrg(orgSlug, "audit.read"));
  const logs = await prisma.auditLog.findMany({
    where: { organisationId: ctx.organisation.id },
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
      event: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <h1 className="font-serif text-3xl text-slate-900">Audit logs</h1>
      <p className="mt-1 mb-6 text-sm text-slate-600">
        Invite, register, check-in and admin actions for this organisation.
      </p>
      {logs.length === 0 ? (
        <Card>No audit entries yet.</Card>
      ) : (
        <Table>
          <thead>
            <tr className="border-b border-slate-100">
              <Th>When</Th>
              <Th>Actor</Th>
              <Th>Action</Th>
              <Th>Resource</Th>
              <Th>Event</Th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-slate-50">
                <Td className="whitespace-nowrap text-slate-600">
                  {format(log.createdAt, "d MMM yyyy HH:mm")}
                </Td>
                <Td>
                  {log.user ? (
                    <>
                      <p>{displayName(log.user)}</p>
                      <p className="text-xs text-slate-500">{log.user.email}</p>
                    </>
                  ) : (
                    "—"
                  )}
                </Td>
                <Td>{log.action}</Td>
                <Td>
                  {log.resource}
                  {log.resourceId ? (
                    <span className="block text-xs text-slate-400">
                      {log.resourceId}
                    </span>
                  ) : null}
                </Td>
                <Td>{log.event?.name ?? "—"}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
