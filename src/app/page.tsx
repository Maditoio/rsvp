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
  Menu,
  X,
  ArrowRight,
  Mic2,
  Landmark,
  TrendingUp,
  Building2,
  Handshake,
} from "lucide-react";
import { StickyNav } from "@/components/landing/sticky-nav";
import { MobileMenu } from "@/components/landing/mobile-menu";

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
  "CSV import + manual entry",
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
    <div className="min-h-screen bg-white font-sans">
      {/* Navigation */}
      <StickyNav />

      {/* Hero */}
      <section
        className="relative overflow-hidden pt-24"
        style={{ background: "linear-gradient(180deg, #1B1815 0%, #2D2520 100%)" }}
      >
        <div className="mx-auto max-w-6xl px-6 pb-20 pt-16 md:pb-28 md:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <p
              className="text-xs font-semibold uppercase tracking-[0.2em]"
              style={{ color: "#C9A06C" }}
            >
              Event Intelligence Platform
            </p>
            <h1 className="mt-6 font-display text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-7xl lg:leading-[1.1]">
              Run professional summits that attendees actually remember.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed" style={{ color: "#D5CEC4" }}>
              From curated invitations to AI-powered networking — manage
              10,000-person events without the spreadsheet chaos.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/sign-up"
                className="inline-flex h-12 items-center rounded-sm px-8 text-sm font-semibold text-white transition-colors"
                style={{ background: "#B8864E" }}
              >
                Start free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex h-12 items-center rounded-sm border border-white/30 px-8 text-sm font-semibold text-white transition-colors hover:border-white/60"
              >
                Book a demo
              </Link>
            </div>
            <div className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm" style={{ color: "#A09588" }}>
              <span>12,000+ delegates managed</span>
              <span className="hidden sm:inline" style={{ color: "#5A524A" }}>·</span>
              <span>3 international summits</span>
              <span className="hidden sm:inline" style={{ color: "#5A524A" }}>·</span>
              <span>40+ countries</span>
            </div>
          </div>
        </div>
        {/* Subtle gradient fade at the bottom */}
        <div className="absolute inset-x-0 bottom-0 h-24" style={{ background: "linear-gradient(to bottom, transparent, #FAF7F2)" }} />
      </section>

      {/* Journey Visual */}
      <section style={{ background: "#FAF7F2" }} className="py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center font-display text-3xl font-semibold md:text-4xl" style={{ color: "#3D3630" }}>
            The complete delegate journey
          </h2>
          {/* Desktop: horizontal */}
          <div className="relative mt-16 hidden md:block">
            <div className="absolute left-[calc(100%/14)] right-[calc(100%/14)] top-6 h-0.5" style={{ background: "linear-gradient(90deg, #E8E0D6, #C9A06C, #E8E0D6)" }} />
            <div className="grid grid-cols-7 gap-4">
              {journeySteps.map((step) => (
                <div key={step.label} className="flex flex-col items-center text-center">
                  <div
                    className="relative z-10 flex h-12 w-12 items-center justify-center rounded-md border"
                    style={{ background: "#FFFFFF", borderColor: "#E8E0D6" }}
                  >
                    <step.icon className="h-5 w-5" style={{ color: "#B8864E" }} />
                  </div>
                  <p className="mt-3 text-sm font-medium" style={{ color: "#3D3630" }}>
                    {step.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
          {/* Mobile: vertical */}
          <div className="mt-12 space-y-0 md:hidden">
            {journeySteps.map((step, i) => (
              <div key={step.label} className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-md border"
                    style={{ background: "#FFFFFF", borderColor: "#E8E0D6" }}
                  >
                    <step.icon className="h-4 w-4" style={{ color: "#B8864E" }} />
                  </div>
                  {i < journeySteps.length - 1 && (
                    <div className="h-8 w-0.5" style={{ background: "#E8E0D6" }} />
                  )}
                </div>
                <p className="mt-2 text-sm font-medium" style={{ color: "#3D3630" }}>
                  {step.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pillar 1 */}
      <section className="bg-white py-20 md:py-28">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 md:grid-cols-2 md:gap-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "#C9A06C" }}>
              Curated Guest Management
            </p>
            <h3 className="mt-3 font-display text-3xl font-semibold leading-snug md:text-4xl" style={{ color: "#3D3630" }}>
              Invite the right people. Register them seamlessly.
            </h3>
            <ul className="mt-6 space-y-3">
              {pillar1Bullets.map((b) => (
                <li key={b} className="flex items-start gap-3 text-base" style={{ color: "#5A524A" }}>
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "#C9A06C" }} />
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <FeatureCard />
        </div>
      </section>

      {/* Pillar 2 */}
      <section style={{ background: "#FAF7F2" }} className="py-20 md:py-28">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 md:grid-cols-2 md:gap-16">
          <div className="order-2 md:order-1">
            <FeatureCardNetwork />
          </div>
          <div className="order-1 md:order-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "#C9A06C" }}>
              AI-Powered Networking
            </p>
            <h3 className="mt-3 font-display text-3xl font-semibold leading-snug md:text-4xl" style={{ color: "#3D3630" }}>
              Connect attendees who should actually meet.
            </h3>
            <ul className="mt-6 space-y-3">
              {pillar2Bullets.map((b) => (
                <li key={b} className="flex items-start gap-3 text-base" style={{ color: "#5A524A" }}>
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "#C9A06C" }} />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Pillar 3 */}
      <section className="bg-white py-20 md:py-28">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 md:grid-cols-2 md:gap-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "#C9A06C" }}>
              Event-Day Operations
            </p>
            <h3 className="mt-3 font-display text-3xl font-semibold leading-snug md:text-4xl" style={{ color: "#3D3630" }}>
              From registration to check-in, zero gaps.
            </h3>
            <ul className="mt-6 space-y-3">
              {pillar3Bullets.map((b) => (
                <li key={b} className="flex items-start gap-3 text-base" style={{ color: "#5A524A" }}>
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "#C9A06C" }} />
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <FeatureCardOps />
        </div>
      </section>

      {/* Built for events like these */}
      <section className="py-20 md:py-28" style={{ background: "#1B1815" }}>
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center font-display text-3xl font-semibold text-white md:text-4xl">
            Built for events like these
          </h2>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {events.map((e) => (
              <div
                key={e.name}
                className="rounded-md border p-8"
                style={{ borderColor: "#3D3630", background: "#211E1A" }}
              >
                <p className="font-display text-xl font-semibold text-white">{e.name}</p>
                <p className="mt-3 text-sm" style={{ color: "#A09588" }}>
                  {e.delegates} delegates · {e.city}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Designed for */}
      <section style={{ background: "#FAF7F2" }} className="py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center font-display text-3xl font-semibold md:text-4xl" style={{ color: "#3D3630" }}>
            Designed for
          </h2>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-8 md:gap-12">
            {audiences.map((a) => (
              <div key={a.label} className="flex items-center gap-2.5">
                <a.icon className="h-5 w-5" style={{ color: "#B8864E" }} />
                <span className="text-sm font-medium" style={{ color: "#3D3630" }}>{a.label}</span>
              </div>
            ))}
          </div>
          <div
            className="mx-auto mt-16 max-w-2xl rounded-md border p-8 md:p-10"
            style={{ borderColor: "#E8E0D6", background: "#FFFFFF" }}
          >
            <p className="text-lg leading-relaxed italic" style={{ color: "#3D3630" }}>
              &ldquo;We moved from spreadsheets and manual emails to a single platform. Registration day went from chaos to twenty minutes.&rdquo;
            </p>
            <p className="mt-6 text-sm font-medium" style={{ color: "#7A7067" }}>
              — Summit Director, Africa Summit Group
            </p>
          </div>
        </div>
      </section>

      {/* Security & Trust */}
      <section className="bg-white py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center font-display text-3xl font-semibold md:text-4xl" style={{ color: "#3D3630" }}>
            Enterprise-grade security
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-base" style={{ color: "#7A7067" }}>
            Built from day one with multi-tenant isolation and defence-in-depth.
          </p>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {trustItems.map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-4 rounded-md border p-6"
                style={{ borderColor: "#E8E0D6" }}
              >
                <item.icon className="mt-0.5 h-5 w-5 shrink-0" style={{ color: "#B8864E" }} />
                <p className="text-base font-medium" style={{ color: "#3D3630" }}>{item.title}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Early Access CTA */}
      <section
        className="py-20 md:py-28"
        style={{ background: "linear-gradient(135deg, #B8864E 0%, #8A6A20 50%, #6B5218 100%)" }}
      >
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-display text-3xl font-semibold text-white md:text-4xl">
            Join the first wave of summit organisers using AI-powered delegate intelligence.
          </h2>
          <div className="mt-10">
            <Link
              href="/sign-up"
              className="inline-flex h-12 items-center rounded-sm bg-white px-8 text-sm font-semibold transition-colors"
              style={{ color: "#3D3630" }}
            >
              Start free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
          <p className="mt-5 text-sm text-white/70">
            No credit card required · Set up in minutes
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: "#1B1815" }} className="py-16">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-sm font-semibold text-white">Product</p>
            <ul className="mt-4 space-y-2.5 text-sm" style={{ color: "#A09588" }}>
              <li>Guest Management</li>
              <li>Registration</li>
              <li>AI Matchmaking</li>
              <li>Meetings</li>
              <li>Check-in</li>
              <li>Analytics</li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Company</p>
            <ul className="mt-4 space-y-2.5 text-sm" style={{ color: "#A09588" }}>
              <li>About</li>
              <li>Contact</li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Legal</p>
            <ul className="mt-4 space-y-2.5 text-sm" style={{ color: "#A09588" }}>
              <li>Privacy</li>
              <li>Terms</li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Connect</p>
            <ul className="mt-4 space-y-2.5 text-sm" style={{ color: "#A09588" }}>
              <li>hello@bizcon.events</li>
            </ul>
          </div>
        </div>
        <div className="mx-auto mt-14 max-w-6xl border-t px-6 pt-8" style={{ borderColor: "#3D3630" }}>
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm" style={{ color: "#7A7067" }}>© 2026 Bizcon RSVP</p>
            <p className="text-sm" style={{ color: "#7A7067" }}>Event Intelligence for professional summits.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* Mock feature cards — stylised dark cards suggesting dashboard UI */

function FeatureCard() {
  return (
    <div className="rounded-md p-6 md:p-8" style={{ background: "#1B1815" }}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#C9A06C" }}>Guest List</p>
        <span className="text-xs" style={{ color: "#7A7067" }}>247 invited</span>
      </div>
      <div className="mt-5 space-y-3">
        {["Sarah Mitchell — Mining · Invited", "James Okafor — Energy · Registered", "Amara Diop — Finance · Confirmed"].map((line) => (
          <div key={line} className="flex items-center gap-3 rounded-sm border px-4 py-3" style={{ borderColor: "#3D3630", background: "#211E1A" }}>
            <div className="h-8 w-8 rounded-full" style={{ background: "#3D3630" }} />
            <span className="text-sm" style={{ color: "#D5CEC4" }}>{line}</span>
          </div>
        ))}
      </div>
      <div className="mt-5 flex gap-2">
        {["Invited", "Registered", "Confirmed"].map((s) => (
          <span key={s} className="rounded-sm px-2.5 py-1 text-xs font-medium" style={{ background: "#2D2520", color: "#C9A06C" }}>{s}</span>
        ))}
      </div>
    </div>
  );
}

function FeatureCardNetwork() {
  return (
    <div className="rounded-md p-6 md:p-8" style={{ background: "#1B1815" }}>
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#C9A06C" }}>Match Score</p>
      <div className="mt-5 space-y-4">
        {[
          { names: "Mitchell ↔ Okafor", score: "94%", reason: "Mining × Energy synergy" },
          { names: "Diop ↔ van der Berg", score: "87%", reason: "Infrastructure investment" },
          { names: "Nakamura ↔ Silva", score: "82%", reason: "Renewable energy policy" },
        ].map((m) => (
          <div key={m.names} className="rounded-sm border px-4 py-3" style={{ borderColor: "#3D3630", background: "#211E1A" }}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium" style={{ color: "#D5CEC4" }}>{m.names}</span>
              <span className="text-sm font-semibold" style={{ color: "#C9A06C" }}>{m.score}</span>
            </div>
            <p className="mt-1 text-xs" style={{ color: "#7A7067" }}>{m.reason}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeatureCardOps() {
  return (
    <div className="rounded-md p-6 md:p-8" style={{ background: "#1B1815" }}>
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#C9A06C" }}>Event Day</p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        {[
          { label: "Checked in", value: "1,247" },
          { label: "Pending", value: "342" },
          { label: "Sessions live", value: "8" },
          { label: "Meetings", value: "156" },
        ].map((s) => (
          <div key={s.label} className="rounded-sm border px-4 py-3 text-center" style={{ borderColor: "#3D3630", background: "#211E1A" }}>
            <p className="text-lg font-semibold" style={{ color: "#D5CEC4" }}>{s.value}</p>
            <p className="mt-0.5 text-xs" style={{ color: "#7A7067" }}>{s.label}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 h-2 overflow-hidden rounded-full" style={{ background: "#3D3630" }}>
        <div className="h-full rounded-full" style={{ width: "78%", background: "linear-gradient(90deg, #B8864E, #C9A06C)" }} />
      </div>
      <p className="mt-2 text-xs" style={{ color: "#7A7067" }}>78% attendance rate</p>
    </div>
  );
}
