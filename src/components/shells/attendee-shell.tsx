import { UserButton } from "@clerk/nextjs";
import {
  AttendeeEventNavFromPath,
} from "@/components/attendee-event-nav";
import { AttendeeAttentionProvider } from "@/components/attendee-attention-context";
import { AttendeeNotifications } from "@/components/attendee-notifications";
import { BrandLogo } from "@/components/brand-logo";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import type { UserWorkspace } from "@/modules/workspaces/types";
import { hasClerk } from "@/lib/utils";

export function AttendeeShell({
  children,
  workspaces = [],
}: {
  children: React.ReactNode;
  workspaces?: UserWorkspace[];
}) {
  return (
    <AttendeeAttentionProvider>
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow-[0_1px_0_rgba(15,23,42,0.04),0_4px_12px_rgba(15,23,42,0.03)]">
        <div className="mx-auto flex h-[60px] max-w-6xl items-center justify-between gap-4 px-6">
          <div className="min-w-0">
            <BrandLogo href="/me" size={32} wordmarkClassName="text-2xl font-bold tracking-[-0.02em] text-slate-900" />
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <WorkspaceSwitcher workspaces={workspaces} compact />
            <AttendeeNotifications />
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
    </AttendeeAttentionProvider>
  );
}
