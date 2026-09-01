import Link from "next/link";
import {
  Users,
  Send,
  ClipboardCheck,
  Bell,
  ScanLine,
  BarChart3,
  Shield,
  Lock,
  KeyRound,
  FileText,
  ShieldCheck,
  Gauge,
  ArrowRight,
  Mic2,
  Landmark,
  TrendingUp,
  Building2,
  Handshake,
  Vote,
  Map,
  IdCard,
  UserPlus,
} from "lucide-react";
import { StickyNav } from "@/components/landing/sticky-nav";

const journeySteps = [
  { icon: UserPlus, label: "Manage invitees" },
  { icon: Send, label: "Send invitations" },
  { icon: ClipboardCheck, label: "Registration" },
  { icon: Bell, label: "Automated reminders" },
  { icon: IdCard, label: "Badge creation" },
  { icon: ScanLine, label: "Check-in" },
  { icon: BarChart3, label: "Analytics" },
];

const featureHighlights = [
  {
    icon: Users,
    title: "Invitee management",
    description:
      "Import contacts, organise by category, and track each guest from invited through registered.",
  },
  {
    icon: Bell,
    title: "Automated reminders",
    description:
      "Schedule invitation, registration, and event-day reminders so follow-ups happen without spreadsheets.",
  },
  {
    icon: Vote,
    title: "Live polls",
    description:
      "Create session polls, publish them to attendees, and review results as the room responds.",
  },
  {
    icon: Map,
    title: "Floor plan assistant",
    description:
      "Upload venue maps, place locations, print floor QRs, and let Con·cierge help map stands from the plan.",
  },
  {
    icon: IdCard,
    title: "Badge creation",
    description:
      "Design event badges by category and print credentials ready for entrance and desk check-in.",
  },
  {
    icon: ScanLine,
    title: "Secure check-in",
    description:
      "QR check-in with real-time attendance visibility for staff on the day.",
  },
];

const pillar1Bullets = [
  "Personalised invitation links with tracking",
  "CSV contact import and category-based guest lists",
  "Configurable registration forms",
  "Public application with organiser approval",
  "Automated invitation and registration reminders",
];

const pillar2Bullets = [
  "Upload floor plans and place venues, stands, and amenities",
  "Con·cierge AI assists mapping from labeled floor images",
  "Printed floor QR checkpoints for attendee navigation",
  "Live polls for sessions and feedback",
  "Venue insights and movement heatmaps",
];

const pillar3Bullets = [
  "Category-based badge design and printing",
  "Secure QR code check-in",
  "Real-time attendance dashboard",
  "Session agenda with capacity management",
  "Communications centre and exportable reports",
];

const audiences = [
  { icon: Mic2, label: "Summit organisers" },
  { icon: Landmark, label: "Conference directors" },
  { icon: Building2, label: "Government events" },
  { icon: TrendingUp, label: "Investment forums" },
  { icon: Handshake, label: "Industry conventions" },
];

const trustItems = [
  { icon: Shield, title: "Multi-tenant isolation" },
  { icon: Lock, title: "Role-based access control" },
  { icon: KeyRound, title: "Encrypted invitation tokens" },
  { icon: FileText, title: "Audit logging" },
  { icon: ShieldCheck, title: "OWASP-aligned security" },
  { icon: Gauge, title: "Rate limiting & bot protection" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <StickyNav />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-white pt-24">
        <div className="mx-auto max-w-6xl px-6 pb-20 pt-16 md:pb-28 md:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
              Bizcon RSVP · Event Intelligence
            </p>
            <h1 className="mt-6 text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl lg:text-7xl lg:leading-[1.1]">
              Run professional business events that attendees actually remember.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-700">
              Invitees, reminders, live polls, floor plans, badges, and check-in
              — one platform for curated events, without the spreadsheet chaos.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/sign-up"
                className="inline-flex h-12 items-center rounded-full bg-indigo-600 shadow-accent px-8 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
              >
                Start free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex h-12 items-center rounded-full border border-slate-200 bg-white px-8 text-sm font-semibold text-slate-900 transition-colors hover:border-slate-300"
              >
                Book a demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Journey Visual */}
      <section className="bg-slate-50 py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-semibold text-slate-900 md:text-4xl">
            The complete delegate journey
          </h2>
          <div className="relative mt-16 hidden md:block">
            <div className="absolute left-[calc(100%/14)] right-[calc(100%/14)] top-6 h-0.5 bg-gradient-to-r from-slate-200 via-indigo-300 to-slate-200" />
            <div className="grid grid-cols-7 gap-4">
              {journeySteps.map((step) => (
                <div key={step.label} className="flex flex-col items-center text-center">
                  <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm">
                    <step.icon className="h-5 w-5 text-slate-600" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-slate-900">{step.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-12 space-y-0 md:hidden">
            {journeySteps.map((step, i) => (
              <div key={step.label} className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
                    <step.icon className="h-4 w-4 text-slate-600" />
                  </div>
                  {i < journeySteps.length - 1 && (
                    <div className="h-8 w-0.5 bg-slate-200" />
                  )}
                </div>
                <p className="mt-2 text-sm font-medium text-slate-900">{step.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature highlights */}
      <section className="border-y border-slate-200 bg-white py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-semibold text-slate-900 md:text-4xl">
            Built for how summits actually run
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-500">
            Shipped capabilities for organisers — from guest lists to venue day.
          </p>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featureHighlights.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl bg-slate-50 p-6 shadow-sm"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
                  <feature.icon className="h-5 w-5 text-indigo-600" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pillar 1 */}
      <section className="bg-slate-50 py-20 md:py-28">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 md:grid-cols-2 md:gap-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
              Curated Guest Management
            </p>
            <h3 className="mt-3 text-3xl font-semibold leading-snug text-slate-900 md:text-4xl">
              Invite the right people. Follow up automatically.
            </h3>
            <ul className="mt-6 space-y-3">
              {pillar1Bullets.map((b) => (
                <li key={b} className="flex items-start gap-3 text-base text-slate-700">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <FeatureCard />
        </div>
      </section>

      {/* Pillar 2 */}
      <section className="border-y border-slate-200 bg-white py-20 md:py-28">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 md:grid-cols-2 md:gap-16">
          <div className="order-2 md:order-1">
            <FeatureCardVenue />
          </div>
          <div className="order-1 md:order-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
              Venue &amp; Engagement
            </p>
            <h3 className="mt-3 text-3xl font-semibold leading-snug text-slate-900 md:text-4xl">
              Floor plans and live polls that keep the day moving.
            </h3>
            <ul className="mt-6 space-y-3">
              {pillar2Bullets.map((b) => (
                <li key={b} className="flex items-start gap-3 text-base text-slate-700">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Pillar 3 */}
      <section className="bg-slate-50 py-20 md:py-28">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 md:grid-cols-2 md:gap-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
              Event-Day Operations
            </p>
            <h3 className="mt-3 text-3xl font-semibold leading-snug text-slate-900 md:text-4xl">
              Badges, check-in, and ops — zero gaps.
            </h3>
            <ul className="mt-6 space-y-3">
              {pillar3Bullets.map((b) => (
                <li key={b} className="flex items-start gap-3 text-base text-slate-700">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <FeatureCardOps />
        </div>
      </section>

      {/* Designed for */}
      <section className="border-y border-slate-200 bg-white py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-semibold text-slate-900 md:text-4xl">
            Designed for
          </h2>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-8 md:gap-12">
            {audiences.map((a) => (
              <div key={a.label} className="flex items-center gap-2.5">
                <a.icon className="h-5 w-5 text-slate-600" />
                <span className="text-sm font-medium text-slate-900">{a.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security & Trust */}
      <section className="bg-slate-50 py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-semibold text-slate-900 md:text-4xl">
            Enterprise-grade security
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-base text-slate-500">
            Built from day one with multi-tenant isolation and defence-in-depth.
          </p>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {trustItems.map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-4 rounded-xl bg-white p-6 shadow-sm"
              >
                <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-slate-600" />
                <p className="text-base font-medium text-slate-900">{item.title}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Early Access CTA */}
      <section className="border-t border-slate-200 bg-white py-20 md:py-28">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
            Early access
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-slate-900 md:text-4xl">
            Join organisers running professional events on Bizcon RSVP.
          </h2>
          <div className="mt-10">
            <Link
              href="/sign-up"
              className="inline-flex h-12 items-center rounded-full bg-indigo-600 shadow-accent px-8 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
            >
              Start free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
          <p className="mt-5 text-sm text-slate-500">
            No credit card required · Set up in minutes
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-16">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="inline-flex items-center gap-2.5">
              <img
                src="/brand/logo-192.png"
                alt=""
                width={28}
                height={28}
                className="rounded-md"
              />
              <p className="text-lg font-semibold text-slate-900">Bizcon RSVP</p>
            </div>
            <p className="mt-3 text-sm text-slate-500">
              Event Intelligence for professional summits.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Product</p>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-500">
              <li>Invitee management</li>
              <li>Automated reminders</li>
              <li>Live polls</li>
              <li>Floor plans</li>
              <li>Badge creation</li>
              <li>Check-in</li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Company</p>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-500">
              <li>
                <Link href="/contact" className="hover:text-slate-900">
                  Contact
                </Link>
              </li>
              <li>
                <a href="mailto:hello@bizconrsvp.com" className="hover:text-slate-900">
                  hello@bizconrsvp.com
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Legal</p>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-500">
              <li>
                <Link href="/privacystatment" className="hover:text-slate-900">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/termsofservice" className="hover:text-slate-900">
                  Terms
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mx-auto mt-14 max-w-6xl border-t border-slate-200 px-6 pt-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex flex-col items-center gap-1 sm:items-start">
              <p className="text-sm text-slate-500">© 2026 Bizcon RSVP</p>
              <p className="text-xs text-slate-400">Distributed by DetourSA</p>
            </div>
          <div className="flex flex-col items-center gap-1 sm:items-end">
            <p className="text-sm text-slate-500">Event Intelligence for professional summits.</p>
          </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard() {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm md:p-8">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Guest List</p>
        <span className="font-mono text-xs text-slate-500">247 invited</span>
      </div>
      <div className="mt-5 space-y-3">
        {[
          { line: "Sarah Mitchell — Mining · Invited", status: "pending" as const },
          { line: "James Okafor — Energy · Registered", status: "neutral" as const },
          { line: "Amara Diop — Finance · Confirmed", status: "success" as const },
        ].map(({ line, status }) => (
          <div
            key={line}
            className="flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-3"
          >
            <div className="h-8 w-8 rounded-full bg-slate-200" />
            <span className="flex-1 text-sm text-slate-700">{line.split(" · ")[0]}</span>
            <StatusTag label={line.split(" · ")[1] ?? ""} variant={status} />
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-full border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-xs font-medium text-slate-500">Next automation</p>
        <p className="mt-0.5 text-sm text-slate-900">
          Invitation reminder · day 5
        </p>
      </div>
    </div>
  );
}

function FeatureCardVenue() {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm md:p-8">
      <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
        Venue &amp; Polls
      </p>
      <div className="mt-5 space-y-3">
        {[
          { label: "Floor plan", detail: "Hall A · Con·cierge mapped" },
          { label: "Live poll", detail: "Session feedback · open" },
          { label: "Floor QR", detail: "Stand 42 · navigate" },
        ].map((row) => (
          <div
            key={row.label}
            className="rounded-full border border-slate-200 bg-slate-50 px-4 py-3"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-slate-900">{row.label}</span>
              <span className="text-xs text-slate-500">{row.detail}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeatureCardOps() {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm md:p-8">
      <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Event Day</p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        {[
          { label: "Badges printed", value: "Ready", highlight: true },
          { label: "Check-in", value: "Live", highlight: false },
          { label: "Sessions", value: "Agenda", highlight: false },
          { label: "Reports", value: "Export", highlight: false },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-center"
          >
            <p className={`text-lg font-semibold ${s.highlight ? "text-success" : "text-slate-900"}`}>
              {s.value}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusTag({
  label,
  variant,
}: {
  label: string;
  variant: "success" | "pending" | "neutral";
}) {
  const styles = {
    success: "bg-success-bg text-success",
    pending: "bg-warning-bg text-warning",
    neutral: "bg-slate-100 text-slate-600",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[variant]}`}
    >
      {label}
    </span>
  );
}
