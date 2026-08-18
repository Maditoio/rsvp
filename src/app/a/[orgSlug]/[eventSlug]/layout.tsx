import Link from "next/link";

export const dynamic = "force-dynamic";

export default function PublicApplyLayout({
  children,
}: LayoutProps<"/a/[orgSlug]/[eventSlug]">) {
  return (
    <div className="min-h-screen bg-stone-50">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
        <Link href="/" className="font-display text-2xl text-ink-800">
          Bizcon RSVP
        </Link>
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-bronze-700">
          Application
        </span>
      </header>
      <main className="mx-auto max-w-3xl px-6 pb-16">{children}</main>
    </div>
  );
}
