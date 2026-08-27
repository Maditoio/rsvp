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
    <div className="min-h-screen bg-slate-50">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <BrandLogo
          href="/"
          size={32}
          wordmarkClassName="text-2xl font-bold tracking-[-0.02em] text-slate-900"
        />
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="size-4" />
          Back to home
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-20 pt-6">
        <p className="text-[0.71875rem] font-semibold uppercase tracking-[0.04em] text-indigo-600">
          {eyebrow}
        </p>
        <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-[-0.02em] text-slate-900 md:text-5xl">
          {title}
        </h1>
        <p className="mt-3 text-sm text-slate-500">Last updated: {updated}</p>

        <div className="mt-10 space-y-8 text-[0.975rem] leading-relaxed text-slate-600">
          {children}
        </div>

        <div className="mt-14 flex flex-wrap gap-4 border-t border-slate-200 pt-8 text-sm">
          <Link
            href="/termsofservice"
            className="font-medium text-slate-900 underline-offset-4 hover:underline"
          >
            Terms of Service
          </Link>
          <Link
            href="/privacystatment"
            className="font-medium text-slate-900 underline-offset-4 hover:underline"
          >
            Privacy Statement
          </Link>
          <Link
            href="/contact"
            className="font-medium text-slate-900 underline-offset-4 hover:underline"
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
      <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
        {title}
      </h2>
      {children}
    </section>
  );
}
