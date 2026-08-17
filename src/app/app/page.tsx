import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/authz/require";
import { prisma } from "@/lib/db/prisma";
import { isDatabaseConfigured } from "@/lib/db/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AppIndexPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }

  if (!isDatabaseConfigured()) {
    return (
      <div className="min-h-screen bg-secondary-300 p-10">
        <div className="mx-auto max-w-lg rounded-2xl bg-white p-8">
          <h1 className="font-serif text-2xl">Connect Postgres</h1>
          <p className="mt-3 text-sm text-slate-600">
            Set <code>DATABASE_URL</code> to your Neon pooled connection string,
            then run <code>npx prisma migrate deploy</code>.
          </p>
        </div>
      </div>
    );
  }

  const memberships = await prisma.organisationUser.findMany({
    where: { userId: user.id },
    include: { organisation: true },
  });

  if (memberships.length === 1) {
    redirect(`/app/${memberships[0].organisation.slug}`);
  }
  if (memberships.length === 0) {
    redirect("/app/onboarding");
  }

  return (
    <div className="min-h-screen bg-secondary-300 p-10">
      <div className="mx-auto max-w-xl">
        <h1 className="font-serif text-3xl text-slate-900">Choose organisation</h1>
        <div className="mt-6 space-y-3">
          {memberships.map((m) => (
            <Link
              key={m.id}
              href={`/app/${m.organisation.slug}`}
              className="block rounded-2xl bg-white p-5 hover:bg-slate-50"
            >
              <p className="font-medium text-slate-900">{m.organisation.name}</p>
              <p className="text-sm text-slate-500">{m.role}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
