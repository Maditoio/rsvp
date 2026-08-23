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
      <div className="flex h-screen overflow-hidden bg-slate-50">
        <Suspense
          fallback={
            <aside className="hidden h-full w-[220px] shrink-0 bg-white shadow-[2px_0_12px_rgba(15,23,42,0.03)] md:block" />
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
          <header className="bg-white px-4 py-3 shadow-[0_1px_0_rgba(15,23,42,0.04),0_4px_12px_rgba(15,23,42,0.03)] md:hidden sm:px-6 sm:py-4">
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
                    <span className="text-sm text-slate-600">
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
