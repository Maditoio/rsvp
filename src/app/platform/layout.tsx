import Link from "next/link";
import { LayoutDashboard } from "lucide-react";

export const dynamic = "force-dynamic";

export default function PlatformLayout({
  children,
}: LayoutProps<"/platform">) {
  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-stone-0">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-bronze-600">
              Platform
            </p>
            <p className="mt-2 font-display text-2xl text-ink-800">Bizcon RSVP</p>
          </div>
          <nav>
            <Link
              href="/platform"
              className="inline-flex items-center gap-2 rounded-sm border-l-[3px] border-l-ink-700 bg-stone-100 px-3 py-2 text-sm font-semibold text-ink-700"
            >
              <LayoutDashboard className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
              Overview
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
