import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { UnsubscribeForm } from "./unsubscribe-form";

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const initialEmail =
    typeof params.email === "string" ? params.email.trim().toLowerCase() : "";

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-lg items-center justify-between px-6 py-4">
          <BrandLogo href="/" size={28} wordmarkClassName="text-xl" />
          <Link href="/privacystatment" className="text-sm text-indigo-600">
            Privacy
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-6 py-12">
        <UnsubscribeForm initialEmail={initialEmail} />
      </main>
    </div>
  );
}
