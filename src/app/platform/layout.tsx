import { BrandLogo } from "@/components/brand-logo";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { loadUserWorkspaces } from "@/modules/workspaces/resolve";
import { safe } from "@/lib/authz/safe";
import { PlatformNav } from "./platform-nav";

export const dynamic = "force-dynamic";

export default async function PlatformLayout({
  children,
}: LayoutProps<"/platform">) {
  const { workspaces } = await safe(() => loadUserWorkspaces());

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-stone-0">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-bronze-600">
              Platform
            </p>
            <div className="mt-2">
              <BrandLogo href="/platform" size={32} wordmarkClassName="text-2xl" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <WorkspaceSwitcher workspaces={workspaces} />
            <PlatformNav />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
