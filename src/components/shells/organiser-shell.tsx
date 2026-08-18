import { UserButton } from "@clerk/nextjs";
import { EventNavProvider } from "@/components/shells/event-nav-scope";
import {
  OrganiserMobileNav,
  OrganiserSidebar,
} from "@/components/shells/organiser-nav";
import { hasClerk } from "@/lib/utils";
import type { Permission } from "@/lib/authz/permissions";

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
  return (
    <EventNavProvider>
      <div className="min-h-screen bg-stone-50">
        <div className="flex min-h-screen">
          <OrganiserSidebar
            orgName={orgName}
            orgSlug={orgSlug}
            grants={grants}
            orgRole={orgRole}
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="border-b border-stone-200 bg-stone-0 px-6 py-4">
              <OrganiserMobileNav
                orgName={orgName}
                orgSlug={orgSlug}
                grants={grants}
                orgRole={orgRole}
                trailing={
                  hasClerk() ? (
                    <UserButton />
                  ) : (
                    <span className="text-sm text-stone-700">Sign in not configured</span>
                  )
                }
              />
            </header>
            <main className="flex-1 p-6 md:p-10">{children}</main>
          </div>
        </div>
      </div>
    </EventNavProvider>
  );
}
