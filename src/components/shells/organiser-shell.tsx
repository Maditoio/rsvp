import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
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
    <div className="min-h-screen bg-stone-50">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-stone-200 bg-stone-0 p-6 md:flex md:flex-col">
          <div>
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-bronze-600">
              Organisation workspace
            </p>
            <Link
              href={`/app/${orgSlug}`}
              className="mt-2 block font-display text-[1.625rem] text-ink-800"
            >
              Delegate
            </Link>
            <p className="mt-1 text-sm text-stone-500">{orgName}</p>
          </div>
          <nav className="mt-10 flex flex-1 flex-col gap-1">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-sm border-l-[3px] border-transparent px-3 py-2 text-sm text-stone-700 transition-colors hover:bg-stone-100 hover:text-ink-700",
                )}
              >
                {item.label}
              </Link>
            ))}
            <p className="mt-6 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
              Coming later
            </p>
            {["Integrations"].map((label) => (
              <span
                key={label}
                className="rounded-sm px-3 py-2 text-sm text-stone-400"
              >
                {label}
              </span>
            ))}
          </nav>
          <Link href="/me" className="text-sm text-bronze-700 hover:text-bronze-800">
            Attendee portal
          </Link>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-stone-200 bg-stone-0 px-6 py-4">
            <div className="md:hidden">
              <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-bronze-600">
                Organisation workspace
              </p>
              <p className="mt-1 text-sm text-ink-700">{orgName}</p>
            </div>
            <div className="ml-auto">
              {hasClerk() ? (
                <UserButton />
              ) : (
                <span className="text-sm text-stone-700">Sign in not configured</span>
              )}
            </div>
          </header>
          <main className="flex-1 p-6 md:p-10">{children}</main>
        </div>
      </div>
    </div>
  );
}
