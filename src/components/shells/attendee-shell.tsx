import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { hasClerk } from "@/lib/utils";

export function AttendeeShell({ children }: { children: React.ReactNode }) {
  const items = [
    { href: "/me", label: "My event" },
    { href: "/me/profile", label: "My profile" },
    { href: "/me/account", label: "Account" },
  ];
  const later = ["Matchmaking", "Meetings", "Agenda", "Privacy"];

  return (
    <div className="min-h-screen bg-secondary-300">
      <header className="bg-primary-600 text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/me" className="font-serif text-2xl">
            Delegate
          </Link>
          <nav className="hidden gap-4 text-sm text-primary-100 sm:flex">
            {items.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-white">
                {item.label}
              </Link>
            ))}
            {later.map((label) => (
              <span key={label} className="text-primary-300">
                {label}
              </span>
            ))}
          </nav>
          {hasClerk() ? <UserButton /> : null}
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
