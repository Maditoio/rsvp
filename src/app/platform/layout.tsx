export const dynamic = "force-dynamic";

export default function PlatformLayout({
  children,
}: LayoutProps<"/platform">) {
  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-stone-0">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <p className="font-display text-2xl text-ink-800">Bizcon RSVP</p>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-bronze-600">
            Platform
          </p>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
