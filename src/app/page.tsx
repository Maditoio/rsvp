import Link from "next/link";
import { hasClerk } from "@/lib/utils";

export default function HomePage() {
  const signedInHref = hasClerk() ? "/app" : "/app";
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="font-display text-2xl text-ink-800">Bizcon RSVP</span>
        <div className="flex gap-3">
          <Link
            href="/sign-in"
            className="rounded-sm bg-white border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="rounded-sm bg-ink-600 px-4 py-2 text-sm font-medium text-white"
          >
            Start organising
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-20 pt-10">
        <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-xs tracking-[0.22em] text-gray-500">
              Event Intelligence for professional summits.
            </p>
            <h1 className="mt-4 max-w-xl font-display text-5xl leading-tight text-gray-800">
              Invitation to check-in, without treating RSVP as the product.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-gray-700">
              Bizcon RSVP is a secure event intelligence platform: curated
              invitations, controlled registration, attendee profiles, and
              event-day operations for 5,000–10,000 person summits.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={signedInHref}
                className="rounded-sm bg-ink-600 px-5 py-3 text-sm font-medium text-white"
              >
                Open organiser console
              </Link>
              <Link
                href="/me"
                className="rounded-sm bg-white border border-gray-300 px-5 py-3 text-sm font-medium text-gray-800"
              >
                Attendee portal
              </Link>
            </div>
          </div>
          <div className="rounded-3xl bg-ink-600 p-8 text-white">
            <p className="text-xs uppercase tracking-[0.2em] text-bloom-200">
              The journey
            </p>
            <ol className="mt-6 space-y-3 text-sm text-ink-100">
              {[
                "Known contact",
                "Invitation sent",
                "Accept or decline",
                "Registration completed",
                "QR issued",
                "Checked in",
              ].map((step) => (
                <li key={step} className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-bloom-300" />
                  {step}
                </li>
              ))}
            </ol>
            <p className="mt-8 text-sm text-ink-200">
              Invitation is never the same as registration. The backend is the
              security boundary.
            </p>
          </div>
        </section>

        <section className="mt-16 grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Curated invitations",
              body: "Hashed unique links, categories, and a true RSVP state machine.",
            },
            {
              title: "Tenant isolation",
              body: "Every query is scoped to the organisation derived from the session.",
            },
            {
              title: "Event-day check-in",
              body: "Opaque QR tokens, limited staff views, no duplicate check-ins.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl bg-white p-6">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-bloom-200">
                <span className="h-2 w-2 rounded-full bg-bloom-600" />
              </div>
              <h2 className="text-lg font-medium text-gray-800">{item.title}</h2>
              <p className="mt-2 text-sm text-gray-600">{item.body}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
