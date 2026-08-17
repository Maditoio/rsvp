export const dynamic = "force-dynamic";

export default function PlatformLayout({
  children,
}: LayoutProps<"/platform">) {
  return (
    <div className="min-h-screen bg-secondary-300">
      <header className="bg-primary-600 text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <p className="font-serif text-2xl">Delegate</p>
          <p className="text-xs uppercase tracking-[0.18em] text-accent-200">
            Platform
          </p>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
