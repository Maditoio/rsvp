import Link from "next/link";
import { CheckCircle } from "lucide-react";

export const metadata = {
  title: "Demo Requested — Bizcon RSVP",
};

export default function ThanksPage() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-6"
      style={{ background: "#FAF7F2" }}
    >
      <CheckCircle className="size-12" style={{ color: "#B8864E" }} />
      <h1
        className="mt-6 font-display text-3xl font-semibold"
        style={{ color: "#1B1815" }}
      >
        Demo request received
      </h1>
      <p
        className="mt-3 max-w-md text-center text-base"
        style={{ color: "#5A524A" }}
      >
        Thank you for your interest in Bizcon RSVP. We&apos;ll be in touch
        within one business day to schedule your personalised walkthrough.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex h-11 items-center rounded-sm px-6 text-sm font-semibold text-white"
        style={{ background: "#B8864E" }}
      >
        Back to home
      </Link>
    </div>
  );
}
