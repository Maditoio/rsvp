import Link from "next/link";
import { Mail, MessageSquare, ArrowLeft } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

export const metadata = {
  title: "Book a Demo — Bizcon RSVP",
  description:
    "See how Bizcon RSVP can power your next professional summit. Get a personalised walkthrough.",
};

export default function ContactPage() {
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

      <main className="mx-auto max-w-2xl px-6 pb-20 pt-10">
        <p
          className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em]"
          style={{ color: "#B8864E" }}
        >
          Book a demo
        </p>
        <h1
          className="mt-3 font-display text-4xl font-semibold leading-tight md:text-5xl"
          style={{ color: "#1B1815" }}
        >
          See Bizcon RSVP in action
        </h1>
        <p className="mt-4 text-lg" style={{ color: "#5A524A" }}>
          Get a personalised walkthrough of how Bizcon RSVP manages invitations,
          registrations, AI matchmaking, and event-day operations for
          professional summits.
        </p>

        <form
          className="mt-10 space-y-5"
          action="https://formsubmit.co/hello@bizconrsvp.com"
          method="POST"
        >
          <input type="hidden" name="_subject" value="Demo request from bizconrsvp.com" />
          <input type="hidden" name="_next" value="https://bizconrsvp.com/contact/thanks" />
          <input type="text" name="_honey" style={{ display: "none" }} />

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="name"
                className="mb-1.5 block text-sm font-medium"
                style={{ color: "#3D3630" }}
              >
                Full name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="h-11 w-full rounded-sm border bg-white px-4 text-sm outline-none focus:ring-2"
                style={{
                  borderColor: "#E8E0D6",
                  color: "#1B1815",
                }}
              />
            </div>
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium"
                style={{ color: "#3D3630" }}
              >
                Work email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="h-11 w-full rounded-sm border bg-white px-4 text-sm outline-none focus:ring-2"
                style={{
                  borderColor: "#E8E0D6",
                  color: "#1B1815",
                }}
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="company"
                className="mb-1.5 block text-sm font-medium"
                style={{ color: "#3D3630" }}
              >
                Organisation
              </label>
              <input
                id="company"
                name="company"
                type="text"
                className="h-11 w-full rounded-sm border bg-white px-4 text-sm outline-none focus:ring-2"
                style={{
                  borderColor: "#E8E0D6",
                  color: "#1B1815",
                }}
              />
            </div>
            <div>
              <label
                htmlFor="attendees"
                className="mb-1.5 block text-sm font-medium"
                style={{ color: "#3D3630" }}
              >
                Expected attendees
              </label>
              <select
                id="attendees"
                name="attendees"
                className="h-11 w-full rounded-sm border bg-white px-4 text-sm outline-none focus:ring-2"
                style={{
                  borderColor: "#E8E0D6",
                  color: "#1B1815",
                }}
              >
                <option value="">Select range</option>
                <option value="< 500">Under 500</option>
                <option value="500–1,000">500 – 1,000</option>
                <option value="1,000–5,000">1,000 – 5,000</option>
                <option value="5,000–10,000">5,000 – 10,000</option>
                <option value="10,000+">10,000+</option>
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="message"
              className="mb-1.5 block text-sm font-medium"
              style={{ color: "#3D3630" }}
            >
              Tell us about your event
            </label>
            <textarea
              id="message"
              name="message"
              rows={4}
              className="w-full rounded-sm border bg-white px-4 py-3 text-sm outline-none focus:ring-2"
              style={{
                borderColor: "#E8E0D6",
                color: "#1B1815",
              }}
            />
          </div>

          <button
            type="submit"
            className="h-12 w-full rounded-sm px-8 text-sm font-semibold text-white transition-colors sm:w-auto"
            style={{ background: "#B8864E" }}
          >
            Request a demo
          </button>

          <p className="text-xs" style={{ color: "#A09588" }}>
            We typically respond within one business day.
          </p>
        </form>

        <div
          className="mt-16 flex flex-col gap-6 rounded-md border p-6 sm:flex-row sm:items-center sm:justify-between"
          style={{
            borderColor: "#E8E0D6",
            background: "#FFFFFF",
          }}
        >
          <div className="flex items-center gap-3">
            <Mail className="size-5 shrink-0" style={{ color: "#B8864E" }} />
            <div>
              <p className="text-sm font-medium" style={{ color: "#3D3630" }}>
                Email us directly
              </p>
              <a
                href="mailto:hello@bizconrsvp.com"
                className="text-sm"
                style={{ color: "#B8864E" }}
              >
                hello@bizconrsvp.com
              </a>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <MessageSquare
              className="size-5 shrink-0"
              style={{ color: "#B8864E" }}
            />
            <div>
              <p className="text-sm font-medium" style={{ color: "#3D3630" }}>
                Quick question?
              </p>
              <p className="text-sm" style={{ color: "#7A7067" }}>
                We respond within 24 hours
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
