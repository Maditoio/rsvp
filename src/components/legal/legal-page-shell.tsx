import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

export function LegalPageShell({
  eyebrow,
  title,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen" style={{ background: "#FAF7F2" }}>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <BrandLogo
          href="/"
          wordmark="Bizcon"
          size={32}
          wordmarkClassName="text-2xl font-bold"
        />
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm font-medium"
          style={{ color: "#7A7067" }}
        >
          <ArrowLeft className="size-4" />
          Back to home
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-20 pt-6">
        <p
          className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em]"
          style={{ color: "#B8864E" }}
        >
          {eyebrow}
        </p>
        <h1
          className="mt-3 font-display text-4xl font-semibold leading-tight md:text-5xl"
          style={{ color: "#1B1815" }}
        >
          {title}
        </h1>
        <p className="mt-3 text-sm" style={{ color: "#7A7067" }}>
          Last updated: {updated}
        </p>

        <div
          className="mt-10 space-y-8 text-[0.975rem] leading-relaxed"
          style={{ color: "#5A524A" }}
        >
          {children}
        </div>

        <div
          className="mt-14 flex flex-wrap gap-4 border-t pt-8 text-sm"
          style={{ borderColor: "#E8E0D4" }}
        >
          <Link
            href="/termsofservice"
            className="font-medium underline-offset-4 hover:underline"
            style={{ color: "#1B1815" }}
          >
            Terms of Service
          </Link>
          <Link
            href="/privacystatment"
            className="font-medium underline-offset-4 hover:underline"
            style={{ color: "#1B1815" }}
          >
            Privacy Statement
          </Link>
          <Link
            href="/contact"
            className="font-medium underline-offset-4 hover:underline"
            style={{ color: "#1B1815" }}
          >
            Contact
          </Link>
        </div>
      </main>
    </div>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2
        className="font-display text-2xl font-semibold"
        style={{ color: "#1B1815" }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}
