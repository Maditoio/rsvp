import Link from "next/link";
import { CheckCircle } from "lucide-react";

export const metadata = {
  title: "Demo Requested — Bizcon RSVP",
};

export default function ThanksPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6">
      <CheckCircle className="size-12 text-indigo-600" strokeWidth={1.5} />
      <h1 className="mt-6 text-3xl font-semibold tracking-[-0.02em] text-slate-900">
        Demo request received
      </h1>
      <p className="mt-3 max-w-md text-center text-base text-slate-600">
        Thank you for your interest in Bizcon RSVP. We&apos;ll be in touch
        within one business day to schedule your personalised walkthrough.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex h-11 items-center rounded-full bg-indigo-600 px-6 text-sm font-semibold text-white shadow-accent hover:bg-indigo-700"
      >
        Back to home
      </Link>
    </div>
  );
}
