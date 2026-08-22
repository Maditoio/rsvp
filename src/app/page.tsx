import Link from "next/link";
import {
  Users,
  Send,
  ClipboardCheck,
  Brain,
  CalendarCheck,
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
} from "lucide-react";
import { StickyNav } from "@/components/landing/sticky-nav";

const journeySteps = [
  { icon: Users, label: "Import contacts" },
  { icon: Send, label: "Send invitations" },
  { icon: ClipboardCheck, label: "Registration" },
  { icon: Brain, label: "AI Matchmaking" },
  { icon: CalendarCheck, label: "Meetings" },
  { icon: ScanLine, label: "Check-in" },
  { icon: BarChart3, label: "Analytics" },
];

const pillar1Bullets = [
  "Personalised invitation links with tracking",
  "Import contacts from CSV, HubSpot, Salesforce, and CRM tools",
  "Configurable registration forms",
  "Public application with organiser approval",
  "Category-based guest management",
];

const pillar2Bullets = [
  "Structured matchmaking questionnaire",
  "AI-generated connection insights",
  "Meeting request flow with anti-spam",
  "Automatic scheduling with room assignment",
  "Google Calendar sync",
];

const pillar3Bullets = [
  "Secure QR code check-in",
  "Real-time attendance dashboard",
  "Session agenda with capacity management",
  "Communications centre",
  "Export reports for any segment",
];

const events = [
  { name: "Africa Mining Summit 2026", delegates: "4,800", city: "Johannesburg" },
  { name: "Africa Energy Summit 2026", delegates: "3,200", city: "Cape Town" },
  { name: "Africa Telecom Summit 2026", delegates: "2,100", city: "Nairobi" },
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
    <div className="min-h-screen bg-stone-50 font-sans">
      <StickyNav />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-stone-200 bg-stone-0 pt-24">
        <div className="mx-auto max-w-6xl px-6 pb-20 pt-16 md:pb-28 md:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bronze-600">
              Event Intelligence Platform
            </p>
            <h1 className="mt-6 font-display text-4xl font-semibold leading-tight text-ink-700 sm:text-5xl lg:text-7xl lg:leading-[1.1]">
              Run professional summits that attendees actually remember.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-stone-700">
              From curated invitations to AI-powered networking — manage
              10,000-person events without the spreadsheet chaos.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/sign-up"
                className="inline-flex h-12 items-center rounded-sm bg-ink-700 px-8 text-sm font-semibold text-white transition-colors hover:bg-ink-800"
              >
                Start free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex h-12 items-center rounded-sm border border-stone-300 px-8 text-sm font-semibold text-ink-700 transition-colors hover:border-ink-400"
              >
                Book a demo
              </Link>
            </div>
            <div className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-stone-500">
              <span>12,000+ delegates managed</span>
              <span className="hidden sm:inline text-stone-300">·</span>
              <span>3 international summits</span>
              <span className="hidden sm:inline text-stone-300">·</span>
              <span>40+ countries</span>
            </div>
          </div>
        </div>
      </section>

      {/* Journey Visual */}
      <section className="bg-stone-50 py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center font-display text-3xl font-semibold text-ink-700 md:text-4xl">
            The complete delegate journey
          </h2>
          <div className="relative mt-16 hidden md:block">
            <div className="absolute left-[calc(100%/14)] right-[calc(100%/14)] top-6 h-0.5 bg-gradient-to-r from-stone-200 via-bronze-300 to-stone-200" />
            <div className="grid grid-cols-7 gap-4">
              {journeySteps.map((step) => (
                <div key={step.label} className="flex flex-col items-center text-center">
                  <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-md border border-stone-200 bg-stone-0">
                    <step.icon className="h-5 w-5 text-ink-600" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-ink-700">{step.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-12 space-y-0 md:hidden">
            {journeySteps.map((step, i) => (
              <div key={step.label} className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md border border-stone-200 bg-stone-0">
                    <step.icon className="h-4 w-4 text-ink-600" />
                  </div>
                  {i < journeySteps.length - 1 && (
                    <div className="h-8 w-0.5 bg-stone-200" />
                  )}
                </div>
                <p className="mt-2 text-sm font-medium text-ink-700">{step.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pillar 1 */}
      <section className="border-y border-stone-200 bg-stone-0 py-20 md:py-28">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 md:grid-cols-2 md:gap-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bronze-600">
              Curated Guest Management
            </p>
            <h3 className="mt-3 font-display text-3xl font-semibold leading-snug text-ink-700 md:text-4xl">
              Invite the right people. Register them seamlessly.
            </h3>
            <ul className="mt-6 space-y-3">
              {pillar1Bullets.map((b) => (
                <li key={b} className="flex items-start gap-3 text-base text-stone-700">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-stone-300" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <FeatureCard />
        </div>
      </section>

      {/* Pillar 2 */}
      <section className="bg-stone-50 py-20 md:py-28">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 md:grid-cols-2 md:gap-16">
          <div className="order-2 md:order-1">
            <FeatureCardNetwork />
          </div>
          <div className="order-1 md:order-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bronze-600">
              AI-Powered Networking
            </p>
            <h3 className="mt-3 font-display text-3xl font-semibold leading-snug text-ink-700 md:text-4xl">
              Connect attendees who should actually meet.
            </h3>
            <ul className="mt-6 space-y-3">
              {pillar2Bullets.map((b) => (
                <li key={b} className="flex items-start gap-3 text-base text-stone-700">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-stone-300" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Pillar 3 */}
      <section className="border-y border-stone-200 bg-stone-0 py-20 md:py-28">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 md:grid-cols-2 md:gap-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bronze-600">
              Event-Day Operations
            </p>
            <h3 className="mt-3 font-display text-3xl font-semibold leading-snug text-ink-700 md:text-4xl">
              From registration to check-in, zero gaps.
            </h3>
            <ul className="mt-6 space-y-3">
              {pillar3Bullets.map((b) => (
                <li key={b} className="flex items-start gap-3 text-base text-stone-700">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-stone-300" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <FeatureCardOps />
        </div>
      </section>

      {/* Built for events like these */}
      <section className="bg-stone-50 py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center font-display text-3xl font-semibold text-ink-700 md:text-4xl">
            Built for events like these
          </h2>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {events.map((e) => (
              <div
                key={e.name}
                className="rounded-md border border-stone-200 bg-stone-0 p-8"
              >
                <p className="font-display text-xl font-semibold text-ink-700">{e.name}</p>
                <p className="mt-3 text-sm text-stone-500">
                  {e.delegates} delegates · {e.city}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Designed for */}
      <section className="border-y border-stone-200 bg-stone-0 py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center font-display text-3xl font-semibold text-ink-700 md:text-4xl">
            Designed for
          </h2>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-8 md:gap-12">
            {audiences.map((a) => (
              <div key={a.label} className="flex items-center gap-2.5">
                <a.icon className="h-5 w-5 text-ink-600" />
                <span className="text-sm font-medium text-ink-700">{a.label}</span>
              </div>
            ))}
          </div>
          <div className="mx-auto mt-16 max-w-2xl rounded-md border border-stone-200 bg-stone-50 p-8 md:p-10">
            <p className="text-lg leading-relaxed italic text-ink-700">
              &ldquo;We moved from spreadsheets and manual emails to a single platform. Registration day went from chaos to twenty minutes.&rdquo;
            </p>
            <p className="mt-6 text-sm font-medium text-stone-500">
              — Summit Director, Africa Summit Group
            </p>
          </div>
        </div>
      </section>

      {/* Security & Trust */}
      <section className="bg-stone-50 py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center font-display text-3xl font-semibold text-ink-700 md:text-4xl">
            Enterprise-grade security
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-base text-stone-500">
            Built from day one with multi-tenant isolation and defence-in-depth.
          </p>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {trustItems.map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-4 rounded-md border border-stone-200 bg-stone-0 p-6"
              >
                <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-ink-600" />
                <p className="text-base font-medium text-ink-700">{item.title}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Early Access CTA */}
      <section className="border-t border-stone-200 bg-stone-0 py-20 md:py-28">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bronze-600">
            Early access
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold text-ink-700 md:text-4xl">
            Join the first wave of summit organisers using AI-powered delegate intelligence.
          </h2>
          <div className="mt-10">
            <Link
              href="/sign-up"
              className="inline-flex h-12 items-center rounded-sm bg-ink-700 px-8 text-sm font-semibold text-white transition-colors hover:bg-ink-800"
            >
              Start free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
          <p className="mt-5 text-sm text-stone-500">
            No credit card required · Set up in minutes
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-stone-0 py-16">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="inline-flex items-center gap-2.5">
              <img
                src="/brand/logo-192.png"
                alt=""
                width={28}
                height={28}
                className="rounded-sm"
              />
              <p className="font-display text-lg font-semibold text-ink-700">Bizcon</p>
            </div>
            <p className="mt-3 text-sm text-stone-500">
              Event Intelligence for professional summits.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-ink-700">Product</p>
            <ul className="mt-4 space-y-2.5 text-sm text-stone-500">
              <li>Guest Management</li>
              <li>Registration</li>
              <li>AI Matchmaking</li>
              <li>Meetings</li>
              <li>Check-in</li>
              <li>Analytics</li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-ink-700">Company</p>
            <ul className="mt-4 space-y-2.5 text-sm text-stone-500">
              <li>
                <Link href="/contact" className="hover:text-ink-700">
                  Contact
                </Link>
              </li>
              <li>
                <a href="mailto:hello@bizconrsvp.com" className="hover:text-ink-700">
                  hello@bizconrsvp.com
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-ink-700">Legal</p>
            <ul className="mt-4 space-y-2.5 text-sm text-stone-500">
              <li>
                <Link href="/privacystatment" className="hover:text-ink-700">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/termsofservice" className="hover:text-ink-700">
                  Terms
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mx-auto mt-14 max-w-6xl border-t border-stone-200 px-6 pt-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-stone-500">© 2026 Bizcon RSVP</p>
            <p className="text-sm text-stone-500">Event Intelligence for professional summits.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard() {
  return (
    <div className="rounded-md border border-stone-200 bg-stone-0 p-6 md:p-8">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-bronze-600">Guest List</p>
        <span className="font-mono text-xs text-stone-500">247 invited</span>
      </div>
      <div className="mt-5 space-y-3">
        {[
          { line: "Sarah Mitchell — Mining · Invited", status: "pending" as const },
          { line: "James Okafor — Energy · Registered", status: "neutral" as const },
          { line: "Amara Diop — Finance · Confirmed", status: "success" as const },
        ].map(({ line, status }) => (
          <div
            key={line}
            className="flex items-center gap-3 rounded-sm border border-stone-200 bg-stone-50 px-4 py-3"
          >
            <div className="h-8 w-8 rounded-full bg-stone-200" />
            <span className="flex-1 text-sm text-stone-700">{line.split(" · ")[0]}</span>
            <StatusTag label={line.split(" · ")[1] ?? ""} variant={status} />
          </div>
        ))}
      </div>
    </div>
  );
}

function FeatureCardNetwork() {
  return (
    <div className="rounded-md border border-stone-200 bg-stone-0 p-6 md:p-8">
      <p className="text-xs font-semibold uppercase tracking-wider text-bronze-600">Match Score</p>
      <div className="mt-5 space-y-4">
        {[
          { names: "Mitchell ↔ Okafor", score: "94%", reason: "Mining × Energy synergy" },
          { names: "Diop ↔ van der Berg", score: "87%", reason: "Infrastructure investment" },
          { names: "Nakamura ↔ Silva", score: "82%", reason: "Renewable energy policy" },
        ].map((m) => (
          <div
            key={m.names}
            className="rounded-sm border border-stone-200 bg-stone-50 px-4 py-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-ink-700">{m.names}</span>
              <span className="font-mono text-sm font-semibold text-ink-700">{m.score}</span>
            </div>
            <p className="mt-1 text-xs text-stone-500">{m.reason}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeatureCardOps() {
  return (
    <div className="rounded-md border border-stone-200 bg-stone-0 p-6 md:p-8">
      <p className="text-xs font-semibold uppercase tracking-wider text-bronze-600">Event Day</p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        {[
          { label: "Checked in", value: "1,247", highlight: true },
          { label: "Pending", value: "342", highlight: false },
          { label: "Sessions live", value: "8", highlight: false },
          { label: "Meetings", value: "156", highlight: false },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-sm border border-stone-200 bg-stone-50 px-4 py-3 text-center"
          >
            <p className={`text-lg font-semibold ${s.highlight ? "text-moss-600" : "text-ink-700"}`}>
              {s.value}
            </p>
            <p className="mt-0.5 text-xs text-stone-500">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 h-2 overflow-hidden rounded-sm bg-stone-200">
        <div className="h-full w-[78%] rounded-sm bg-moss-500" />
      </div>
      <p className="mt-2 text-xs text-stone-500">78% attendance rate</p>
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
    success: "border-l-moss-500 bg-moss-100 text-moss-600",
    pending: "border-l-bronze-500 bg-bronze-100 text-bronze-600",
    neutral: "border-l-stone-400 bg-stone-100 text-stone-600",
  };

  return (
    <span
      className={`rounded-xs border-l-[3px] px-2 py-0.5 text-xs font-medium ${styles[variant]}`}
    >
      {label}
    </span>
  );
}
