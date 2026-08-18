import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { hasClerk } from "@/lib/utils";

export function AttendeeShell({ children }: { children: React.ReactNode }) {
  const items = [
    { href: "/me", label: "My events" },
    { href: "/me/profile", label: "My profile" },
    { href: "/me/account", label: "Account" },
  ];

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-stone-0">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-bronze-600">
              Attendee portal
            </p>
            <Link href="/me" className="mt-2 block font-display text-2xl text-ink-800">
              Bizcon RSVP
            </Link>
          </div>
          <nav className="hidden gap-4 text-sm sm:flex">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-sm border-l-[3px] border-transparent px-3 py-2 text-stone-700 hover:bg-stone-100 hover:text-ink-700"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          {hasClerk() ? <UserButton /> : null}
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
