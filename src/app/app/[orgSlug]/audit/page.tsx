import { Suspense } from "react";
import { format } from "date-fns";
import { prisma } from "@/lib/db/prisma";
import { requireOrg } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { Card } from "@/components/ui/card";
import { displayName } from "@/lib/utils";
import { AuditTable } from "./audit-table";

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
    <div className="flex-1 p-6 md:p-10">
      <h1 className="font-display text-3xl text-slate-900">Audit logs</h1>
      <p className="mt-1 mb-6 text-[0.8125rem] text-slate-500">
        Invite, register, check-in and admin actions for this organisation.
      </p>
      {logs.length === 0 ? (
        <Card>No audit entries yet.</Card>
      ) : (
        <Suspense fallback={<div className="h-40 rounded-xl bg-white shadow-sm" />}>
          <AuditTable
            logs={logs.map((log) => ({
              id: log.id,
              when: format(log.createdAt, "d MMM yyyy HH:mm"),
              actorName: log.user ? displayName(log.user) : null,
              actorEmail: log.user?.email ?? null,
              action: log.action,
              resource: log.resource,
              resourceId: log.resourceId,
              eventName: log.event?.name ?? null,
            }))}
          />
        </Suspense>
      )}
    </div>
  );
}
