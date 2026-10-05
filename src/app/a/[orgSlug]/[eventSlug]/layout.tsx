import { AppFooter } from "@/components/app-footer";

export const dynamic = "force-dynamic";

export default function PublicApplyLayout({
  children,
}: LayoutProps<"/a/[orgSlug]/[eventSlug]">) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8 pb-16">
        {children}
      </main>
      <AppFooter />
    </div>
  );
}
