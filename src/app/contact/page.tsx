import Link from "next/link";
import { Mail, MessageSquare, ArrowLeft } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const metadata = {
  title: "Book a Demo — Bizcon RSVP",
  description:
    "See how Bizcon RSVP can power your next professional summit. Get a personalised walkthrough.",
};

export default function ContactPage() {
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

      <main className="mx-auto max-w-2xl px-6 pb-20 pt-10">
        <p className="text-[0.71875rem] font-semibold uppercase tracking-[0.04em] text-indigo-600">
          Book a demo
        </p>
        <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-[-0.02em] text-slate-900 md:text-5xl">
          See Bizcon RSVP in action
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          Get a personalised walkthrough of how Bizcon RSVP manages invitations,
          registrations, AI matchmaking, and event-day operations for
          professional summits.
        </p>

        <form
          className="mt-10 space-y-5 rounded-xl bg-white p-6 shadow-sm sm:p-8"
          action="https://formsubmit.co/hello@bizconrsvp.com"
          method="POST"
        >
          <input type="hidden" name="_subject" value="Demo request from bizconrsvp.com" />
          <input type="hidden" name="_next" value="https://bizconrsvp.com/contact/thanks" />
          <input type="text" name="_honey" className="hidden" />

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="name">Full name</Label>
              <Input id="name" name="name" type="text" required className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="email">Work email</Label>
              <Input id="email" name="email" type="email" required className="mt-1.5" />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="company">Organisation</Label>
              <Input id="company" name="company" type="text" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="attendees">Expected attendees</Label>
              <select
                id="attendees"
                name="attendees"
                className="mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-4 text-[0.84375rem] text-slate-900 outline-none shadow-xs focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/12"
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
            <Label htmlFor="message">Tell us about your event</Label>
            <Textarea id="message" name="message" rows={4} className="mt-1.5" />
          </div>

          <Button type="submit" size="lg">
            Request a demo
          </Button>

          <p className="text-xs text-slate-400">
            We typically respond within one business day.
          </p>
        </form>

        <div className="mt-10 flex flex-col gap-6 rounded-xl bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Mail className="size-5 shrink-0 text-indigo-600" />
            <div>
              <p className="text-sm font-medium text-slate-700">Email us directly</p>
              <a
                href="mailto:hello@bizconrsvp.com"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                hello@bizconrsvp.com
              </a>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <MessageSquare className="size-5 shrink-0 text-indigo-600" />
            <div>
              <p className="text-sm font-medium text-slate-700">Quick question?</p>
              <p className="text-sm text-slate-500">We respond within 24 hours</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
