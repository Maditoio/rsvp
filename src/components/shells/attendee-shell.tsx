import { UserButton } from "@clerk/nextjs";
import {
  AttendeeEventNavFromPath,
  AttendeePortalNav,
} from "@/components/attendee-event-nav";
import { BrandLogo } from "@/components/brand-logo";
import { hasClerk } from "@/lib/utils";

export function AttendeeShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-stone-0">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-bronze-600">
              Attendee portal
            </p>
            <div className="mt-1">
              <BrandLogo href="/me" size={32} wordmarkClassName="text-2xl" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <AttendeePortalNav />
            {hasClerk() ? (
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "size-9",
                  },
                }}
              />
            ) : null}
          </div>
        </div>
        <AttendeeEventNavFromPath />
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8 md:py-10">{children}</main>
    </div>
  );
}
