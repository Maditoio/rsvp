import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireOrg } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { Card } from "@/components/ui/card";

export default async function OrgSettingsPage({
  params,
}: PageProps<"/app/[orgSlug]/settings">) {
  const { orgSlug } = await params;
  const ctx = await safe(() => requireOrg(orgSlug, "org.read"));
  if (!ctx.orgRole && !ctx.user.platformAdmin) notFound();
  const organisation = await prisma.organisation.findFirst({
    where: { id: ctx.organisation.id },
    select: { name: true, slug: true },
  });
  if (!organisation) return null;

  return (
    <div className="max-w-xl">
      <h1 className="font-serif text-3xl text-slate-900">Organisation settings</h1>
      <p className="mt-1 mb-6 text-sm text-slate-600">
        Tenant identity is derived from your session, not from a client-supplied
        organisation id.
      </p>
      <Card>
        <p className="text-xs uppercase tracking-wide text-slate-500">
          Organisation name
        </p>
        <p className="mt-1 font-serif text-2xl text-slate-900">
          {organisation.name}
        </p>
        <p className="mt-4 text-xs uppercase tracking-wide text-slate-500">
          Slug
        </p>
        <p className="mt-1 text-sm text-slate-700">{organisation.slug}</p>
      </Card>
    </div>
  );
}
