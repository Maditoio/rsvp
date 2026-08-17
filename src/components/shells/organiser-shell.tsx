import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { hasPermission, type Permission } from "@/lib/authz/permissions";
import { hasClerk } from "@/lib/utils";

export function OrganiserShell({
  orgName,
  orgSlug,
  grants,
  orgRole,
  children,
}: {
  orgName: string;
  orgSlug: string;
  grants?: Permission[];
  orgRole?: "OWNER" | "ADMIN" | null;
  children: React.ReactNode;
}) {
  const items = [
    { href: `/app/${orgSlug}`, label: "Dashboard", show: true },
    {
      href: `/app/${orgSlug}/events`,
      label: "Events",
      show: !grants || hasPermission(grants, "event.read"),
    },
    {
      href: `/app/${orgSlug}/settings`,
      label: "Settings",
      show: orgRole != null,
    },
    {
      href: `/app/${orgSlug}/audit`,
      label: "Audit logs",
      show: !grants || hasPermission(grants, "audit.read"),
    },
  ].filter((item) => item.show);

  return (
    <div className="min-h-screen bg-secondary-300">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 bg-primary-600 p-6 text-white md:flex md:flex-col">
          <Link href={`/app/${orgSlug}`} className="font-serif text-2xl">
            Delegate
          </Link>
          <p className="mt-1 text-sm text-primary-200">{orgName}</p>
          <nav className="mt-10 flex flex-1 flex-col gap-1">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl px-3 py-2 text-sm text-primary-100 hover:bg-primary-500"
              >
                {item.label}
              </Link>
            ))}
            <p className="mt-6 px-3 text-[11px] uppercase tracking-widest text-primary-300">
              Coming later
            </p>
            {["Integrations"].map((label) => (
              <span
                key={label}
                className="rounded-xl px-3 py-2 text-sm text-primary-300"
              >
                {label}
              </span>
            ))}
          </nav>
          <Link href="/me" className="text-sm text-accent-200 hover:text-white">
            Attendee portal
          </Link>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-secondary-400/60 px-6 py-4">
            <p className="text-sm text-slate-700 md:hidden">{orgName}</p>
            <div className="ml-auto">
              {hasClerk() ? (
                <UserButton />
              ) : (
                <span className="text-sm text-slate-600">Sign in not configured</span>
              )}
            </div>
          </header>
          <main className="flex-1 p-6 md:p-10">{children}</main>
        </div>
      </div>
    </div>
  );
}
