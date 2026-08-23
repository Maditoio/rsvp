import { AppFooter } from "@/components/app-footer";
import { BrandLogo } from "@/components/brand-logo";

export const dynamic = "force-dynamic";

export default function InvitationLayout({
  children,
}: LayoutProps<"/i/[token]">) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
        <BrandLogo href="/" size={32} wordmarkClassName="text-2xl" />
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700">
          Invitation
        </span>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 pb-16">{children}</main>
      <AppFooter />
    </div>
  );
}
