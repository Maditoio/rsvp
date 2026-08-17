import Link from "next/link";

export const dynamic = "force-dynamic";

export default function InvitationLayout({
  children,
}: LayoutProps<"/i/[token]">) {
  return (
    <div className="min-h-screen bg-secondary-300">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
        <Link href="/" className="font-serif text-2xl text-primary-800">
          Delegate
        </Link>
        <span className="text-xs uppercase tracking-[0.18em] text-accent-700">
          Invitation
        </span>
      </header>
      <main className="mx-auto max-w-3xl px-6 pb-16">{children}</main>
    </div>
  );
}
