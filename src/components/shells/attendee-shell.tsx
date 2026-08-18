import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import {
  AttendeeEventNavFromPath,
  AttendeePortalNav,
} from "@/components/attendee-event-nav";
import { hasClerk } from "@/lib/utils";

export function AttendeeShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-stone-0">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-bronze-600">
              Attendee portal
            </p>
            <Link href="/me" className="mt-2 block font-display text-2xl text-ink-800">
              Bizcon RSVP
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <AttendeePortalNav />
            {hasClerk() ? <UserButton /> : null}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">
        <AttendeeEventNavFromPath />
        {children}
      </main>
    </div>
  );
}
