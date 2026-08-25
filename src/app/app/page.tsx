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
      <div className="min-h-screen bg-slate-50 p-10">
        <div className="mx-auto max-w-lg rounded-xl bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
            Connect Postgres
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            Set <code>DATABASE_URL</code> to your Neon pooled connection string,
            then run <code>npx prisma migrate deploy</code>.
          </p>
        </div>
      </div>
    );
  }

  const [memberships, attendeeCount] = await Promise.all([
    prisma.organisationUser.findMany({
      where: { userId: user.id },
      include: { organisation: true },
    }),
    prisma.attendee.count({ where: { userId: user.id } }),
  ]);

  if (memberships.length === 1) {
    redirect(`/app/${memberships[0].organisation.slug}`);
  }
  if (memberships.length === 0) {
    // Registered delegates must not be forced into organiser onboarding.
    if (attendeeCount > 0) {
      redirect("/me");
    }
    redirect("/app/onboarding");
  }

  return (
    <div className="min-h-screen bg-slate-50 p-10">
      <div className="mx-auto max-w-xl">
        <h1 className="text-3xl font-semibold tracking-[-0.02em] text-slate-900">
          Choose organisation
        </h1>
        <div className="mt-6 space-y-3">
          {memberships.map((m) => (
            <Link
              key={m.id}
              href={`/app/${m.organisation.slug}`}
              className="block rounded-xl bg-white p-5 shadow-sm hover:bg-slate-50"
            >
              <p className="font-medium text-slate-900">{m.organisation.name}</p>
              <p className="text-sm text-slate-500">{m.role}</p>
            </Link>
          ))}
        </div>
        {attendeeCount > 0 ? (
          <p className="mt-6 text-sm text-slate-600">
            Looking for your delegate events?{" "}
            <Link href="/me" className="font-medium text-indigo-600 hover:text-indigo-700">
              Open attendee portal
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}
