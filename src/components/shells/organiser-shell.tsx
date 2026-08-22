import { Suspense } from "react";
import { UserButton } from "@clerk/nextjs";
import { EventNavProvider } from "@/components/shells/event-nav-scope";
import { OrganiserMobileNav } from "@/components/shells/organiser-nav";
import { OrgRail } from "@/components/shells/org-rail";
import type { UserWorkspace } from "@/modules/workspaces/types";
import { hasClerk } from "@/lib/utils";
import type { Permission } from "@/lib/authz/permissions";

export function OrganiserShell({
  orgName,
  orgSlug,
  grants,
  orgRole,
  workspaces = [],
  children,
}: {
  orgName: string;
  orgSlug: string;
  grants?: Permission[];
  orgRole?: "OWNER" | "ADMIN" | null;
  workspaces?: UserWorkspace[];
  children: React.ReactNode;
}) {
  return (
    <EventNavProvider>
      <div className="flex h-screen overflow-hidden bg-stone-50">
        <Suspense
          fallback={
            <aside className="hidden h-full w-[220px] shrink-0 border-r border-stone-200 bg-stone-0 md:block" />
          }
        >
          <OrgRail
            orgName={orgName}
            orgSlug={orgSlug}
            grants={grants}
            orgRole={orgRole}
            workspaces={workspaces}
          />
        </Suspense>
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="border-b border-stone-200 bg-stone-0 px-6 py-4 md:hidden">
            <Suspense fallback={null}>
              <OrganiserMobileNav
                orgName={orgName}
                orgSlug={orgSlug}
                grants={grants}
                orgRole={orgRole}
                workspaces={workspaces}
                trailing={
                  hasClerk() ? (
                    <UserButton />
                  ) : (
                    <span className="text-sm text-stone-700">
                      Sign in not configured
                    </span>
                  )
                }
              />
            </Suspense>
          </header>
          <div className="flex min-h-0 flex-1 overflow-hidden">{children}</div>
        </div>
      </div>
    </EventNavProvider>
  );
}
