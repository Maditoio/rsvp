import { Card } from "@/components/ui/card";
import { listPlatformOrganisations } from "@/modules/platform/actions";
import { safe } from "@/lib/authz/safe";

export const dynamic = "force-dynamic";

export default async function PlatformPage() {
  const organisations = await safe(() => listPlatformOrganisations());

  return (
    <div>
      <h1 className="font-serif text-4xl text-slate-900">Organisations</h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        Platform operators can see tenant names and event counts. Customer
        attendee records are not available from this view. This access is
        written to the audit log.
      </p>
      <div className="mt-8 space-y-3">
        {organisations.length === 0 ? (
          <Card>No organisations yet.</Card>
        ) : (
          organisations.map((org) => (
            <Card key={org.id}>
              <p className="text-lg font-medium text-slate-900">{org.name}</p>
              <p className="mt-1 text-sm text-slate-500">
                {org.slug} · {org._count.events} events · {org._count.users}{" "}
                members · since {org.createdAt.toLocaleDateString("en-GB")}
              </p>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
